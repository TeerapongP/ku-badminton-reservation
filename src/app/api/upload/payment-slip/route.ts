import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/Auth';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import crypto from 'crypto';
import {
    withErrorHandler,
    CustomApiError,
    ERROR_CODES,
    HTTP_STATUS,
    successResponse
} from "@/lib/error-handler";
import { withMiddleware } from "@/lib/api-middleware";

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
    const file = formData.get('file') as File;
    const bookingId = formData.get('bookingId') as string;

    if (!file) {
        throw new CustomApiError(
            ERROR_CODES.MISSING_REQUIRED_FIELDS,
            'ไม่พบไฟล์สลิปการชำระเงิน',
            HTTP_STATUS.BAD_REQUEST
        );
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
        throw new CustomApiError(
            ERROR_CODES.INVALID_FORMAT,
            'ประเภทไฟล์ไม่ถูกต้อง กรุณาเลือกไฟล์รูปภาพ (JPEG, PNG, WebP)',
            HTTP_STATUS.BAD_REQUEST,
            { allowedTypes, receivedType: file.type }
        );
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
        throw new CustomApiError(
            ERROR_CODES.VALIDATION_ERROR,
            `ไฟล์มีขนาดใหญ่เกินไป (สูงสุด 10MB) ขนาดปัจจุบัน: ${(file.size / 1024 / 1024).toFixed(2)}MB`,
            HTTP_STATUS.BAD_REQUEST,
            { maxSize, currentSize: file.size }
        );
    }

    // Validate file name
    if (!file.name || file.name.length > 255) {
        throw new CustomApiError(
            ERROR_CODES.INVALID_FORMAT,
            'ชื่อไฟล์ไม่ถูกต้องหรือยาวเกินไป',
            HTTP_STATUS.BAD_REQUEST
        );
    }

    // Create uploads directory if it doesn't exist
    const baseUploadPath = process.env.IMAGE_PATH
        ? '/app/uploads'
        : join(process.cwd(), 'public', 'uploads');
    const uploadsDir = join(baseUploadPath, 'payment-slips');

    try {
        if (!existsSync(uploadsDir)) {
            await mkdir(uploadsDir, { recursive: true });
        }
    } catch (error) {
        console.error('Failed to create upload directory:', error);
        throw new CustomApiError(
            ERROR_CODES.INTERNAL_SERVER_ERROR,
            'ไม่สามารถสร้างโฟลเดอร์สำหรับเก็บไฟล์ได้',
            HTTP_STATUS.INTERNAL_SERVER_ERROR
        );
    }

    // Generate unique filename
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (!fileExtension || !['jpg', 'jpeg', 'png', 'webp'].includes(fileExtension)) {
        throw new CustomApiError(
            ERROR_CODES.INVALID_FORMAT,
            'นามสกุลไฟล์ไม่ถูกต้อง',
            HTTP_STATUS.BAD_REQUEST
        );
    }

    const timestamp = Date.now();
    const randomString = crypto.randomBytes(8).toString('hex');
    const hashedUserId = crypto.createHash('sha256').update(session.user.id).digest('hex').substring(0, 8);
    const filename = `slip_${hashedUserId}_${timestamp}_${randomString}.${fileExtension}`;

    // Convert file to buffer
    let bytes: ArrayBuffer;
    let buffer: Buffer;

    try {
        bytes = await file.arrayBuffer();
        buffer = Buffer.from(bytes);
    } catch (error) {
        throw new CustomApiError(
            ERROR_CODES.VALIDATION_ERROR,
            'ไม่สามารถอ่านไฟล์ได้',
            HTTP_STATUS.BAD_REQUEST
        );
    }

    // Write file to uploads directory
    const filePath = join(uploadsDir, filename);
    try {
        await writeFile(filePath, buffer);
    } catch (error) {
        console.error('Failed to write file:', error);
        throw new CustomApiError(
            ERROR_CODES.INTERNAL_SERVER_ERROR,
            'ไม่สามารถบันทึกไฟล์ได้',
            HTTP_STATUS.INTERNAL_SERVER_ERROR
        );
    }

    // Return file info (no encryption needed for payment slips)
    const publicPath = `/uploads/payment-slips/${filename}`;

    return successResponse({
        filename,
        filePath: publicPath,
        originalName: file.name,
        size: file.size,
        type: file.type,
        bookingId: bookingId || null,
        uploadedBy: session.user.id,
        uploadedAt: new Date().toISOString(),
    }, 'อัปโหลดสลิปการชำระเงินสำเร็จ');
}

export const POST = withMiddleware(
    withErrorHandler(uploadPaymentSlipHandler),
    {
        methods: ['POST'],
        rateLimit: 'upload',
        maxBodySize: 12 * 1024 * 1024, // 12MB (slightly larger than file limit for form data overhead)
    }
);