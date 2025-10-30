import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import crypto from 'crypto';
import {
    withErrorHandler,
    validateRequired,
    CustomApiError,
    ERROR_CODES,
    HTTP_STATUS,
    successResponse
} from "@/lib/error-handler";
import { withMiddleware } from "@/lib/api-middleware";

async function uploadHandler(request: NextRequest) {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;

    if (!file) {
        throw new CustomApiError(
            ERROR_CODES.MISSING_REQUIRED_FIELDS,
            'ไม่พบไฟล์ที่อัปโหลด',
            HTTP_STATUS.BAD_REQUEST
        );
    }

    if (!userId) {
        throw new CustomApiError(
            ERROR_CODES.MISSING_REQUIRED_FIELDS,
            'ไม่พบ User ID',
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

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
        throw new CustomApiError(
            ERROR_CODES.VALIDATION_ERROR,
            `ไฟล์มีขนาดใหญ่เกินไป (สูงสุด 5MB) ขนาดปัจจุบัน: ${(file.size / 1024 / 1024).toFixed(2)}MB`,
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
    const baseUploadPath = process.env.IMAGE_PATH || '/home/remotepang1/ku-badminton-app/uploads';
    const uploadsDir = join(baseUploadPath, 'profiles');

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

    // Generate unique filename with encryption
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (!fileExtension || !['jpg', 'jpeg', 'png', 'webp'].includes(fileExtension)) {
        throw new CustomApiError(
            ERROR_CODES.INVALID_FORMAT,
            'นามสกุลไฟล์ไม่ถูกต้อง',
            HTTP_STATUS.BAD_REQUEST
        );
    }

    const timestamp = Date.now();
    const randomString = crypto.randomBytes(16).toString('hex');
    const hashedUserId = crypto.createHash('sha256').update(userId).digest('hex').substring(0, 8);
    const encryptedFilename = `profile_${hashedUserId}_${timestamp}_${randomString}.${fileExtension}`;

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
    const filePath = join(uploadsDir, encryptedFilename);
    try {
        await writeFile(filePath, buffer);
    } catch (error) {
        throw new CustomApiError(
            ERROR_CODES.INTERNAL_SERVER_ERROR,
            'ไม่สามารถบันทึกไฟล์ได้',
            HTTP_STATUS.INTERNAL_SERVER_ERROR
        );
    }

    // Encrypt the response data
    const encryptionKey = process.env.UPLOAD_ENCRYPTION_KEY || 'default-key-change-in-production';

    if (encryptionKey === 'default-key-change-in-production') {
        console.warn('Warning: Using default encryption key. Please set UPLOAD_ENCRYPTION_KEY in production.');
    }

    const algorithm = 'aes-256-cbc';

    try {
        // Generate IV for encryption
        const iv = crypto.randomBytes(16);

        // Create key hash (32 bytes for aes-256)
        const keyHash = crypto.createHash('sha256').update(encryptionKey).digest();

        // Create cipher for filename
        const filenameCipher = crypto.createCipheriv(algorithm, keyHash, iv);
        let encryptedFilenameResponse = filenameCipher.update(encryptedFilename, 'utf8', 'hex');
        encryptedFilenameResponse += filenameCipher.final('hex');

        // Prepend IV to encrypted filename
        encryptedFilenameResponse = iv.toString('hex') + ':' + encryptedFilenameResponse;

        // Create cipher for image path (use API route instead of direct path)
        const publicPath = `/api/images/profiles/${encryptedFilename}`;
        const pathIv = crypto.randomBytes(16);
        const pathCipher = crypto.createCipheriv(algorithm, keyHash, pathIv);
        let encryptedImagePath = pathCipher.update(publicPath, 'utf8', 'hex');
        encryptedImagePath += pathCipher.final('hex');

        // Prepend IV to encrypted path
        encryptedImagePath = pathIv.toString('hex') + ':' + encryptedImagePath;

        return successResponse({
            imagePath: encryptedImagePath,
            filename: encryptedFilenameResponse,
            originalName: file.name,
            size: file.size,
            type: file.type,
        }, 'อัปโหลดรูปภาพสำเร็จ');

    } catch (error) {
        throw new CustomApiError(
            ERROR_CODES.INTERNAL_SERVER_ERROR,
            'เกิดข้อผิดพลาดในการเข้ารหัสข้อมูล',
            HTTP_STATUS.INTERNAL_SERVER_ERROR
        );
    }
}

export const POST = withMiddleware(
    withErrorHandler(uploadHandler),
    {
        methods: ['POST'],
        rateLimit: 'upload',
        maxBodySize: 6 * 1024 * 1024, // 6MB (slightly larger than file limit for form data overhead)
    }
);