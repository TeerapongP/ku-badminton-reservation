import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { getClientInfo, withMiddleware } from '@/lib/api-middleware';
import { validateRequired, CustomApiError, ERROR_CODES, HTTP_STATUS, successResponse, withErrorHandler } from '@/lib/error-handler';

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 30 * 60 * 1000; // 30 นาที

async function loginHandler(request: NextRequest) {
    const { username, password, captchaToken } = await request.json();

    validateRequired({ username, password }, ['username', 'password']);

    const clientInfo = getClientInfo(request);

    // ✅ ตรวจ IP rate limit
    const ipLimitCheck = await checkIPRateLimit(clientInfo.ip);
    if (!ipLimitCheck.allowed) {
        throw new CustomApiError(
            ERROR_CODES.TOO_MANY_ATTEMPTS,
            'มีการพยายามเข้าสู่ระบบมากเกินไป กรุณารอ 30 นาที',
            HTTP_STATUS.TOO_MANY_REQUESTS,
            { requireCaptcha: true, lockoutUntil: ipLimitCheck.lockoutUntil }
        );
    }

    // ✅ ตรวจ captcha ถ้าจำเป็น
    if (ipLimitCheck.requireCaptcha && !captchaToken) {
        throw new CustomApiError(
            ERROR_CODES.VALIDATION_ERROR,
            'กรุณายืนยัน Captcha',
            HTTP_STATUS.BAD_REQUEST,
            { requireCaptcha: true }
        );
    }

    if (captchaToken) {
        const captchaValid = await verifyCaptcha(captchaToken);
        if (!captchaValid) {
            throw new CustomApiError(
                ERROR_CODES.VALIDATION_ERROR,
                'Captcha ไม่ถูกต้อง',
                HTTP_STATUS.BAD_REQUEST
            );
        }
    }

    // ค้นหาผู้ใช้
    const user = await prisma.users.findFirst({
        where: {
            OR: [
                { username },
                { email: username }
            ]
        },
        select: {
            user_id:       true,
            username:      true,
            email:         true,
            password_hash: true,
            first_name:    true,
            last_name:     true,
            role:          true,
            status:        true,
            last_login_at: true,
        }
    });

    // ✅ ตรวจสอบ user ไม่พบ
    if (!user) {
        await logAuthAttempt({
            userId:        null,
            usernameInput: username,
            action:        'login_fail',
            clientInfo,
        });
        throw new CustomApiError(
            ERROR_CODES.INVALID_CREDENTIALS,
            'Username หรือ Password ไม่ถูกต้อง',
            HTTP_STATUS.UNAUTHORIZED
        );
    }

    // ✅ ตรวจสอบสถานะบัญชี
    if (user.status !== 'active') {
        throw new CustomApiError(
            ERROR_CODES.ACCOUNT_SUSPENDED,
            'บัญชีของคุณถูกระงับ กรุณาติดต่อผู้ดูแลระบบ',
            HTTP_STATUS.FORBIDDEN
        );
    }

    // ✅ ตรวจสอบรหัสผ่าน
    const passwordValid = await bcrypt.compare(password, user.password_hash);

    if (!passwordValid) {
        // ✅ บันทึก login_fail หลังรู้ว่า password ผิดจริง
        await logAuthAttempt({
            userId:        user.user_id,
            usernameInput: username,
            action:        'login_fail',
            clientInfo,
        });

        const failedCount = await getFailedLoginCount(user.user_id);
        const remainingAttempts = MAX_LOGIN_ATTEMPTS - failedCount;

        if (remainingAttempts <= 0) {
            throw new CustomApiError(
                ERROR_CODES.TOO_MANY_ATTEMPTS,
                'มีการพยายามเข้าสู่ระบบผิดเกิน 5 ครั้ง กรุณารอ 30 นาที',
                423,
                { lockedUntil: new Date(Date.now() + LOCKOUT_DURATION) }
            );
        }

        throw new CustomApiError(
            ERROR_CODES.INVALID_CREDENTIALS,
            `Username หรือ Password ไม่ถูกต้อง (เหลือ ${remainingAttempts} ครั้ง)`,
            HTTP_STATUS.UNAUTHORIZED,
            { remainingAttempts }
        );
    }

    // ✅ Login สำเร็จ
    const isFirstLogin = !user.last_login_at;

    await Promise.all([
        prisma.users.update({
            where: { user_id: user.user_id },
            data:  { last_login_at: new Date(), last_login_ip: clientInfo.ip },
        }),
        // ✅ บันทึก login_success หลังผ่านทุกการตรวจสอบแล้ว
        logAuthAttempt({
            userId:        user.user_id,
            usernameInput: username,
            action:        'login_success',
            clientInfo,
        }),
    ]);

    return successResponse({
        id:           user.user_id,
        username:     user.username,
        email:        user.email,
        name:         `${user.first_name} ${user.last_name}`,
        role:         user.role,   // ✅ return role เพื่อให้ frontend redirect ได้ถูกต้อง
        isFirstLogin,
    }, 'เข้าสู่ระบบสำเร็จ');
}

export const POST = withMiddleware(
    withErrorHandler(loginHandler),
    {
        methods:            ['POST'],
        rateLimit:          'auth',
        requireContentType: 'application/json',
        maxBodySize:        5 * 1024, // 5KB
    }
);

// ตรวจสอบ rate limiting ตาม IP
async function checkIPRateLimit(ip: string) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const failedAttempts = await prisma.auth_log.count({
        where: {
            ip,
            action:     'login_fail',
            created_at: { gte: oneHourAgo }
        }
    });

    const requireCaptcha = failedAttempts >= 5;
    const isLocked       = failedAttempts >= 10;

    if (isLocked) {
        return {
            allowed:      false,
            requireCaptcha: true,
            lockoutUntil: new Date(Date.now() + LOCKOUT_DURATION),
        };
    }

    return {
        allowed:      true,
        requireCaptcha,
        lockoutUntil: null,
    };
}

// นับจำนวนครั้งที่ login ล้มเหลวใน 30 นาทีที่ผ่านมา
async function getFailedLoginCount(userId: bigint): Promise<number> {
    const thirtyMinutesAgo = new Date(Date.now() - LOCKOUT_DURATION);

    return prisma.auth_log.count({
        where: {
            user_id:    userId,
            action:     'login_fail',
            created_at: { gte: thirtyMinutesAgo }
        }
    });
}

// ✅ บันทึก auth log — ไม่ลบ log เก่าเพื่อรักษา audit trail
async function logAuthAttempt({
    userId,
    usernameInput,
    action,
    clientInfo,
}: {
    userId:        bigint | null;
    usernameInput: string;
    action:        'login_success' | 'login_fail';
    clientInfo:    any;
}) {
    // Sanitize username input ป้องกัน log injection
    const sanitizedUsername = usernameInput
        .replace(/[^\w@.-]/g, '')
        .substring(0, 255);

    await prisma.auth_log.create({
        data: {
            user_id:        userId,
            username_input: sanitizedUsername,
            action,
            ip:             clientInfo.ip?.substring(0, 45)   || 'unknown',
            user_agent:     clientInfo.userAgent?.substring(0, 512) || 'unknown',
            created_at:     new Date(),
        }
    });
}

// ตรวจสอบ reCAPTCHA v3
async function verifyCaptcha(token: string): Promise<boolean> {
    try {
        const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
            method:  'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body:    new URLSearchParams({
                secret:   process.env.RECAPTCHA_SECRET_KEY || '',
                response: token,
            }),
        });

        const data = await response.json();
        return data.success && data.score > 0.5;
    } catch (error) {
        console.error('Captcha verification error:', error);
        return false;
    }
}