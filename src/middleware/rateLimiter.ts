import { NextRequest, NextResponse } from 'next/server';

// In-memory store สำหรับ rate limiting (ในการใช้งานจริงควรใช้ Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

interface RateLimitOptions {
    windowMs: number; // ช่วงเวลาในหน่วย milliseconds
    maxRequests: number; // จำนวนคำขอสูงสุด
    message?: string;
}

export function createRateLimiter(options: RateLimitOptions) {
    return async (request: NextRequest): Promise<NextResponse | null> => {
        const ip = getClientIP(request);
        const now = Date.now();
        const key = `${ip}:${request.nextUrl.pathname}`;

        // ล้างข้อมูลเก่าที่หมดอายุ
        cleanupExpiredEntries(now);

        const entry = rateLimitStore.get(key);

        if (!entry) {
            // สร้าง entry ใหม่
            rateLimitStore.set(key, {
                count: 1,
                resetTime: now + options.windowMs
            });
            return null; // อนุญาต
        }

        if (now > entry.resetTime) {
            // รีเซ็ต counter
            rateLimitStore.set(key, {
                count: 1,
                resetTime: now + options.windowMs
            });
            return null; // อนุญาต
        }

        if (entry.count >= options.maxRequests) {
            // เกินขีดจำกัด
            const resetIn = Math.ceil((entry.resetTime - now) / 1000);
            return NextResponse.json(
                {
                    message: options.message || 'Too many requests',
                    resetIn
                },
                {
                    status: 429,
                    headers: {
                        'X-RateLimit-Limit': options.maxRequests.toString(),
                        'X-RateLimit-Remaining': '0',
                        'X-RateLimit-Reset': entry.resetTime.toString(),
                        'Retry-After': resetIn.toString()
                    }
                }
            );
        }

        // เพิ่ม counter
        entry.count++;
        rateLimitStore.set(key, entry);

        return null; // อนุญาต
    };
}

function getClientIP(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for');
    const realIP = request.headers.get('x-real-ip');
    const cfConnectingIP = request.headers.get('cf-connecting-ip'); // Cloudflare
    const xClientIP = request.headers.get('x-client-ip');
    
    return forwarded?.split(',')[0]?.trim() || 
           realIP || 
           cfConnectingIP || 
           xClientIP || 
           '127.0.0.1'; // fallback to localhost
}

function cleanupExpiredEntries(now: number) {
    for (const [key, entry] of rateLimitStore.entries()) {
        if (now > entry.resetTime) {
            rateLimitStore.delete(key);
        }
    }
}

// Rate limiters สำหรับ endpoints ต่างๆ
export const loginRateLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 นาที
    maxRequests: 5, // 5 ครั้งต่อ 15 นาที
    message: 'มีการพยายามเข้าสู่ระบบมากเกินไป กรุณารอ 15 นาที'
});

export const forgotPasswordRateLimiter = createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 ชั่วโมง
    maxRequests: 3, // 3 ครั้งต่อชั่วโมง
    message: 'มีการขอรีเซ็ตรหัสผ่านมากเกินไป กรุณารอ 1 ชั่วโมง'
});

export const generalApiRateLimiter = createRateLimiter({
    windowMs: 60 * 1000, // 1 นาที
    maxRequests: 100, // 100 ครั้งต่อนาที
    message: 'มีการเรียก API มากเกินไป กรุณารอสักครู่'
});