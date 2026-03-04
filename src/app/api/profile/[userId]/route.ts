import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/Auth";
import { encryptData } from "@/lib/encryption";
import { decode } from '@/lib/Cryto';
import { prisma } from "@/lib/prisma";
import crypto from 'crypto';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[0-9+\-\s()]{7,20}$/;
const USERNAME_REGEX = /^[a-zA-Z0-9_.-]{3,50}$/;

// 3 parts — encrypted ด้วย UPLOAD_ENCRYPTION_KEY (upload route)
const UPLOAD_ENCRYPTED_PATTERN = /^[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/i;
// 4 parts — encrypted ด้วย Cryto.ts (salt:iv:authTag:ciphertext)
const CRYPTO_ENCRYPTED_PATTERN = /^[0-9a-f]+:[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/i;

const ALLOWED_PHOTO_HOSTS = (process.env.ALLOWED_PHOTO_HOSTS ?? '')
    .split(',')
    .map((h) => h.trim())
    .filter(Boolean);

const STORAGE_BASE_URL = (process.env.STORAGE_BASE_URL ?? '').replace(/\/$/, '');

// ── Helpers ───────────────────────────────────────────────────────────────────

function validateString(value: unknown, fieldName: string, maxLength = 255, allowEmpty = false): string {
    if (typeof value !== 'string') {
        throw new Error(`${fieldName} ต้องเป็นข้อความ`);
    }
    const trimmed = value.trim();
    if (!allowEmpty && trimmed === '') {
        throw new Error(`${fieldName} ต้องไม่ว่างเปล่า`);
    }
    if (trimmed.length > maxLength) {
        throw new Error(`${fieldName} ยาวเกิน ${maxLength} ตัวอักษร`);
    }
    return trimmed;
}

/**
 * decrypt imagePath ที่ encrypt ด้วย UPLOAD_ENCRYPTION_KEY (upload route)
 * format: iv:authTag:encrypted
 */
function decryptUploadPath(encrypted: string): string | null {
    try {
        const encryptionKey = process.env.UPLOAD_ENCRYPTION_KEY;
        if (!encryptionKey) {
            console.error('[decryptUploadPath] UPLOAD_ENCRYPTION_KEY not set');
            return null;
        }

        const parts = encrypted.split(':');
        if (parts.length !== 3) return null;

        const [ivHex, authTagHex, encryptedHex] = parts;
        const keyHash = crypto.createHash('sha256').update(encryptionKey).digest();
        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(authTagHex, 'hex');
        const encryptedData = Buffer.from(encryptedHex, 'hex');

        const decipher = crypto.createDecipheriv('aes-256-gcm', keyHash, iv);
        decipher.setAuthTag(authTag);

        const decrypted = Buffer.concat([decipher.update(encryptedData), decipher.final()]);
        return decrypted.toString('utf8');
    } catch (e) {
        console.error('[decryptUploadPath] failed:', (e as Error).message);
        return null;
    }
}

function validatePhotoUrl(url: unknown): string | null {
    if (!url) return null;
    if (typeof url !== 'string') throw new Error('profile_photo_url ไม่ถูกต้อง');

    // Allow encrypted paths (both formats)
    if (UPLOAD_ENCRYPTED_PATTERN.test(url)) return url;
    if (CRYPTO_ENCRYPTED_PATTERN.test(url)) return url;

    // Allow relative paths
    if (url.startsWith('/')) return url;

    let parsed: URL;
    try {
        parsed = new URL(url);
    } catch {
        throw new Error('profile_photo_url รูปแบบไม่ถูกต้อง');
    }

    const isAllowedHost = ALLOWED_PHOTO_HOSTS.length > 0 && ALLOWED_PHOTO_HOSTS.includes(parsed.hostname);
    const isInternalHost = /^(localhost|127\.|192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.|158\.108\.)/.test(parsed.hostname);

    if (!isAllowedHost && !isInternalHost && parsed.protocol !== 'https:') {
        throw new Error('profile_photo_url ต้องเป็น HTTPS');
    }

    if (ALLOWED_PHOTO_HOSTS.length > 0 && !isAllowedHost && !isInternalHost) {
        throw new Error('profile_photo_url ไม่ได้รับอนุญาต');
    }

    return url;
}

/**
 * แปลง storedUrl ใน DB ให้เป็น full URL สำหรับ response
 */
async function resolvePhotoUrl(storedUrl: string | null): Promise<string | null> {
    if (!storedUrl) return null;

    // encrypted ด้วย UPLOAD_ENCRYPTION_KEY (3 parts) → decrypt แล้ว join base URL
    if (UPLOAD_ENCRYPTED_PATTERN.test(storedUrl)) {
        const decrypted = decryptUploadPath(storedUrl);
        if (!decrypted) return null;
        // decrypted = /api/images/profiles/xxx.jpg
        return STORAGE_BASE_URL ? `${STORAGE_BASE_URL}${decrypted}` : decrypted;
    }

    // encrypted ด้วย Cryto.ts (4 parts) → decode
    if (CRYPTO_ENCRYPTED_PATTERN.test(storedUrl)) {
        try {
            return await decode(storedUrl);
        } catch {
            console.error('[resolvePhotoUrl] Cryto decode failed');
            return null;
        }
    }

    // relative path → join base URL
    if (storedUrl.startsWith('/')) {
        return STORAGE_BASE_URL ? `${STORAGE_BASE_URL}${storedUrl}` : storedUrl;
    }

    // full URL → คืนตามเดิม
    return storedUrl;
}

async function resolveUserId(encryptedUserId: string): Promise<string> {
    return await decode(decodeURIComponent(encryptedUserId));
}

async function resolveSessionUserId(sessionId: string): Promise<string> {
    return await decode(sessionId);
}

// ── GET ──────────────────────────────────────────────────────────────────────

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

        let userId: string;
        try {
            userId = await resolveUserId(encryptedUserId);
        } catch {
            return NextResponse.json(
                { success: false, error: "ข้อมูล userId ไม่ถูกต้อง" },
                { status: 400 }
            );
        }

        let sessionUserId: string;
        try {
            sessionUserId = await resolveSessionUserId(session.user.id);
        } catch {
            return NextResponse.json(
                { success: false, error: "Session ไม่ถูกต้อง" },
                { status: 401 }
            );
        }

        if (sessionUserId !== userId) {
            return NextResponse.json(
                { success: false, error: "ไม่ได้รับอนุญาต" },
                { status: 403 }
            );
        }

        const user = await prisma.users.findUnique({
            where: { user_id: BigInt(userId) },
            select: {
                user_id: true,
                role: true,
                username: true,
                email: true,
                phone: true,
                title_th: true,
                title_en: true,
                first_name: true,
                last_name: true,
                student_id: true,
                staff_id: true,
                profile_photo_url: true,
                status: true,
                membership: true,
                registered_at: true,
                last_login_at: true,
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
            user_id: encryptData(user.user_id.toString()),
            role: encryptData(user.role),
            profile_photo_url: await resolvePhotoUrl(user.profile_photo_url),
            registered_at: user.registered_at.toISOString(),
            last_login_at: user.last_login_at?.toISOString() ?? null,
        };

        return NextResponse.json({ success: true, user: userData });

    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[GET /profile][${new Date().toISOString()}]`, message);
        return NextResponse.json(
            { success: false, error: "เกิดข้อผิดพลาดในการดึงข้อมูล" },
            { status: 500 }
        );
    }
}

// ── PUT ──────────────────────────────────────────────────────────────────────

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

        let userId: string;
        try {
            userId = await resolveUserId(encryptedUserId);
        } catch {
            return NextResponse.json(
                { success: false, error: "ข้อมูล userId ไม่ถูกต้อง" },
                { status: 400 }
            );
        }

        let sessionUserId: string;
        try {
            sessionUserId = await resolveSessionUserId(session.user.id);
        } catch {
            return NextResponse.json(
                { success: false, error: "Session ไม่ถูกต้อง" },
                { status: 401 }
            );
        }

        if (sessionUserId !== userId) {
            return NextResponse.json(
                { success: false, error: "ไม่ได้รับอนุญาต" },
                { status: 403 }
            );
        }

        const body = await req.json();
        const { username, email, phone, title_th, title_en, first_name, last_name, profile_photo_url } = body;

        if (username === undefined || email === undefined || first_name === undefined || last_name === undefined) {
            return NextResponse.json(
                { success: false, error: "ข้อมูลไม่ครบถ้วน" },
                { status: 400 }
            );
        }

        try {
            const safeUsername = validateString(username, 'username', 50);
            const safeEmail = validateString(email, 'email', 255);
            const safeFirstName = validateString(first_name, 'first_name', 100);
            const safeLastName = validateString(last_name, 'last_name', 100, true);

            if (!USERNAME_REGEX.test(safeUsername)) {
                return NextResponse.json(
                    { success: false, error: 'ชื่อผู้ใช้ต้องเป็นภาษาอังกฤษ ตัวเลข หรือ _ . - ความยาว 3-50 ตัวอักษร' },
                    { status: 400 }
                );
            }

            if (!EMAIL_REGEX.test(safeEmail)) {
                return NextResponse.json(
                    { success: false, error: 'รูปแบบอีเมลไม่ถูกต้อง' },
                    { status: 400 }
                );
            }

            if (phone && !PHONE_REGEX.test(phone)) {
                return NextResponse.json(
                    { success: false, error: 'รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง' },
                    { status: 400 }
                );
            }

            const safePhotoUrl = validatePhotoUrl(profile_photo_url);

            const updatedUser = await prisma.$transaction(async (tx) => {
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
                        username: safeUsername,
                        email: safeEmail,
                        phone: phone?.trim() || null,
                        title_th: title_th?.trim() || null,
                        title_en: title_en?.trim() || null,
                        first_name: safeFirstName,
                        last_name: safeLastName,
                        profile_photo_url: safePhotoUrl,
                    },
                    select: {
                        user_id: true,
                        role: true,
                        username: true,
                        email: true,
                        phone: true,
                        title_th: true,
                        title_en: true,
                        first_name: true,
                        last_name: true,
                        student_id: true,
                        staff_id: true,
                        profile_photo_url: true,
                        status: true,
                        membership: true,
                        registered_at: true,
                        last_login_at: true,
                    },
                });
            });

            const userData = {
                ...updatedUser,
                user_id: encryptData(updatedUser.user_id.toString()),
                role: encryptData(updatedUser.role),
                profile_photo_url: await resolvePhotoUrl(updatedUser.profile_photo_url),
                registered_at: updatedUser.registered_at.toISOString(),
                last_login_at: updatedUser.last_login_at?.toISOString() ?? null,
            };

            return NextResponse.json({
                success: true,
                message: "อัปเดตโปรไฟล์สำเร็จ",
                user: userData,
            });

        } catch (error) {
            if (error instanceof Error && error.message.startsWith('DUPLICATE:')) {
                return NextResponse.json(
                    { success: false, error: error.message.replace('DUPLICATE:', '') },
                    { status: 400 }
                );
            }
            if (error instanceof Error && !error.message.includes('prisma')) {
                return NextResponse.json(
                    { success: false, error: error.message },
                    { status: 400 }
                );
            }
        throw error;
        }

    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[PUT /profile][${new Date().toISOString()}]`, message);
        return NextResponse.json(
            { success: false, error: "เกิดข้อผิดพลาดในการอัปเดตข้อมูล" },
            { status: 500 }
        );
    }
}