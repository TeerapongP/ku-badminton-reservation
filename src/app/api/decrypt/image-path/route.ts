import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/Auth';
import crypto from 'node:crypto';
import path from 'node:path';

const ALLOWED_URL_PREFIXES = ['/uploads/', '/images/', '/api/images/'];

// A03 — แปลง file system path → URL path แล้วตรวจสอบ whitelist
function resolveToUrlPath(decryptedPath: string): string | null {
    const uploadBaseDir = process.env.IMAGE_PATH;

    // Normalizing paths (handles \ on Windows)
    const normalized = path.normalize(decryptedPath).replace(/\\/g, '/');

    // ป้องกัน path traversal
    if (normalized.includes('..')) return null;

    // ถ้าเป็น URL path อยู่แล้ว ตรวจสอบ prefix
    if (ALLOWED_URL_PREFIXES.some(prefix => normalized.startsWith(prefix))) {
        // Remove /api if it's there, because we'll add it back later
        if (normalized.startsWith('/api/')) {
            return normalized.slice(4);
        }
        return normalized;
    }

    // แปลง file system path → URL path
    if (uploadBaseDir && normalized.startsWith(path.normalize(uploadBaseDir).replace(/\\/g, '/'))) {
        const relative = normalized.slice(path.normalize(uploadBaseDir).replace(/\\/g, '/').length);
        const urlPath = '/uploads' + (relative.startsWith('/') ? relative : '/' + relative);

        if (!ALLOWED_URL_PREFIXES.some(prefix => urlPath.startsWith(prefix))) {
            return null;
        }

        return urlPath;
    }

    return null;
}

export async function POST(request: NextRequest) {
    try {
        // A01 — ต้อง login ก่อนเสมอ ไม่มี auth = ปฏิเสธทันที
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json(
                { message: 'กรุณาเข้าสู่ระบบ' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { encryptedPath } = body;

        // A03 — ตรวจสอบ input ก่อนประมวลผล
        if (!encryptedPath || typeof encryptedPath !== 'string') {
            return NextResponse.json(
                { message: 'ไม่พบข้อมูลที่เข้ารหัส' },
                { status: 400 }
            );
        }

        // A05 — ไม่ fallback เป็น empty string ถ้าไม่มี key
        const encryptionKey = process.env.UPLOAD_ENCRYPTION_KEY;
        if (!encryptionKey || encryptionKey.length < 32) {
            console.error(`[POST /decrypt-image][${new Date().toISOString()}] UPLOAD_ENCRYPTION_KEY not configured`);
            return NextResponse.json(
                { message: 'Service misconfigured' },
                { status: 500 }
            );
        }

        const parts = encryptedPath.split(':');
        let decryptedPath: string;

        try {
            const keyHash = crypto.createHash('sha256').update(encryptionKey).digest();

            if (parts.length === 2) {
                // AES-256-CBC (Legacy)
                const iv = Buffer.from(parts[0], 'hex');
                const encryptedData = parts[1];

                if (iv.length !== 16) {
                    throw new Error('Invalid IV length');
                }

                const decipher = crypto.createDecipheriv('aes-256-cbc', keyHash, iv);
                decryptedPath = decipher.update(encryptedData, 'hex', 'utf8');
                decryptedPath += decipher.final('utf8');
            } else if (parts.length === 3) {
                // AES-256-GCM (New)
                const iv = Buffer.from(parts[0], 'hex');
                const authTag = Buffer.from(parts[1], 'hex');
                const encryptedData = parts[2];

                if (iv.length !== 12) {
                    // Although GCM can use other lengths, our implementation uses 12 bytes IV
                    throw new Error('Invalid IV length for GCM');
                }

                const decipher = crypto.createDecipheriv('aes-256-gcm', keyHash, iv);
                decipher.setAuthTag(authTag);
                decryptedPath = decipher.update(encryptedData, 'hex', 'utf8');
                decryptedPath += decipher.final('utf8');
            } else {
                return NextResponse.json(
                    { message: 'รูปแบบข้อมูลไม่ถูกต้อง' },
                    { status: 400 }
                );
            }

        } catch (decryptError) {
            // A09 — log สาเหตุจริงภายใน ไม่ส่งออก response
            const message = decryptError instanceof Error ? decryptError.message : 'Unknown';
            console.error(`[POST /decrypt-image][${new Date().toISOString()}] Decrypt failed: ${message}`);
            return NextResponse.json(
                { message: 'ไม่สามารถถอดรหัสข้อมูลได้' },
                { status: 400 }
            );
        }

        // A03 — validate path หลัง decrypt ก่อน return เสมอ
        // ป้องกัน path traversal และ file system path หลุดไปถึง client
        const urlPath = resolveToUrlPath(decryptedPath);
        if (!urlPath) {
            console.warn(`[POST /decrypt-image][${new Date().toISOString()}] Invalid path by user ${session.user.id}: ${decryptedPath}`);
            return NextResponse.json(
                { message: 'ไม่อนุญาตให้เข้าถึง path นี้' },
                { status: 403 }
            );
        }

        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
        return NextResponse.json({
            imagePath: `${baseUrl}/api${urlPath}`,
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