import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/Auth';
import crypto from 'crypto';
import path from 'path';

// A03 — allowlist นามสกุลไฟล์ที่อนุญาต
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

function isValidImagePath(imagePath: string): boolean {
    // ป้องกัน path traversal
    const normalized = path.normalize(imagePath);
    if (normalized.includes('..')) return false;

    // ตรวจนามสกุลไฟล์
    const ext = path.extname(normalized).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) return false;

    // ตรวจความยาวสมเหตุสมผล
    if (imagePath.length > 512) return false;

    return true;
}

export async function POST(request: NextRequest) {
    try {
        // A01 — ตรวจสอบ session ก่อนทุกอย่าง
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json(
                { message: 'กรุณาเข้าสู่ระบบ' },
                { status: 401 }
            );
        }

        const { imagePath } = await request.json();

        if (!imagePath || typeof imagePath !== 'string') {
            return NextResponse.json(
                { message: 'ไม่พบ image path' },
                { status: 400 }
            );
        }

        // A03 — validate path ก่อน encrypt
        if (!isValidImagePath(imagePath)) {
            console.warn(`[POST /encrypt][${new Date().toISOString()}] Invalid imagePath from user ${session.user.id}: ${imagePath}`);
            return NextResponse.json(
                { message: 'image path ไม่ถูกต้อง' },
                { status: 400 }
            );
        }

        // A02 — ตรวจสอบ key ก่อนใช้งาน
        const encryptionKey = process.env.UPLOAD_ENCRYPTION_KEY;
        if (!encryptionKey || encryptionKey.length < 32) {
            console.error(`[POST /encrypt][${new Date().toISOString()}] UPLOAD_ENCRYPTION_KEY not configured`);
            return NextResponse.json(
                { message: 'Service misconfigured' },
                { status: 500 }
            );
        }

        // A02 — ใช้ scrypt แทน SHA-256 สำหรับ key derivation
        const salt = process.env.UPLOAD_ENCRYPTION_SALT ?? 'default-salt-change-me';
        const keyBuffer = crypto.scryptSync(encryptionKey, salt, 32);

        // A02 — ใช้ AES-256-GCM แทน CBC (authenticated encryption, ป้องกัน padding oracle)
        const iv = crypto.randomBytes(12); // GCM ใช้ 12 bytes
        const cipher = crypto.createCipheriv('aes-256-gcm', keyBuffer, iv);

        let encrypted = cipher.update(imagePath, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        // GCM auth tag — ป้องกัน tampering
        const authTag = cipher.getAuthTag().toString('hex');

        // format: iv:authTag:encryptedData
        const encryptedPath = `${iv.toString('hex')}:${authTag}:${encrypted}`;

        return NextResponse.json({
            encryptedPath,
            message: 'เข้ารหัสสำเร็จ',
        });

    } catch (error) {
        // A09 — log จริงๆ ไม่ expose detail ออก response
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[POST /encrypt][${new Date().toISOString()}]`, message);
        return NextResponse.json(
            { message: 'เกิดข้อผิดพลาดในการเข้ารหัส' },
            { status: 500 }
        );
    }
}