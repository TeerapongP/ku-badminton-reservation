import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

export async function POST(request: NextRequest) {
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

        // ตรวจสอบว่าเป็น email หรือ phone number
        const isEmail = identifier.includes('@');
        const searchCondition = isEmail 
            ? { email: identifier }
            : { phone: identifier };

        // ตรวจสอบว่ามีผู้ใช้นี้หรือไม่
        const user = await prisma.users.findFirst({
            where: searchCondition,
            select: {
                user_id: true,
                email: true,
                phone: true,
                first_name: true,
                last_name: true,
                status: true
            }
        });

        if (!user) {
            return NextResponse.json(
                { message: 'ไม่พบบัญชีที่ตรงกับข้อมูลที่กรอก' },
                { status: 404 }
            );
        }

        if (user.status !== 'active') {
            return NextResponse.json(
                { message: 'บัญชีผู้ใช้ไม่ได้เปิดใช้งาน' },
                { status: 403 }
            );
        }

        // ตรวจสอบว่าผู้ใช้มีข้อมูลติดต่อตามวิธีที่เลือกหรือไม่
        if (method === 'email' && !user.email) {
            return NextResponse.json(
                { message: 'บัญชีนี้ไม่มีอีเมลที่ลงทะเบียนไว้' },
                { status: 400 }
            );
        }

        if (method === 'sms' && !user.phone) {
            return NextResponse.json(
                { message: 'บัญชีนี้ไม่มีเบอร์โทรศัพท์ที่ลงทะเบียนไว้' },
                { status: 400 }
            );
        }

        // สร้าง reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 ชั่วโมง

        // เข้ารหัส token ก่อนเก็บในฐานข้อมูล
        const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

        // สร้าง reset URL
        const resetUrl = `${process.env.NEXTAUTH_URL}/forgot-password?token=${resetToken}&email=${encodeURIComponent(user.email || '')}&phone=${encodeURIComponent(user.phone || '')}`;

        // บันทึก reset token ลงฐานข้อมูล (สร้างตารางชั่วคราวใน memory หรือใช้ cache)
        // เนื่องจากยังไม่มีตาราง password_resets ใน schema
        const resetData = {
            userId: user.user_id,
            email: user.email,
            phone: user.phone,
            token: hashedToken,
            expiresAt: resetTokenExpiry,
            method: method
        };

        // เก็บใน cache หรือ session storage ชั่วคราว
        // ในการใช้งานจริงควรสร้างตาราง password_resets
        
        try {
            if (method === 'email') {
                await sendResetEmail(user.email!, `${user.first_name} ${user.last_name}`, resetUrl);
                return NextResponse.json({
                    message: 'ส่งลิงก์รีเซ็ตรหัสผ่านไปยังอีเมลของคุณแล้ว',
                    success: true
                });
            } else {
                await sendResetSMS(user.phone!, `${user.first_name} ${user.last_name}`, resetUrl);
                return NextResponse.json({
                    message: 'ส่งลิงก์รีเซ็ตรหัสผ่านไปยังเบอร์โทรศัพท์ของคุณแล้ว',
                    success: true
                });
            }
        } catch (sendError) {
            console.error('Send notification error:', sendError);
            return NextResponse.json(
                { message: 'เกิดข้อผิดพลาดในการส่งลิงก์รีเซ็ต กรุณาลองใหม่อีกครั้ง' },
                { status: 500 }
            );
        }

    } catch (error) {
        console.error('Forgot password error:', error);
        return NextResponse.json(
            { message: 'เกิดข้อผิดพลาดในระบบ' },
            { status: 500 }
        );
    }
}

async function sendResetEmail(email: string, name: string, resetUrl: string) {
    try {
        // ตั้งค่า nodemailer transporter
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: false, // true for 465, false for other ports
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });

        // ตรวจสอบการเชื่อมต่อ
        await transporter.verify();

        const mailOptions = {
            from: `"KU Court Booking" <${process.env.SMTP_USER}>`,
            to: email,
            subject: '🔐 รีเซ็ตรหัสผ่าน - KU Court Booking',
            html: getEmailTemplate(name, resetUrl),
            text: `
สวัสดี ${name}

เราได้รับคำขอรีเซ็ตรหัสผ่านสำหรับบัญชีของคุณ

กรุณาคลิกลิงก์ด้านล่างเพื่อตั้งรหัสผ่านใหม่:
${resetUrl}

ลิงก์นี้จะหมดอายุใน 1 ชั่วโมง

หากคุณไม่ได้ขอรีเซ็ตรหัสผ่าน กรุณาเพิกเฉยต่ออีเมลนี้

© 2024 KU Court Booking System
            `
        };

        const result = await transporter.sendMail(mailOptions);
        console.log('Email sent successfully:', result.messageId);
        
    } catch (error) {
        console.error('Email sending failed:', error);
        throw new Error('ไม่สามารถส่งอีเมลได้ กรุณาลองใหม่อีกครั้ง');
    }
}

async function sendResetSMS(phone: string, name: string, resetUrl: string) {
    console.log(`Sending reset SMS to: ${phone}`);
    console.log(`Reset URL: ${resetUrl}`);
    
    // TODO: Implement SMS sending
    // Example with SMS service:
    /*
    const response = await fetch('https://api.twilio.com/2010-04-01/Accounts/YOUR_ACCOUNT_SID/Messages.json', {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${Buffer.from(`${process.env.TWILIO_SID}:${process.env.TWILIO_TOKEN}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
            From: process.env.TWILIO_PHONE_NUMBER!,
            To: phone,
            Body: `สวัสดี ${name} กรุณาคลิกลิงก์เพื่อรีเซ็ตรหัสผ่าน: ${resetUrl} (หมดอายุใน 1 ชั่วโมง)`
        })
    });
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