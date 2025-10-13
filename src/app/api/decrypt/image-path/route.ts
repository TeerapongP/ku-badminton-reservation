import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
    try {
        const { encryptedPath } = await request.json();

        if (!encryptedPath) {
            return NextResponse.json(
                { message: 'ไม่พบข้อมูลที่เข้ารหัส' },
                { status: 400 }
            );
        }

        // Decrypt the image path
        const encryptionKey = process.env.UPLOAD_ENCRYPTION_KEY || 'default-key-change-in-production';
        const algorithm = 'aes-256-cbc';
        
        try {
            // Split IV and encrypted data
            const parts = encryptedPath.split(':');
            if (parts.length !== 2) {
                throw new Error('Invalid encrypted format');
            }
            
            const iv = Buffer.from(parts[0], 'hex');
            const encryptedData = parts[1];
            
            // Create key hash (32 bytes for aes-256)
            const keyHash = crypto.createHash('sha256').update(encryptionKey).digest();
            
            const decipher = crypto.createDecipheriv(algorithm, keyHash, iv);
            let decryptedPath = decipher.update(encryptedData, 'hex', 'utf8');
            decryptedPath += decipher.final('utf8');

            return NextResponse.json({
                imagePath: decryptedPath
            });
        } catch (decryptError) {
            return NextResponse.json(
                { message: 'ไม่สามารถถอดรหัสข้อมูลได้' },
                { status: 400 }
            );
        }

    } catch (error) {
        console.error('Decrypt error:', error);
        return NextResponse.json(
            { message: 'เกิดข้อผิดพลาดในการถอดรหัส' },
            { status: 500 }
        );
    }
}