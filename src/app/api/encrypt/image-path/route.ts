import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
    try {
        const { imagePath } = await request.json();

        if (!imagePath) {
            return NextResponse.json(
                { message: 'ไม่พบ image path' },
                { status: 400 }
            );
        }

        // Encrypt the image path
        const encryptionKey = process.env.UPLOAD_ENCRYPTION_KEY ?? "";
        const algorithm = 'aes-256-cbc';
        
        try {
            // Generate IV for encryption
            const iv = crypto.randomBytes(16);
            
            // Create key hash (32 bytes for aes-256)
            const keyHash = crypto.createHash('sha256').update(encryptionKey).digest();
            
            const cipher = crypto.createCipheriv(algorithm, keyHash, iv);
            let encrypted = cipher.update(imagePath, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            
            // Prepend IV to encrypted data
            const encryptedPath = iv.toString('hex') + ':' + encrypted;

            return NextResponse.json({
                encryptedPath: encryptedPath,
                message: 'เข้ารหัสสำเร็จ'
            });
        } catch (encryptError) {
            return NextResponse.json(
                { message: 'ไม่สามารถเข้ารหัสข้อมูลได้' },
                { status: 400 }
            );
        }

    } catch (error) {
        console.error('Encrypt error:', error);
        return NextResponse.json(
            { message: 'เกิดข้อผิดพลาดในการเข้ารหัส' },
            { status: 500 }
        );
    }
}