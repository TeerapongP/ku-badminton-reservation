import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/Auth';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { withMiddleware } from '@/lib/api-middleware';
import {
    CustomApiError,
    ERROR_CODES,
    HTTP_STATUS,
    successResponse,
    withErrorHandler,
} from '@/lib/error-handler';

// ── Magic Bytes (File Signature) ─────────────────────────────────────────────
// A08 — ตรวจสอบ file signature จริงๆ ไม่เชื่อ MIME type จาก client

const FILE_SIGNATURES: Record<string, { magic: Buffer; offset: number }[]> = {
    'image/jpeg': [
        { magic: Buffer.from([0xff, 0xd8, 0xff, 0xe0]), offset: 0 },
        { magic: Buffer.from([0xff, 0xd8, 0xff, 0xe1]), offset: 0 },
        { magic: Buffer.from([0xff, 0xd8, 0xff, 0xe2]), offset: 0 },
        { magic: Buffer.from([0xff, 0xd8, 0xff, 0xdb]), offset: 0 },
    ],
    'image/png': [
        { magic: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), offset: 0 },
    ],
    'image/webp': [
        { magic: Buffer.from([0x52, 0x49, 0x46, 0x46]), offset: 0 }, // "RIFF"
    ],
};

const ALLOWED_MIME_TYPES  = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const ALLOWED_EXTENSIONS  = ['jpg', 'jpeg', 'png', 'webp'];
const MAX_FILE_SIZE       = 10 * 1024 * 1024; // 10MB

/**
 * A08 — ตรวจสอบ magic bytes ของไฟล์จริงๆ
 */
function validateMagicBytes(buffer: Buffer, mimeType: string): boolean {
    const normalizedMime = mimeType === 'image/jpg' ? 'image/jpeg' : mimeType;
    const signatures = FILE_SIGNATURES[normalizedMime];
    if (!signatures) return false;

    return signatures.some(({ magic, offset }) => {
        if (buffer.length < offset + magic.length) return false;
        return buffer.subarray(offset, offset + magic.length).equals(magic);
    });
}

/**
 * A08 — WebP ต้องตรวจ "WEBP" marker เพิ่มเติมที่ offset 8
 */
function validateWebP(buffer: Buffer): boolean {
    if (buffer.length < 12) return false;
    const webpMarker = Buffer.from([0x57, 0x45, 0x42, 0x50]); // "WEBP"
    return buffer.subarray(8, 12).equals(webpMarker);
}

// ── Handler ───────────────────────────────────────────────────────────────────

async function uploadPaymentSlipHandler(request: NextRequest) {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        throw new CustomApiError(
            ERROR_CODES.UNAUTHORIZED,
            'กรุณาเข้าสู่ระบบ',
            HTTP_STATUS.UNAUTHORIZED
        );
    }

    const formData = await request.formData();
    const file     = formData.get('file') as File;
    const bookingId = formData.get('bookingId') as string | null;

    if (!file) {
        throw new CustomApiError(
            ERROR_CODES.MISSING_REQUIRED_FIELDS,
            'ไม่พบไฟล์สลิปการชำระเงิน',
            HTTP_STATUS.BAD_REQUEST
        );
    }

    // A01 — ตรวจสอบ ownership ของ bookingId
    if (bookingId) {
        const bookingBigId = (() => {
            const str = String(bookingId).trim();
            if (!/^\d+$/.test(str)) return null;
            return BigInt(str);
        })();

        if (!bookingBigId) {
            throw new CustomApiError(
                ERROR_CODES.VALIDATION_ERROR,
                'bookingId ไม่ถูกต้อง',
                HTTP_STATUS.BAD_REQUEST
            );
        }

        const reservation = await prisma.reservations.findFirst({
            where: {
                reservation_id: bookingBigId,
                user_id:        BigInt(session.user.id), // ownership check
            },
            select: { reservation_id: true },
        });

        if (!reservation) {
            throw new CustomApiError(
                ERROR_CODES.NOT_FOUND,
                'ไม่พบข้อมูลการจอง',
                HTTP_STATUS.NOT_FOUND
            );
        }
    }

    // Validate MIME type (ตรวจ whitelist ก่อน)
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        throw new CustomApiError(
            ERROR_CODES.INVALID_FORMAT,
            'ประเภทไฟล์ไม่ถูกต้อง กรุณาเลือกไฟล์รูปภาพ (JPEG, PNG, WebP)',
            HTTP_STATUS.BAD_REQUEST
        );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
        throw new CustomApiError(
            ERROR_CODES.VALIDATION_ERROR,
            `ไฟล์มีขนาดใหญ่เกินไป (สูงสุด 10MB) ขนาดปัจจุบัน: ${(file.size / 1024 / 1024).toFixed(2)}MB`,
            HTTP_STATUS.BAD_REQUEST
        );
    }

    // Validate filename length
    if (!file.name || file.name.length > 255) {
        throw new CustomApiError(
            ERROR_CODES.INVALID_FORMAT,
            'ชื่อไฟล์ไม่ถูกต้องหรือยาวเกินไป',
            HTTP_STATUS.BAD_REQUEST
        );
    }

    // A08 — ดึง extension จาก MIME type แทนชื่อไฟล์ ป้องกัน path traversal
    const mimeToExt: Record<string, string> = {
        'image/jpeg': 'jpg',
        'image/jpg':  'jpg',
        'image/png':  'png',
        'image/webp': 'webp',
    };
    const fileExtension = mimeToExt[file.type];
    if (!fileExtension || !ALLOWED_EXTENSIONS.includes(fileExtension)) {
        throw new CustomApiError(
            ERROR_CODES.INVALID_FORMAT,
            'นามสกุลไฟล์ไม่ถูกต้อง',
            HTTP_STATUS.BAD_REQUEST
        );
    }

    // อ่าน buffer ก่อน validate magic bytes
    let buffer: Buffer;
    try {
        buffer = Buffer.from(await file.arrayBuffer());
    } catch {
        throw new CustomApiError(
            ERROR_CODES.VALIDATION_ERROR,
            'ไม่สามารถอ่านไฟล์ได้',
            HTTP_STATUS.BAD_REQUEST
        );
    }

    // A08 — ตรวจสอบ magic bytes จริงๆ ไม่เชื่อ MIME type จาก client
    const isMagicValid = file.type === 'image/webp'
        ? validateMagicBytes(buffer, file.type) && validateWebP(buffer)
        : validateMagicBytes(buffer, file.type);

    if (!isMagicValid) {
        throw new CustomApiError(
            ERROR_CODES.INVALID_FORMAT,
            'ไฟล์ไม่ใช่รูปภาพจริงๆ หรือไฟล์เสียหาย',
            HTTP_STATUS.BAD_REQUEST
        );
    }

    // สร้าง uploads directory
    const baseUploadPath = process.env.IMAGE_PATH
        ? '/app/uploads'
        : join(process.cwd(), 'public', 'uploads');
    const uploadsDir = join(baseUploadPath, 'payment-slips');

    try {
        if (!existsSync(uploadsDir)) {
            await mkdir(uploadsDir, { recursive: true });
        }
    } catch (error) {
        // A09 — log เฉพาะ message
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[POST /upload-slip][${new Date().toISOString()}] mkdir failed:`, message);
        throw new CustomApiError(
            ERROR_CODES.INTERNAL_SERVER_ERROR,
            'ไม่สามารถสร้างโฟลเดอร์สำหรับเก็บไฟล์ได้',
            HTTP_STATUS.INTERNAL_SERVER_ERROR
        );
    }

    // Generate unique filename — ไม่ใช้ชื่อไฟล์จาก user เลย
    const timestamp     = Date.now();
    const randomString  = crypto.randomBytes(8).toString('hex');
    const hashedUserId  = crypto.createHash('sha256').update(session.user.id).digest('hex').substring(0, 8);
    const filename      = `slip_${hashedUserId}_${timestamp}_${randomString}.${fileExtension}`;

    // เขียนไฟล์
    const filePath = join(uploadsDir, filename);
    try {
        await writeFile(filePath, buffer);
    } catch (error) {
        // A09 — log เฉพาะ message
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[POST /upload-slip][${new Date().toISOString()}] writeFile failed:`, message);
        throw new CustomApiError(
            ERROR_CODES.INTERNAL_SERVER_ERROR,
            'ไม่สามารถบันทึกไฟล์ได้',
            HTTP_STATUS.INTERNAL_SERVER_ERROR
        );
    }

    // A05 — ไม่เรียก prisma.$disconnect() บน singleton
    const publicPath = `/api/images/payment-slips/${filename}`;

    return successResponse(
        {
            filename,
            filePath:     publicPath,
            originalName: file.name.substring(0, 255), // จำกัดความยาวก่อน return
            size:         file.size,
            type:         file.type,
            bookingId:    bookingId ?? null,
            uploadedAt:   new Date().toISOString(),
            // A01 — ไม่ return uploadedBy (user id) ออกไป
        },
        'อัปโหลดสลิปการชำระเงินสำเร็จ'
    );
}

export const POST = withMiddleware(
    withErrorHandler(uploadPaymentSlipHandler),
    {
        methods:     ['POST'],
        rateLimit:   'upload',
        maxBodySize: 12 * 1024 * 1024,
    }
);