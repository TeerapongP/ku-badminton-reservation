// src/lib/api-middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/prisma';
import { CustomApiError, ERROR_CODES, HTTP_STATUS } from './error-handler';

// [SECURITY FIX: SonarQube S109] - Constants
const IP_MAX_LENGTH = 45;
const USER_AGENT_MAX_LENGTH = 512;
const CORS_MAX_AGE = '600';

const RATE_LIMITS = {
    default:   { requests: 100, window: 60 * 1000 },
    auth:      { requests: 10,  window: 60 * 1000 },
    upload:    { requests: 20,  window: 60 * 1000 },
    sensitive: { requests: 5,   window: 60 * 1000 },
} as const;

// [SECURITY FIX: OWASP A05] - ใส่ domain จริงจาก env เพื่อไม่ hardcode
const ALLOWED_ORIGINS: string[] = [
    ...(process.env.ALLOWED_ORIGIN ? [process.env.ALLOWED_ORIGIN] : []),
    ...(process.env.ALLOWED_ORIGIN_WWW ? [process.env.ALLOWED_ORIGIN_WWW] : []),
    ...(process.env.NODE_ENV === 'development' ? ['http://localhost:3000'] : []),
];

// [SECURITY WARNING: OWASP A04] - In-memory rate limit store
//  NOT suitable for production with multiple server instances
// Replace with Redis: https://github.com/vercel/kv
// Or use: upstash/ratelimit with Redis adapter
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// ─────────────────────────────────────────
// Client Info
// ─────────────────────────────────────────
export function getClientInfo(request: NextRequest) {
    const cfIP    = request.headers.get('cf-connecting-ip');
    const realIP  = request.headers.get('x-real-ip');
    const fwdIP   = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();

    // Priority: Cloudflare > x-real-ip > x-forwarded-for (least trusted)
    const ip = (cfIP ?? realIP ?? fwdIP ?? '127.0.0.1').substring(0, IP_MAX_LENGTH);

    return {
        ip,
        userAgent: (request.headers.get('user-agent') ?? 'unknown').substring(0, USER_AGENT_MAX_LENGTH),
        referer:   request.headers.get('referer'),
        origin:    request.headers.get('origin'),
        timestamp: new Date(),
    };
}

// ─────────────────────────────────────────
// Rate Limiting
// ─────────────────────────────────────────
export async function rateLimit(
    request: NextRequest,
    type: keyof typeof RATE_LIMITS = 'default'
): Promise<void> {
    const { ip } = getClientInfo(request);
    const key = `${type}:${ip}`;
    const limit = RATE_LIMITS[type];
    const now = Date.now();

    // Clean up expired entries
    for (const [k, v] of rateLimitStore.entries()) {
        if (v.resetTime < now) rateLimitStore.delete(k);
    }

    const current = rateLimitStore.get(key);

    if (!current || current.resetTime < now) {
        rateLimitStore.set(key, { count: 1, resetTime: now + limit.window });
        return;
    }

    if (current.count >= limit.requests) {
        throw new CustomApiError(
            ERROR_CODES.RATE_LIMIT_EXCEEDED,
            `เกินขอบเขตการใช้งาน กรุณารอ ${Math.ceil((current.resetTime - now) / 1000)} วินาที`,
            HTTP_STATUS.TOO_MANY_REQUESTS,
            { limit: limit.requests, window: limit.window / 1000, resetTime: current.resetTime }
        );
    }

    current.count++;
}

// ─────────────────────────────────────────
// Request Logging
// ─────────────────────────────────────────
export async function logRequest(
    request: NextRequest,
    response?: NextResponse,
    error?: unknown
): Promise<void> {
    try {
        const clientInfo = getClientInfo(request);
        const url = new URL(request.url);
        const isCustomApiError = error instanceof CustomApiError;

        if (process.env.NODE_ENV === 'development') {
            console.log('API Request:', JSON.stringify({
                method:     request.method,
                path:       url.pathname,
                ip:         clientInfo.ip,
                statusCode: response?.status ?? (error ? 500 : 200),
                // [SECURITY FIX: OWASP A09] - error code เท่านั้น ไม่มี stack trace
                errorCode:  isCustomApiError ? error.code : (error ? 'UNKNOWN' : null),
            }));
        }

        // Log ลง DB เฉพาะ auth endpoint หรือ error
        if (url.pathname.includes('/auth/') || error) {
            await prisma.api_logs.create({
                data: {
                    method:       request.method,
                    path:         url.pathname,
                    query_params: url.search || null,
                    ip:           clientInfo.ip,
                    user_agent:   clientInfo.userAgent,
                    status_code:  response?.status ?? 500,
                    // [SECURITY FIX: OWASP A05] - Generic message เท่านั้น ไม่มี stack trace
                    error_message: error ? 'Request error occurred' : null,
                    created_at:   new Date(),
                },
            }).catch((dbError: unknown) => {
                console.error('Failed to write api_log:', dbError instanceof Error ? dbError.message : 'Unknown');
            });
        }
    } catch (logError) {
        console.error('logRequest error:', logError instanceof Error ? logError.message : 'Unknown');
    }
}

// ─────────────────────────────────────────
// CORS Headers
// ─────────────────────────────────────────
export function setCorsHeaders(response: NextResponse, request: NextRequest): NextResponse {
    const origin = request.headers.get('origin');

    // [SECURITY FIX: OWASP A05] - Strict origin whitelist, ไม่มี wildcard fallback
    if (origin && ALLOWED_ORIGINS.includes(origin)) {
        response.headers.set('Access-Control-Allow-Origin', origin);
        response.headers.set('Access-Control-Allow-Credentials', 'true');
    }

    const path = request.nextUrl.pathname;
    const allowedMethods = path.startsWith('/api/admin')
        ? 'GET, POST, PUT, DELETE'
        : 'GET, POST';

    response.headers.set('Access-Control-Allow-Methods', allowedMethods);
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token');
    response.headers.set('Access-Control-Max-Age', CORS_MAX_AGE);

    return response;
}

// ─────────────────────────────────────────
// Security Headers
// ─────────────────────────────────────────
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

// ─────────────────────────────────────────
// Request Validation
// ─────────────────────────────────────────
export async function validateRequest(
    request: NextRequest,
    options: {
        methods?:            string[];
        requireAuth?:        boolean;
        requireContentType?: string;
        maxBodySize?:        number;
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

    // [SECURITY FIX: OWASP A01] - Auth validation ที่ implement จริง
    if (requireAuth) {
        const token = await getToken({
            req: request as Parameters<typeof getToken>[0]['req'],
            secret: process.env.NEXTAUTH_SECRET,
        });

        if (!token?.id) {
            throw new CustomApiError(
                ERROR_CODES.UNAUTHORIZED,
                'กรุณาเข้าสู่ระบบ',
                HTTP_STATUS.UNAUTHORIZED
            );
        }
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
        if (contentLength && parseInt(contentLength, 10) > maxBodySize) {
            throw new CustomApiError(
                ERROR_CODES.VALIDATION_ERROR,
                `Request body too large. Maximum: ${maxBodySize} bytes`,
                HTTP_STATUS.BAD_REQUEST
            );
        }
    }
}

// ─────────────────────────────────────────
// Maintenance Mode
// ─────────────────────────────────────────
export async function checkMaintenanceMode(): Promise<void> {
    if (process.env.MAINTENANCE_MODE === 'true') {
        throw new CustomApiError(
            ERROR_CODES.MAINTENANCE_MODE,
            'ระบบอยู่ในช่วงปรับปรุง กรุณาลองใหม่อีกครั้งในภายหลัง',
            HTTP_STATUS.SERVICE_UNAVAILABLE
        );
    }
}

// ─────────────────────────────────────────
// Database Health (เรียกใช้เฉพาะ /api/health)
// ─────────────────────────────────────────
export async function checkDatabaseHealth(): Promise<void> {
    try {
        await prisma.$queryRaw`SELECT 1`;
    } catch {
        throw new CustomApiError(
            ERROR_CODES.SERVICE_UNAVAILABLE,
            'ไม่สามารถเชื่อมต่อฐานข้อมูลได้',
            HTTP_STATUS.SERVICE_UNAVAILABLE
        );
    }
}

// ─────────────────────────────────────────
// Main Middleware Wrapper
// ─────────────────────────────────────────
export function withMiddleware(
    handler: (request: NextRequest) => Promise<NextResponse>,
    options: {
        rateLimit?:            keyof typeof RATE_LIMITS;
        methods?:              string[];
        requireAuth?:          boolean;
        requireContentType?:   string;
        maxBodySize?:          number;
        skipMaintenanceCheck?: boolean;
    } = {}
) {
    return async (request: NextRequest): Promise<NextResponse> => {
        let response: NextResponse | undefined;
        let caughtError: unknown = null;

        try {
            if (!options.skipMaintenanceCheck) {
                await checkMaintenanceMode();
            }

            await validateRequest(request, {
                methods:            options.methods,
                requireAuth:        options.requireAuth,
                requireContentType: options.requireContentType,
                maxBodySize:        options.maxBodySize,
            });

            if (options.rateLimit) {
                await rateLimit(request, options.rateLimit);
            }

            response = request.method === 'OPTIONS'
                ? new NextResponse(null, { status: 200 })
                : await handler(request);

            response = setSecurityHeaders(response);
            response = setCorsHeaders(response, request);

        } catch (err) {
            caughtError = err;

            response = err instanceof CustomApiError
                ? NextResponse.json(
                    { success: false, error: { code: err.code, message: err.message } },
                    { status: err.statusCode }
                )
                : NextResponse.json(
                    // [SECURITY FIX: OWASP A05] - Generic message ไม่เปิดเผย detail
                    { success: false, error: { code: ERROR_CODES.INTERNAL_SERVER_ERROR, message: 'เกิดข้อผิดพลาดภายในระบบ' } },
                    { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
                );

            response = setSecurityHeaders(response);
            response = setCorsHeaders(response, request);

        } finally {
            if (response) {
                await logRequest(request, response, caughtError ?? undefined);
            }
        }

        return response ?? NextResponse.json(
            { success: false, error: { code: ERROR_CODES.INTERNAL_SERVER_ERROR, message: 'เกิดข้อผิดพลาดภายในระบบ' } },
            { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
        );
    };
}