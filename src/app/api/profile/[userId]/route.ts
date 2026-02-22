import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/Auth";
import { decryptData, encryptData } from "@/lib/encryption";
import { prisma } from "@/lib/prisma";

// ── helpers ──────────────────────────────────────────────────────────────────

const EMAIL_REGEX    = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX    = /^[0-9+\-\s()]{7,20}$/;
const USERNAME_REGEX = /^[a-zA-Z0-9_.-]{3,50}$/;

// A08 — domain whitelist สำหรับ profile photo (ปรับตาม storage provider)
const ALLOWED_PHOTO_HOSTS = (process.env.ALLOWED_PHOTO_HOSTS ?? '')
    .split(',')
    .map((h) => h.trim())
    .filter(Boolean);

/**
 * A03 — validate และ sanitize string ทั่วไป
 */
function validateString(value: unknown, fieldName: string, maxLength = 255): string {
    if (typeof value !== 'string' || value.trim() === '') {
        throw new Error(`${fieldName} ต้องไม่ว่างเปล่า`);
    }
    if (value.length > maxLength) {
        throw new Error(`${fieldName} ยาวเกิน ${maxLength} ตัวอักษร`);
    }
    return value.trim();
}

/**
 * A08 — ตรวจสอบ profile_photo_url ต้องเป็น https จาก domain ที่อนุญาต
 */
function validatePhotoUrl(url: unknown): string | null {
    if (!url) return null;
    if (typeof url !== 'string') throw new Error('profile_photo_url ไม่ถูกต้อง');

    let parsed: URL;
    try {
        parsed = new URL(url);
    } catch {
        throw new Error('profile_photo_url รูปแบบไม่ถูกต้อง');
    }

    if (parsed.protocol !== 'https:') {
        throw new Error('profile_photo_url ต้องเป็น HTTPS');
    }

    if (ALLOWED_PHOTO_HOSTS.length > 0 && !ALLOWED_PHOTO_HOSTS.includes(parsed.hostname)) {
        throw new Error('profile_photo_url ไม่ได้รับอนุญาต');
    }

    return url;
}

/**
 * ถอดรหัส encryptedUserId และคืน userId string
 */
function resolveUserId(encryptedUserId: string): string {
    return decryptData(decodeURIComponent(encryptedUserId));
}

// ── GET — ดึงข้อมูลโปรไฟล์ ──────────────────────────────────────────────────

export async function GET(
    req: Request,
    context: { params: Promise<{ userId: string }> }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json(
                { success: false, error: "ไม่ได้รับอนุญาต" },
                { status: 401 }
            );
        }

        const { userId: encryptedUserId } = await context.params;

        // ถอดรหัส userId
        let userId: string;
        try {
            userId = resolveUserId(encryptedUserId);
        } catch {
            return NextResponse.json(
                { success: false, error: "ข้อมูล userId ไม่ถูกต้อง" },
                { status: 400 }
            );
        }

        // A01 — ตรวจสอบ ownership
        if (session.user.id !== userId) {
            return NextResponse.json(
                { success: false, error: "ไม่ได้รับอนุญาต" },
                { status: 403 }
            );
        }

        const user = await prisma.users.findUnique({
            where: { user_id: BigInt(userId) },
            select: {
                user_id:           true,
                role:              true,
                username:          true,
                email:             true,
                phone:             true,
                title_th:          true,
                title_en:          true,
                first_name:        true,
                last_name:         true,
                student_id:        true,
                staff_id:          true,
                profile_photo_url: true,
                status:            true,
                membership:        true,
                registered_at:     true,
                last_login_at:     true,
            },
        });

        if (!user) {
            return NextResponse.json(
                { success: false, error: "ไม่พบผู้ใช้" },
                { status: 404 }
            );
        }

        const userData = {
            ...user,
            user_id:       encryptData(user.user_id.toString()),
            role:          encryptData(user.role),
            registered_at: user.registered_at.toISOString(),
            last_login_at: user.last_login_at?.toISOString() ?? null,
        };

        return NextResponse.json({ success: true, user: userData });

    } catch (error) {
        // A09 — log เฉพาะ message ไม่ expose stack trace ออก response
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[GET /profile][${new Date().toISOString()}]`, message);
        return NextResponse.json(
            { success: false, error: "เกิดข้อผิดพลาดในการดึงข้อมูล" },
            { status: 500 }
        );
    }
}

// ── PUT — อัปเดตข้อมูลโปรไฟล์ ───────────────────────────────────────────────

export async function PUT(
    req: Request,
    context: { params: Promise<{ userId: string }> }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json(
                { success: false, error: "ไม่ได้รับอนุญาต" },
                { status: 401 }
            );
        }

        const { userId: encryptedUserId } = await context.params;

        // ถอดรหัส userId
        let userId: string;
        try {
            userId = resolveUserId(encryptedUserId);
        } catch {
            return NextResponse.json(
                { success: false, error: "ข้อมูล userId ไม่ถูกต้อง" },
                { status: 400 }
            );
        }

        // A01 — ตรวจสอบ ownership
        if (session.user.id !== userId) {
            return NextResponse.json(
                { success: false, error: "ไม่ได้รับอนุญาต" },
                { status: 403 }
            );
        }

        const body = await req.json();
        const { username, email, phone, title_th, title_en, first_name, last_name, profile_photo_url } = body;

        // A03 — Validate required fields
        if (!username || !email || !first_name || !last_name) {
            return NextResponse.json(
                { success: false, error: "ข้อมูลไม่ครบถ้วน" },
                { status: 400 }
            );
        }

        // A03 — Validate format ทุก field
        let validationError: string | null = null;
        try {
            const safeUsername  = validateString(username, 'username', 50);
            const safeEmail     = validateString(email, 'email', 255);
            const safeFirstName = validateString(first_name, 'first_name', 100);
            const safeLastName  = validateString(last_name, 'last_name', 100);

            if (!USERNAME_REGEX.test(safeUsername)) {
                validationError = 'ชื่อผู้ใช้ต้องเป็นภาษาอังกฤษ ตัวเลข หรือ _ . - ความยาว 3-50 ตัวอักษร';
            } else if (!EMAIL_REGEX.test(safeEmail)) {
                validationError = 'รูปแบบอีเมลไม่ถูกต้อง';
            } else if (phone && !PHONE_REGEX.test(phone)) {
                validationError = 'รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง';
            }

            if (validationError) {
                return NextResponse.json(
                    { success: false, error: validationError },
                    { status: 400 }
                );
            }

            // A08 — validate photo URL
            const safePhotoUrl = validatePhotoUrl(profile_photo_url);

            // A04 — ใช้ transaction ป้องกัน race condition duplicate check + update
            const updatedUser = await prisma.$transaction(async (tx) => {
                // ตรวจสอบ username / email ซ้ำภายใน transaction เดียวกัน
                const existingUser = await tx.users.findFirst({
                    where: {
                        AND: [
                            { user_id: { not: BigInt(userId) } },
                            { OR: [{ username: safeUsername }, { email: safeEmail }] },
                        ],
                    },
                    select: { username: true, email: true },
                });

                if (existingUser) {
                    const field = existingUser.username === safeUsername ? 'ชื่อผู้ใช้' : 'อีเมล';
                    throw new Error(`DUPLICATE:ข้อมูลซ้ำในระบบ: ${field}`);
                }

                return tx.users.update({
                    where: { user_id: BigInt(userId) },
                    data: {
                        username:          safeUsername,
                        email:             safeEmail,
                        phone:             phone?.trim() || null,
                        title_th:          title_th?.trim() || null,
                        title_en:          title_en?.trim() || null,
                        first_name:        safeFirstName,
                        last_name:         safeLastName,
                        profile_photo_url: safePhotoUrl,
                    },
                    select: {
                        user_id:           true,
                        role:              true,
                        username:          true,
                        email:             true,
                        phone:             true,
                        title_th:          true,
                        title_en:          true,
                        first_name:        true,
                        last_name:         true,
                        student_id:        true,
                        staff_id:          true,
                        profile_photo_url: true,
                        status:            true,
                        membership:        true,
                        registered_at:     true,
                        last_login_at:     true,
                    },
                });
            });

            const userData = {
                ...updatedUser,
                user_id:       encryptData(updatedUser.user_id.toString()),
                role:          encryptData(updatedUser.role),
                registered_at: updatedUser.registered_at.toISOString(),
                last_login_at: updatedUser.last_login_at?.toISOString() ?? null,
            };

            return NextResponse.json({
                success: true,
                message: "อัปเดตโปรไฟล์สำเร็จ",
                user:    userData,
            });

        } catch (error) {
            // ดักจับ DUPLICATE error จาก transaction
            if (error instanceof Error && error.message.startsWith('DUPLICATE:')) {
                return NextResponse.json(
                    { success: false, error: error.message.replace('DUPLICATE:', '') },
                    { status: 400 }
                );
            }
            // validation error จาก validatePhotoUrl / validateString
            if (error instanceof Error && !error.message.includes('prisma')) {
                return NextResponse.json(
                    { success: false, error: error.message },
                    { status: 400 }
                );
            }
            throw error; // re-throw เพื่อให้ outer catch จัดการ
        }

    } catch (error) {
        // A09 — log เฉพาะ message ไม่ expose stack trace ออก response
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[PUT /profile][${new Date().toISOString()}]`, message);
        return NextResponse.json(
            { success: false, error: "เกิดข้อผิดพลาดในการอัปเดตข้อมูล" },
            { status: 500 }
        );
    }
}