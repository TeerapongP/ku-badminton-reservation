import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

// Rate limit: ไม่เกิน 3 ครั้ง / 15 นาที ต่อ IP
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 3;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

function checkRateLimit(ip: string): boolean {
    const now = Date.now();
    const entry = rateLimitMap.get(ip);

    if (!entry || now > entry.resetAt) {
        rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
        return true;
    }

    if (entry.count >= RATE_LIMIT_MAX) return false;

    entry.count++;
    return true;
}

export async function POST(request: NextRequest) {
    const ip = (
        request.headers.get('cf-connecting-ip') ??
        request.headers.get('x-real-ip') ??
        request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
        'unknown'
    ).substring(0, 45);

    //  Rate limiting
    if (!checkRateLimit(ip)) {
        return NextResponse.json(
            { message: 'คุณส่งคำขอบ่อยเกินไป กรุณารอ 15 นาทีแล้วลองใหม่' },
            { status: 429 }
        );
    }

    try {
        const { identifier, method } = await request.json();

        if (!identifier) {
            return NextResponse.json(
                { message: 'กรุณากรอกอีเมลหรือเบอร์โทรศัพท์' },
                { status: 400 }
            );
        }

        if (!method || !['email', 'sms'].includes(method)) {
            return NextResponse.json(
                { message: 'กรุณาเลือกวิธีการรับลิงก์รีเซ็ต' },
                { status: 400 }
            );
        }

        const isEmail = identifier.includes('@');
        const searchCondition = isEmail
            ? { email: identifier }
            : { phone: identifier };

        const user = await prisma.users.findFirst({
            where: searchCondition,
            select: {
                user_id:    true,
                email:      true,
                phone:      true,
                first_name: true,
                last_name:  true,
                status:     true,
            }
        });

        //  ป้องกัน User Enumeration — return 200 เสมอ ไม่ว่าจะเจอ user หรือไม่
        if (!user || user.status !== 'active') {
            return NextResponse.json({
                message: 'หากบัญชีของคุณมีอยู่ในระบบ เราจะส่งลิงก์รีเซ็ตให้คุณเร็วๆ นี้',
                success: true,
            });
        }

        if (method === 'email' && !user.email) {
            return NextResponse.json({
                message: 'หากบัญชีของคุณมีอยู่ในระบบ เราจะส่งลิงก์รีเซ็ตให้คุณเร็วๆ นี้',
                success: true,
            });
        }

        if (method === 'sms' && !user.phone) {
            return NextResponse.json({
                message: 'หากบัญชีของคุณมีอยู่ในระบบ เราจะส่งลิงก์รีเซ็ตให้คุณเร็วๆ นี้',
                success: true,
            });
        }

        //  สร้าง token และ hash ก่อนเก็บ DB
        const resetToken   = crypto.randomBytes(32).toString('hex');
        const hashedToken  = crypto.createHash('sha256').update(resetToken).digest('hex');
        const expiresAt    = new Date(Date.now() + 60 * 60 * 1000); // 1 ชั่วโมง

        //  ยกเลิก token เก่าของ user นี้ก่อน แล้วค่อยสร้างใหม่
        await prisma.password_resets.updateMany({
            where: { user_id: user.user_id, used: false },
            data:  { used: true },
        });

        await prisma.password_resets.create({
            data: {
                user_id:    user.user_id,
                token:      hashedToken,
                expires_at: expiresAt,
            }
        });

        //  Reset URL มีแค่ token เท่านั้น ไม่เปิดเผย email/phone
        const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${resetToken}`;

        try {
            if (method === 'email') {
                await sendResetEmail(
                    user.email!,
                    `${user.first_name} ${user.last_name}`,
                    resetUrl
                );
            } else {
                await sendResetSMS(
                    user.phone!,
                    `${user.first_name} ${user.last_name}`,
                    resetUrl
                );
            }
        } catch (sendError) {
            console.error('Send notification error:', sendError);
            //  ถ้าส่งไม่ได้ ให้ลบ token ที่สร้างไปทิ้ง
            await prisma.password_resets.updateMany({
                where: { user_id: user.user_id, token: hashedToken },
                data:  { used: true },
            });
            return NextResponse.json(
                { message: 'เกิดข้อผิดพลาดในการส่งลิงก์รีเซ็ต กรุณาลองใหม่อีกครั้ง' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            message: 'หากบัญชีของคุณมีอยู่ในระบบ เราจะส่งลิงก์รีเซ็ตให้คุณเร็วๆ นี้',
            success: true,
        });

    } catch (error) {
        console.error('Forgot password error:', error);
        return NextResponse.json(
            { message: 'เกิดข้อผิดพลาดในระบบ' },
            { status: 500 }
        );
    }
}

async function sendResetEmail(email: string, name: string, resetUrl: string) {
    const transporter = nodemailer.createTransport({
        host:   process.env.SMTP_HOST || 'smtp.gmail.com',
        port:   parseInt(process.env.SMTP_PORT || '587'),
        secure: false,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });

    await transporter.verify();

    await transporter.sendMail({
        from:    `"KU Court Booking" <${process.env.SMTP_USER}>`,
        to:      email,
        subject: '🔐 รีเซ็ตรหัสผ่าน - KU Court Booking',
        html:    getEmailTemplate(name, resetUrl),
        text:    `สวัสดี ${name}\n\nกรุณาคลิกลิงก์เพื่อตั้งรหัสผ่านใหม่:\n${resetUrl}\n\nลิงก์นี้จะหมดอายุใน 1 ชั่วโมง\n\nหากคุณไม่ได้ขอรีเซ็ตรหัสผ่าน กรุณาเพิกเฉยต่ออีเมลนี้`,
    });
}

async function sendResetSMS(phone: string, name: string, resetUrl: string) {
    // TODO: Implement SMS provider (Twilio, etc.)
    console.log(`[DEV] SMS to ${phone}: รีเซ็ตรหัสผ่าน: ${resetUrl}`);

    /*
    const response = await fetch('https://api.twilio.com/2010-04-01/Accounts/YOUR_ACCOUNT_SID/Messages.json', {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${Buffer.from(`${process.env.TWILIO_SID}:${process.env.TWILIO_TOKEN}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
            From: process.env.TWILIO_PHONE_NUMBER!,
            To:   phone,
            Body: `สวัสดี ${name} กรุณาคลิกลิงก์เพื่อรีเซ็ตรหัสผ่าน: ${resetUrl} (หมดอายุใน 1 ชั่วโมง)`
        })
    });
    if (!response.ok) throw new Error('SMS sending failed');
    */
}

function getEmailTemplate(name: string, resetUrl: string): string {
    return `
    <!DOCTYPE html>
    <html lang="th">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>รีเซ็ตรหัสผ่าน</title>
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
            .content { padding: 40px 30px; }
            .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
            .footer { background-color: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px; }
            .warning { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin: 20px 0; color: #856404; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🔐 รีเซ็ตรหัสผ่าน</h1>
                <p>KU Court Booking System</p>
            </div>
            <div class="content">
                <h2>สวัสดี ${name}</h2>
                <p>เราได้รับคำขอรีเซ็ตรหัสผ่านสำหรับบัญชีของคุณ</p>
                <p>กรุณาคลิกปุ่มด้านล่างเพื่อตั้งรหัสผ่านใหม่:</p>

                <div style="text-align: center;">
                    <a href="${resetUrl}" class="button">รีเซ็ตรหัสผ่าน</a>
                </div>

                <div class="warning">
                    <strong>⚠️ ข้อควรระวัง:</strong>
                    <ul>
                        <li>ลิงก์นี้จะหมดอายุใน 1 ชั่วโมง</li>
                        <li>หากคุณไม่ได้ขอรีเซ็ตรหัสผ่าน กรุณาเพิกเฉยต่ออีเมลนี้</li>
                        <li>อย่าแชร์ลิงก์นี้กับผู้อื่น</li>
                    </ul>
                </div>

                <p>หากปุ่มไม่ทำงาน กรุณาคัดลอกลิงก์ด้านล่างไปวางในเบราว์เซอร์:</p>
                <p style="word-break: break-all; background-color: #f8f9fa; padding: 10px; border-radius: 4px; font-family: monospace;">
                    ${resetUrl}
                </p>
            </div>
            <div class="footer">
                <p>© 2024 KU Court Booking System</p>
                <p>หากมีปัญหา กรุณาติดต่อทีมสนับสนุน</p>
            </div>
        </div>
    </body>
    </html>
    `;
}