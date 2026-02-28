import { NextRequest } from 'next/server';
import { readFile, stat } from 'node:fs/promises';
import { join, resolve, extname } from 'node:path';
import { existsSync } from 'node:fs';
import { CustomApiError, ERROR_CODES, HTTP_STATUS, withErrorHandler } from '@/lib/error-handler';
import mime from 'mime';

async function imageHandler(
    request: NextRequest,
    context: { params: Promise<{ path: string[] }> }
) {
    try {
        const resolvedParams = await context.params;
        const pathSegments = resolvedParams.path;

        if (!pathSegments || pathSegments.length === 0) {
            throw new CustomApiError(
                ERROR_CODES.MISSING_REQUIRED_FIELDS,
                'ไม่พบ path ของรูปภาพ',
                HTTP_STATUS.BAD_REQUEST
            );
        }

        const imagePath = pathSegments.join('/');

        // [SECURITY FIX] - Validate path doesn't contain traversal
        if (imagePath.includes('..') || imagePath.includes('~') || imagePath.includes('\\')) {
            throw new CustomApiError(
                ERROR_CODES.FORBIDDEN,
                'Invalid file path',
                HTTP_STATUS.FORBIDDEN
            );
        }

        // [SECURITY FIX] - Whitelist allowed directories
        // Consistent whitelist for both /api/images and /api/uploads
        const allowedDirs = ['profiles', 'payment-slips', 'banners', 'facilities', 'courts', 'payments', 'temp', 'slips'];
        const firstDir = pathSegments[0];
        if (!allowedDirs.includes(firstDir)) {
            console.warn(`[Upload API Redirect] Blocked access to directory: ${firstDir}`);
            throw new CustomApiError(
                ERROR_CODES.FORBIDDEN,
                'Access denied: directory not allowed',
                HTTP_STATUS.FORBIDDEN
            );
        }

        // Base path resolution
        const baseUploadPath = process.env.IMAGE_PATH 
            ? resolve(process.env.IMAGE_PATH)
            : join(process.cwd(), 'public', 'uploads');
        
        const fullImagePath = resolve(baseUploadPath, imagePath);

        // [SECURITY FIX] - Ensure resolved path is still within base directory
        const resolvedBase = resolve(baseUploadPath);
        if (!fullImagePath.startsWith(resolvedBase)) {
            throw new CustomApiError(
                ERROR_CODES.FORBIDDEN,
                'Access denied: path outside base directory',
                HTTP_STATUS.FORBIDDEN
            );
        }

        // Check if file exists
        if (!existsSync(fullImagePath)) {
            console.error(`[Upload API Redirect] File not found: ${fullImagePath}`);
            throw new CustomApiError(
                ERROR_CODES.NOT_FOUND,
                'ไม่พบรูปภาพที่ต้องการ',
                HTTP_STATUS.NOT_FOUND
            );
        }

        const fileStat = await stat(fullImagePath);
        if (!fileStat.isFile()) {
            throw new CustomApiError(
                ERROR_CODES.NOT_FOUND,
                'เส้นทางที่ระบุไม่ใช่ไฟล์',
                HTTP_STATUS.NOT_FOUND
            );
        }

        // Read file
        const imageBuffer = await readFile(fullImagePath);

        if (imageBuffer.length === 0) {
            console.error(`[Upload API Redirect] File is empty: ${fullImagePath}`);
            throw new CustomApiError(
                ERROR_CODES.INTERNAL_SERVER_ERROR,
                'ไฟล์รูปภาพว่างเปล่า',
                HTTP_STATUS.INTERNAL_SERVER_ERROR
            );
        }

        // Determine content type
        let contentType = mime.getType(fullImagePath);
        
        // Manual fallback for common image types if mime.getType fails
        if (!contentType) {
            const ext = extname(fullImagePath).toLowerCase();
            switch (ext) {
                case '.jpg':
                case '.jpeg':
                    contentType = 'image/jpeg';
                    break;
                case '.png':
                    contentType = 'image/png';
                    break;
                case '.webp':
                    contentType = 'image/webp';
                    break;
                case '.gif':
                    contentType = 'image/gif';
                    break;
                case '.svg':
                    contentType = 'image/svg+xml';
                    break;
                default:
                    contentType = 'application/octet-stream';
            }
        }

        // Return image with appropriate headers
        return new Response(imageBuffer, {
            status: 200,
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=31536000, immutable', 
                'Content-Length': imageBuffer.length.toString(),
                'X-Content-Type-Options': 'nosniff',
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
