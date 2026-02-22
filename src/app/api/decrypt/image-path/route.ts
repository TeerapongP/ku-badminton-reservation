import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/Auth';
import crypto from 'node:crypto';
import path from 'node:path';

// A05 — allowed base paths สำหรับ image files เท่านั้น
const ALLOWED_PATH_PREFIXES = ['/uploads/', '/images/'];

// A03 — ตรวจสอบ path ไม่ให้ traverse ออกนอก allowed directory
function isSafePath(decryptedPath: string): boolean {
    // ป้องกัน path traversal
    const normalized = path.normalize(decryptedPath);
    if (normalized.includes('..')) return false;

    // อนุญาตเฉพาะ path ที่กำหนดไว้
    return ALLOWED_PATH_PREFIXES.some(prefix => normalized.startsWith(prefix));
}

export async function POST(request: NextRequest) {
    try {
        // A01 — ต้อง login ก่อนเสมอ
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json(
                { message: 'กรุณาเข้าสู่ระบบ' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { encryptedPath } = body;

        if (!encryptedPath || typeof encryptedPath !== 'string') {
            return NextResponse.json(
                { message: 'ไม่พบข้อมูลที่เข้ารหัส' },
                { status: 400 }
            );
        }

        // A05 — ถ้าไม่มี key → ปฏิเสธทันที ไม่ fallback เป็น empty string
        const encryptionKey = process.env.UPLOAD_ENCRYPTION_KEY;
        if (!encryptionKey || encryptionKey.length < 32) {
            console.error(`[POST /decrypt-image][${new Date().toISOString()}] UPLOAD_ENCRYPTION_KEY not configured`);
            return NextResponse.json(
                { message: 'Service misconfigured' },
                { status: 500 }
            );
        }

        // Decrypt
        const algorithm = 'aes-256-cbc';
        const parts = encryptedPath.split(':');
        if (parts.length !== 2) {
            return NextResponse.json(
                { message: 'รูปแบบข้อมูลไม่ถูกต้อง' },
                { status: 400 }
            );
        }

        let decryptedPath: string;
        try {
            const iv = Buffer.from(parts[0], 'hex');
            const encryptedData = parts[1];

            // ตรวจสอบขนาด IV (ต้องเป็น 16 bytes สำหรับ AES-CBC)
            if (iv.length !== 16) {
                throw new Error('Invalid IV length');
            }

            const keyHash = crypto.createHash('sha256').update(encryptionKey).digest();
            const decipher = crypto.createDecipheriv(algorithm, keyHash, iv);
            decryptedPath = decipher.update(encryptedData, 'hex', 'utf8');
            decryptedPath += decipher.final('utf8');

        } catch (decryptError) {
            // A09 — log สาเหตุจริง แต่ไม่ส่งออก response
            const message = decryptError instanceof Error ? decryptError.message : 'Unknown';
            console.error(`[POST /decrypt-image][${new Date().toISOString()}] Decrypt failed: ${message}`);
            return NextResponse.json(
                { message: 'ไม่สามารถถอดรหัสข้อมูลได้' },
                { status: 400 }
            );
        }

        // A03 — validate path หลัง decrypt ก่อน return เสมอ
        if (!isSafePath(decryptedPath)) {
            console.warn(`[POST /decrypt-image][${new Date().toISOString()}] Path traversal attempt by user ${session.user.id}: ${decryptedPath}`);
            return NextResponse.json(
                { message: 'ไม่อนุญาตให้เข้าถึง path นี้' },
                { status: 403 }
            );
        }

        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
        return NextResponse.json({
            imagePath: `${baseUrl}/api${decryptedPath}`,
        });

    } catch (error) {
        // A09 — log เฉพาะ message ไม่ expose stack trace
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[POST /decrypt-image][${new Date().toISOString()}]`, message);
        return NextResponse.json(
            { message: 'เกิดข้อผิดพลาดในการถอดรหัส' },
            { status: 500 }
        );
    }
}