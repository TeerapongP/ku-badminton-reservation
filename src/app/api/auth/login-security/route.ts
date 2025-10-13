import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { headers } from 'next/headers';

// จำกัดจำนวนครั้งที่ login ผิด
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 30 * 60 * 1000; // 30 นาที

export async function POST(request: NextRequest) {
    try {
        const { username, password, captchaToken } = await request.json();
        const headersList = headers();

        // ดึงข้อมูล client
        const clientInfo = getClientInfo(request, headersList);

        if (!username || !password) {
            return NextResponse.json(
                { message: 'กรุณากรอก Username และ Password' },
                { status: 400 }
            );
        }

        // ตรวจสอบ rate limiting ตาม IP
        const ipLimitCheck = await checkIPRateLimit(clientInfo.ip);
        if (!ipLimitCheck.allowed) {
            return NextResponse.json(
                {
                    message: 'มีการพยายามเข้าสู่ระบบมากเกินไป กรุณารอ 30 นาที',
                    requireCaptcha: true,
                    lockoutUntil: ipLimitCheck.lockoutUntil
                },
                { status: 429 }
            );
        }

        // ตรวจสอบ captcha หากจำเป็น
        if (ipLimitCheck.requireCaptcha && !captchaToken) {
            return NextResponse.json(
                {
                    message: 'กรุณายืนยัน Captcha',
                    requireCaptcha: true
                },
                { status: 400 }
            );
        }

        if (captchaToken) {
            const captchaValid = await verifyCaptcha(captchaToken);
            if (!captchaValid) {
                return NextResponse.json(
                    { message: 'Captcha ไม่ถูกต้อง' },
                    { status: 400 }
                );
            }
        }

        // ค้นหาผู้ใช้
        const user = await prisma.users.findFirst({
            where: {
                OR: [
                    { username: username },
                    { email: username }
                ]
            },
            select: {
                user_id: true,
                username: true,
                email: true,
                password_hash: true,
                first_name: true,
                last_name: true,
                status: true,
                last_login_at: true
            }
        });

        // บันทึก log การพยายาม login (ไม่ว่าจะพบ user หรือไม่ก็บันทึกเป็น login_fail)
        await logAuthAttempt({
            userId: user?.user_id || null,
            usernameInput: username,
            action: 'login_fail',
            success: false,
            clientInfo
        });

        if (!user) {
            await recordFailedAttempt(null, clientInfo.ip);
            return NextResponse.json(
                { message: 'Username หรือ Password ไม่ถูกต้อง' },
                { status: 401 }
            );
        }

        // ตรวจสอบสถานะบัญชี
        if (user.status !== 'active') {
            return NextResponse.json(
                { message: 'บัญชีของคุณถูกระงับ กรุณาติดต่อผู้ดูแลระบบ' },
                { status: 403 }
            );
        }

        // ตรวจสอบรหัสผ่าน (ใช้ password_hash แทน password)
        const passwordValid = await bcrypt.compare(password, user.password_hash);

        if (!passwordValid) {
            await recordFailedAttempt(user.user_id, clientInfo.ip);

            // นับจำนวนครั้งที่ล้มเหลวจาก auth_log
            const failedCount = await getFailedLoginCount(user.user_id);
            const remainingAttempts = MAX_LOGIN_ATTEMPTS - failedCount;

            if (remainingAttempts <= 0) {
                return NextResponse.json(
                    {
                        message: 'มีการพยายามเข้าสู่ระบบผิดเกิน 5 ครั้ง กรุณารอ 30 นาที',
                        lockedUntil: new Date(Date.now() + LOCKOUT_DURATION)
                    },
                    { status: 423 }
                );
            }

            return NextResponse.json(
                {
                    message: `Username หรือ Password ไม่ถูกต้อง (เหลือ ${remainingAttempts} ครั้ง)`,
                    remainingAttempts
                },
                { status: 401 }
            );
        }

        // Login สำเร็จ - อัปเดต last_login_at
        await prisma.users.update({
            where: { user_id: user.user_id },
            data: {
                last_login_at: new Date()
            }
        });

        // บันทึก log การ login สำเร็จ
        await logAuthAttempt({
            userId: user.user_id,
            usernameInput: username,
            action: 'login_success',
            success: true,
            clientInfo
        });

        // รีเซ็ต IP rate limit
        await resetIPRateLimit(clientInfo.ip);

        return NextResponse.json({
            message: 'เข้าสู่ระบบสำเร็จ',
            success: true,
            user: {
                id: user.user_id,
                username: user.username,
                email: user.email,
                name: `${user.first_name} ${user.last_name}`
            }
        });

    } catch (error) {
        console.error('Login security error:', error);
        return NextResponse.json(
            { message: 'เกิดข้อผิดพลาดในระบบ' },
            { status: 500 }
        );
    }
}

// ฟังก์ชันดึงข้อมูล client
function getClientInfo(request: NextRequest, headersList: any) {
    const forwarded = headersList.get('x-forwarded-for');
    const realIP = headersList.get('x-real-ip');
    const cfConnectingIP = headersList.get('cf-connecting-ip');
    const ip = forwarded?.split(',')[0]?.trim() || realIP || cfConnectingIP || '127.0.0.1';

    return {
        ip,
        userAgent: headersList.get('user-agent') || 'unknown',
        browser: getBrowserInfo(headersList.get('user-agent') || ''),
        os: getOSInfo(headersList.get('user-agent') || ''),
        timestamp: new Date()
    };
}

// ฟังก์ชันดึงข้อมูล browser
function getBrowserInfo(userAgent: string): string {
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Unknown';
}

// ฟังก์ชันดึงข้อมูล OS
function getOSInfo(userAgent: string): string {
    if (userAgent.includes('Windows')) return 'Windows';
    if (userAgent.includes('Mac')) return 'macOS';
    if (userAgent.includes('Linux')) return 'Linux';
    if (userAgent.includes('Android')) return 'Android';
    if (userAgent.includes('iOS')) return 'iOS';
    return 'Unknown';
}

// ฟังก์ชันตรวจสอบ rate limiting ตาม IP
async function checkIPRateLimit(ip: string) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    // นับจำนวนครั้งที่ล้มเหลวใน 1 ชั่วโมงที่ผ่านมา
    const failedAttempts = await prisma.auth_log.count({
        where: {
            ip: ip,
            action: 'login_fail',
            created_at: { gte: oneHourAgo }
        }
    });

    const requireCaptcha = failedAttempts >= 3;
    const isLocked = failedAttempts >= 10;

    if (isLocked) {
        const lockoutUntil = new Date(Date.now() + LOCKOUT_DURATION);
        return {
            allowed: false,
            requireCaptcha: true,
            lockoutUntil
        };
    }

    return {
        allowed: true,
        requireCaptcha,
        lockoutUntil: null
    };
}

// ฟังก์ชันรีเซ็ต IP rate limit
async function resetIPRateLimit(ip: string) {
    // ลบ log เก่าที่เกิน 24 ชั่วโมง
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    await prisma.auth_log.deleteMany({
        where: {
            ip: ip,
            created_at: { lt: oneDayAgo }
        }
    });
}

// ฟังก์ชันบันทึกความผิดพลาด
async function recordFailedAttempt(userId: bigint | null, ip: string) {
    // บันทึกใน auth_log เท่านั้น เนื่องจากไม่มี failed_login_attempts field ใน users table
    console.log('Failed login attempt recorded:', {
        userId: userId?.toString(),
        ip,
        timestamp: new Date().toISOString()
    });
}

// ฟังก์ชันนับจำนวนครั้งที่ login ล้มเหลวใน 30 นาทีที่ผ่านมา
async function getFailedLoginCount(userId: bigint): Promise<number> {
    const thirtyMinutesAgo = new Date(Date.now() - LOCKOUT_DURATION);

    return await prisma.auth_log.count({
        where: {
            user_id: userId,
            action: 'login_fail',
            created_at: { gte: thirtyMinutesAgo }
        }
    });
}

// ฟังก์ชันบันทึก log
async function logAuthAttempt({
    userId,
    usernameInput,
    action,
    success,
    clientInfo
}: {
    userId: bigint | null;
    usernameInput: string;
    action: string;
    success: boolean;
    clientInfo: any;
}) {
    await prisma.auth_log.create({
        data: {
            user_id: userId,
            username_input: usernameInput,
            action: success ? 'login_success' : 'login_fail',
            ip: clientInfo.ip,
            user_agent: clientInfo.userAgent,
            created_at: new Date()
        }
    });

    // บันทึก detailed log ในตารางแยก (ถ้ามี)
    console.log('Auth Log:', {
        userId,
        action,
        success,
        ip: clientInfo.ip,
        browser: clientInfo.browser,
        os: clientInfo.os,
        timestamp: clientInfo.timestamp
    });
}

// ฟังก์ชันตรวจสอบ captcha
async function verifyCaptcha(token: string): Promise<boolean> {
    try {
        const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                secret: process.env.RECAPTCHA_SECRET_KEY || '',
                response: token
            })
        });

        const data = await response.json();
        return data.success && data.score > 0.5; // สำหรับ reCAPTCHA v3
    } catch (error) {
        console.error('Captcha verification error:', error);
        return false;
    }
}