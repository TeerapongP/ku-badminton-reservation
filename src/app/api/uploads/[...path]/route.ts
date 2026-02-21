import { NextRequest } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { CustomApiError, ERROR_CODES, HTTP_STATUS, withErrorHandler } from '@/lib/error-handler';


async function imageHandler(
    request: NextRequest,
    context: { params: Promise<{ path: string[] }> }
) {
    try {
        const resolvedParams = await context.params;
        const imagePath = resolvedParams.path.join('/');

        console.log('[Upload API] Request received:', {
            url: request.url,
            imagePath,
            params: resolvedParams.path
        });

        if (!imagePath) {
            throw new CustomApiError(
                ERROR_CODES.MISSING_REQUIRED_FIELDS,
                'ไม่พบ path ของรูปภาพ',
                HTTP_STATUS.BAD_REQUEST
            );
        }

        // Validate path doesn't contain traversal
        if (imagePath.includes('..') || imagePath.includes('~') || imagePath.includes('\\')) {
            throw new CustomApiError(
                ERROR_CODES.FORBIDDEN,
                'Invalid file path',
                HTTP_STATUS.FORBIDDEN
            );
        }

        // Whitelist allowed directories
        const allowedDirs = ['profiles', 'slips', 'banners'];
        const firstDir = resolvedParams.path[0];
        if (!allowedDirs.includes(firstDir)) {
            throw new CustomApiError(
                ERROR_CODES.FORBIDDEN,
                'Access denied',
                HTTP_STATUS.FORBIDDEN
            );
        }

        // Validate file extension
        const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
        const path = require('path');
        const ext = path.extname(imagePath).toLowerCase();
        if (!allowedExtensions.includes(ext)) {
            throw new CustomApiError(
                ERROR_CODES.FORBIDDEN,
                'Invalid file type',
                HTTP_STATUS.FORBIDDEN
            );
        }

        const baseUploadPath = process.env.IMAGE_PATH 
            ? process.env.IMAGE_PATH.replace(/\/$/, '') // Remove trailing slash
            : join(process.cwd(), 'public', 'uploads');
        
        const fullImagePath = path.resolve(baseUploadPath, imagePath);

        // Ensure resolved path is still within base directory
        if (!fullImagePath.startsWith(path.resolve(baseUploadPath))) {
            throw new CustomApiError(
                ERROR_CODES.FORBIDDEN,
                'Access denied',
                HTTP_STATUS.FORBIDDEN
            );
        }

        console.log('[Upload API] Attempting to serve:', {
            imagePath,
            baseUploadPath,
            fullImagePath,
            exists: existsSync(fullImagePath),
            IMAGE_PATH_env: process.env.IMAGE_PATH
        });

        // Check if file exists
        if (!existsSync(fullImagePath)) {
            console.error('[Upload API] File not found:', fullImagePath);
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

        console.log('[Upload API] Serving file:', {
            size: imageBuffer.length,
            contentType
        });

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

        console.error('Upload API serving error:', error);
        throw new CustomApiError(
            ERROR_CODES.INTERNAL_SERVER_ERROR,
            'เกิดข้อผิดพลาดในการโหลดรูปภาพ',
            HTTP_STATUS.INTERNAL_SERVER_ERROR
        );
    }
}

export const GET = withErrorHandler(imageHandler);
