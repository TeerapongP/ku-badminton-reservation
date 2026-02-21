import { NextRequest } from 'next/server';
import { readFile } from 'node:fs/promises';
import { join, resolve, extname } from 'node:path';
import { existsSync } from 'node:fs';
import { CustomApiError, ERROR_CODES, HTTP_STATUS, withErrorHandler } from '@/lib/error-handler';


async function imageHandler(
    request: NextRequest,
    context: { params: Promise<{ path: string[] }> }
) {
    try {
        const resolvedParams = await context.params;
        const imagePath = resolvedParams.path.join('/');


        if (!imagePath) {
            throw new CustomApiError(
                ERROR_CODES.MISSING_REQUIRED_FIELDS,
                'ไม่พบ path ของรูปภาพ',
                HTTP_STATUS.BAD_REQUEST
            );
        }

        // [SECURITY FIX] - Validate path doesn't contain traversal
        if (imagePath.includes('..') || imagePath.includes('~') || imagePath.includes('\\')) {
            throw new CustomApiError(
                ERROR_CODES.FORBIDDEN,
                'Invalid file path',
                HTTP_STATUS.FORBIDDEN
            );
        }

        // [SECURITY FIX] - Whitelist allowed directories
        const allowedDirs = ['profiles', 'payment-slips', 'banners', 'facilities', 'courts', 'payments'];
        const firstDir = resolvedParams.path[0];
        if (!allowedDirs.includes(firstDir)) {
            throw new CustomApiError(
                ERROR_CODES.FORBIDDEN,
                'Access denied',
                HTTP_STATUS.FORBIDDEN
            );
        }

        // [SECURITY FIX] - Validate file extension
        const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
        const ext = extname(imagePath).toLowerCase();
        if (!allowedExtensions.includes(ext)) {
            throw new CustomApiError(
                ERROR_CODES.FORBIDDEN,
                'Invalid file type',
                HTTP_STATUS.FORBIDDEN
            );
        }

        const baseUploadPath = process.env.IMAGE_PATH 
            ? process.env.IMAGE_PATH.replace(/\/$/, '') 
            : join(process.cwd(), 'public', 'uploads');
        
        const fullImagePath = resolve(baseUploadPath, imagePath);

        // [SECURITY FIX] - Ensure resolved path is still within base directory
        if (!fullImagePath.startsWith(resolve(baseUploadPath))) {
            throw new CustomApiError(
                ERROR_CODES.FORBIDDEN,
                'Access denied',
                HTTP_STATUS.FORBIDDEN
            );
        }

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
        let contentType = 'image/jpeg';

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
        }

        // Convert Buffer to Uint8Array for Response (more compatible)
        const uint8Array = new Uint8Array(imageBuffer);

        // Return image with appropriate headers
        return new Response(uint8Array, {
            status: 200,
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=31536000, immutable', 
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