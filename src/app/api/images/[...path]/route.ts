import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import {
    withErrorHandler,
    CustomApiError,
    ERROR_CODES,
    HTTP_STATUS
} from "@/lib/error-handler";

async function imageHandler(
    request: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    try {
        const resolvedParams = await params;
        const imagePath = resolvedParams.path.join('/');

        if (!imagePath) {
            throw new CustomApiError(
                ERROR_CODES.MISSING_REQUIRED_FIELDS,
                'ไม่พบ path ของรูปภาพ',
                HTTP_STATUS.BAD_REQUEST
            );
        }

        // Get base upload path from environment
        const baseUploadPath = process.env.IMAGE_PATH || join(process.cwd(), 'public', 'uploads');
        const fullImagePath = join(baseUploadPath, imagePath);

        // Check if file exists
        if (!existsSync(fullImagePath)) {
            throw new CustomApiError(
                ERROR_CODES.NOT_FOUND,
                'ไม่พบรูปภาพที่ต้องการ',
                HTTP_STATUS.NOT_FOUND
            );
        }

        // Read file
        const imageBuffer = await readFile(fullImagePath);

        // Determine content type based on file extension
        const extension = imagePath.split('.').pop()?.toLowerCase();
        let contentType = 'image/jpeg'; // default

        switch (extension) {
            case 'png':
                contentType = 'image/png';
                break;
            case 'webp':
                contentType = 'image/webp';
                break;
            case 'gif':
                contentType = 'image/gif';
                break;
            case 'svg':
                contentType = 'image/svg+xml';
                break;
            case 'jpg':
            case 'jpeg':
            default:
                contentType = 'image/jpeg';
                break;
        }

        // Convert Buffer to Uint8Array for Response (more compatible)
        const uint8Array = new Uint8Array(imageBuffer);

        // Return image with appropriate headers
        return new Response(uint8Array, {
            status: 200,
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=31536000, immutable', // Cache for 1 year
                'Content-Length': imageBuffer.length.toString(),
            },
        });

    } catch (error) {
        if (error instanceof CustomApiError) {
            throw error;
        }

        console.error('Image serving error:', error);
        throw new CustomApiError(
            ERROR_CODES.INTERNAL_SERVER_ERROR,
            'เกิดข้อผิดพลาดในการโหลดรูปภาพ',
            HTTP_STATUS.INTERNAL_SERVER_ERROR
        );
    }
}

export const GET = withErrorHandler(imageHandler);