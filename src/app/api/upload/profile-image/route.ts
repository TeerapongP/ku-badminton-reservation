import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const userId = formData.get('userId') as string;

        if (!file) {
            return NextResponse.json(
                { message: 'ไม่พบไฟล์ที่อัปโหลด' },
                { status: 400 }
            );
        }

        if (!userId) {
            return NextResponse.json(
                { message: 'ไม่พบ User ID' },
                { status: 400 }
            );
        }

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json(
                { message: 'ประเภทไฟล์ไม่ถูกต้อง กรุณาเลือกไฟล์รูปภาพ' },
                { status: 400 }
            );
        }

        // Validate file size (max 5MB)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            return NextResponse.json(
                { message: 'ไฟล์มีขนาดใหญ่เกินไป (สูงสุด 5MB)' },
                { status: 400 }
            );
        }

        // Create uploads directory if it doesn't exist
        const uploadsDir = join(process.cwd(), 'public', 'uploads', 'profiles');
        if (!existsSync(uploadsDir)) {
            await mkdir(uploadsDir, { recursive: true });
        }

        // Generate unique filename with encryption
        const fileExtension = file.name.split('.').pop();
        const timestamp = Date.now();
        const randomString = crypto.randomBytes(16).toString('hex');
        const hashedUserId = crypto.createHash('sha256').update(userId).digest('hex').substring(0, 8);
        const encryptedFilename = `profile_${hashedUserId}_${timestamp}_${randomString}.${fileExtension}`;

        // Convert file to buffer
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Write file to uploads directory
        const filePath = join(uploadsDir, encryptedFilename);
        await writeFile(filePath, buffer);

        // Encrypt the response data
        const encryptionKey = process.env.UPLOAD_ENCRYPTION_KEY || 'default-key-change-in-production';
        const algorithm = 'aes-256-cbc';

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

        // Create cipher for image path
        const publicPath = `/uploads/profiles/${encryptedFilename}`;
        const pathIv = crypto.randomBytes(16);
        const pathCipher = crypto.createCipheriv(algorithm, keyHash, pathIv);
        let encryptedImagePath = pathCipher.update(publicPath, 'utf8', 'hex');
        encryptedImagePath += pathCipher.final('hex');

        // Prepend IV to encrypted path
        encryptedImagePath = pathIv.toString('hex') + ':' + encryptedImagePath;

        return NextResponse.json({
            message: 'อัปโหลดรูปภาพสำเร็จ',
            imagePath: encryptedImagePath,
            filename: encryptedFilenameResponse,
        });

    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json(
            { message: 'เกิดข้อผิดพลาดในการอัปโหลดไฟล์' },
            { status: 500 }
        );
    }
}