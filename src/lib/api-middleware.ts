// src/lib/api-middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CustomApiError, ERROR_CODES, HTTP_STATUS } from './error-handler';

// Rate limiting configuration
const RATE_LIMITS = {
    default: { requests: 100, window: 60 * 1000 }, // 100 requests per minute
    auth: { requests: 10, window: 60 * 1000 }, // 10 requests per minute for auth endpoints
    upload: { requests: 20, window: 60 * 1000 }, // 20 requests per minute for uploads
    sensitive: { requests: 5, window: 60 * 1000 }, // 5 requests per minute for sensitive operations
} as const;

// In-memory rate limit store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Get client information
export function getClientInfo(request: NextRequest) {
    // Use request.headers directly instead of headers() function
    const forwarded = request.headers.get('x-forwarded-for');
    const realIP = request.headers.get('x-real-ip');
    const cfConnectingIP = request.headers.get('cf-connecting-ip');
    const ip = forwarded?.split(',')[0]?.trim() || realIP || cfConnectingIP || '127.0.0.1';

    return {
        ip,
        userAgent: request.headers.get('user-agent') || 'unknown',
        referer: request.headers.get('referer') || null,
        origin: request.headers.get('origin') || null,
        timestamp: new Date(),
    };
}

// Rate limiting middleware
export async function rateLimit(
    request: NextRequest,
    type: keyof typeof RATE_LIMITS = 'default'
): Promise<void> {
    const clientInfo = getClientInfo(request);
    const key = `${type}:${clientInfo.ip}`;
    const limit = RATE_LIMITS[type];
    const now = Date.now();

    // Clean up expired entries
    for (const [k, v] of rateLimitStore.entries()) {
        if (v.resetTime < now) {
            rateLimitStore.delete(k);
        }
    }

    const current = rateLimitStore.get(key);

    if (!current) {
        rateLimitStore.set(key, { count: 1, resetTime: now + limit.window });
        return;
    }

    if (current.resetTime < now) {
        rateLimitStore.set(key, { count: 1, resetTime: now + limit.window });
        return;
    }

    if (current.count >= limit.requests) {
        throw new CustomApiError(
            ERROR_CODES.RATE_LIMIT_EXCEEDED,
            `เกินขอบเขตการใช้งาน กรุณารอ ${Math.ceil((current.resetTime - now) / 1000)} วินาที`,
            HTTP_STATUS.TOO_MANY_REQUESTS,
            {
                limit: limit.requests,
                window: limit.window / 1000,
                resetTime: current.resetTime,
            }
        );
    }

    current.count++;
}

// Request logging middleware
export async function logRequest(
    request: NextRequest,
    response?: NextResponse,
    error?: any
): Promise<void> {
    try {
        const clientInfo = getClientInfo(request);
        const url = new URL(request.url);

        const logData = {
            method: request.method,
            path: url.pathname,
            query: url.search,
            ip: clientInfo.ip,
            userAgent: clientInfo.userAgent,
            referer: clientInfo.referer,
            origin: clientInfo.origin,
            statusCode: response?.status || (error ? 500 : 200),
            timestamp: clientInfo.timestamp,
            error: error ? {
                message: error.message,
                code: error.code || 'UNKNOWN',
                stack: error.stack,
            } : null,
        };

        // Log to console (in production, use proper logging service)
        console.log('API Request:', JSON.stringify(logData, null, 2));

        // Optionally log to database for important endpoints
        if (url.pathname.includes('/auth/') || error) {
            await prisma.api_logs.create({
                data: {
                    method: request.method,
                    path: url.pathname,
                    query_params: url.search || null,
                    ip: clientInfo.ip,
                    user_agent: clientInfo.userAgent,
                    status_code: logData.statusCode,
                    error_message: error?.message || null,
                    created_at: new Date(),
                },
            }).catch((dbError) => {
                console.error('Failed to log to database:', dbError);
            });
        }
    } catch (logError) {
        console.error('Logging error:', logError);
    }
}

// CORS middleware
export function setCorsHeaders(response: NextResponse): NextResponse {
    response.headers.set('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGINS || '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    response.headers.set('Access-Control-Max-Age', '86400');
    return response;
}

// Security headers middleware
export function setSecurityHeaders(response: NextResponse): NextResponse {
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

    if (process.env.NODE_ENV === 'production') {
        response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }

    return response;
}

// Request validation middleware
export async function validateRequest(
    request: NextRequest,
    options: {
        methods?: string[];
        requireAuth?: boolean;
        requireContentType?: string;
        maxBodySize?: number;
    } = {}
): Promise<void> {
    const { methods = [], requireAuth = false, requireContentType, maxBodySize } = options;

    // Method validation
    if (methods.length > 0 && !methods.includes(request.method)) {
        throw new CustomApiError(
            ERROR_CODES.INVALID_PARAMETERS,
            `Method ${request.method} not allowed`,
            HTTP_STATUS.METHOD_NOT_ALLOWED
        );
    }

    // Content-Type validation
    if (requireContentType && request.method !== 'GET') {
        const contentType = request.headers.get('content-type');
        if (!contentType?.includes(requireContentType)) {
            throw new CustomApiError(
                ERROR_CODES.INVALID_FORMAT,
                `Content-Type must be ${requireContentType}`,
                HTTP_STATUS.BAD_REQUEST
            );
        }
    }

    // Body size validation
    if (maxBodySize && request.method !== 'GET') {
        const contentLength = request.headers.get('content-length');
        if (contentLength && parseInt(contentLength) > maxBodySize) {
            throw new CustomApiError(
                ERROR_CODES.VALIDATION_ERROR,
                `Request body too large. Maximum size: ${maxBodySize} bytes`,
                HTTP_STATUS.BAD_REQUEST
            );
        }
    }

    // Auth validation (if required)
    if (requireAuth) {
        const authorization = request.headers.get('authorization');
        if (!authorization) {
            throw new CustomApiError(
                ERROR_CODES.UNAUTHORIZED,
                'Authorization header required',
                HTTP_STATUS.UNAUTHORIZED
            );
        }

        // Add your auth validation logic here
        // For example, JWT token validation
    }
}

// Maintenance mode check
export async function checkMaintenanceMode(): Promise<void> {
    if (process.env.MAINTENANCE_MODE === 'true') {
        throw new CustomApiError(
            ERROR_CODES.MAINTENANCE_MODE,
            'ระบบอยู่ในช่วงปรับปรุง กรุณาลองใหม่อีกครั้งในภายหลัง',
            HTTP_STATUS.SERVICE_UNAVAILABLE
        );
    }
}

// Health check for database connection
export async function checkDatabaseHealth(): Promise<void> {
    try {
        await prisma.$queryRaw`SELECT 1`;
    } catch (error) {
        throw new CustomApiError(
            ERROR_CODES.SERVICE_UNAVAILABLE,
            'ไม่สามารถเชื่อมต่อฐานข้อมูลได้',
            HTTP_STATUS.SERVICE_UNAVAILABLE
        );
    }
}

// Comprehensive API middleware wrapper
export function withMiddleware(
    handler: (request: NextRequest) => Promise<NextResponse>,
    options: {
        rateLimit?: keyof typeof RATE_LIMITS;
        methods?: string[];
        requireAuth?: boolean;
        requireContentType?: string;
        maxBodySize?: number;
        skipHealthCheck?: boolean;
        skipMaintenanceCheck?: boolean;
    } = {}
) {
    return async (request: NextRequest): Promise<NextResponse> => {
        let response: NextResponse;
        let error: any = null;

        try {
            // Maintenance mode check
            if (!options.skipMaintenanceCheck) {
                await checkMaintenanceMode();
            }

            // Database health check
            if (!options.skipHealthCheck) {
                await checkDatabaseHealth();
            }

            // Request validation
            await validateRequest(request, {
                methods: options.methods,
                requireAuth: options.requireAuth,
                requireContentType: options.requireContentType,
                maxBodySize: options.maxBodySize,
            });

            // Rate limiting
            if (options.rateLimit) {
                await rateLimit(request, options.rateLimit);
            }

            // Handle OPTIONS request for CORS
            if (request.method === 'OPTIONS') {
                response = new NextResponse(null, { status: 200 });
            } else {
                // Execute the actual handler
                response = await handler(request);
            }

            // Apply security headers
            response = setSecurityHeaders(response);
            response = setCorsHeaders(response);

        } catch (err) {
            error = err;

            // Handle errors
            if (err instanceof CustomApiError) {
                response = NextResponse.json(
                    {
                        success: false,
                        error: {
                            code: err.code,
                            message: err.message,
                            details: err.details,
                        },
                    },
                    { status: err.statusCode }
                );
            } else {
                response = NextResponse.json(
                    {
                        success: false,
                        error: {
                            code: ERROR_CODES.INTERNAL_SERVER_ERROR,
                            message: 'เกิดข้อผิดพลาดภายในระบบ',
                        },
                    },
                    { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
                );
            }

            // Apply headers to error response
            response = setSecurityHeaders(response);
            response = setCorsHeaders(response);
        } finally {
            // Log the request
            await logRequest(request, response, error);
        }

        return response;
    };
}