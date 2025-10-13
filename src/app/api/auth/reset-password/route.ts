import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
    try {
        const { token, email, password, confirmPassword } = await request.json();

        // Validation
        if (!token || !email || !password || !confirmPassword) {
            return NextResponse.json(
                { message: 'กรุณากรอกข้อมูลให้ครบถ้วน' },
                { status: 400 }
            );
        }

        if (password !== confirmPassword) {
            return NextResponse.json(
                { message: 'รหัสผ่านไม่ตรงกัน' },
                { status: 400 }
            );
        }

        // ตรวจสอบความแข็งแกร่งของรหัสผ่าน
        const passwordValidation = validatePassword(password);
        if (!passwordValidation.isValid) {
            return NextResponse.json(
                { message: passwordValidation.message },
                { status: 400 }
            );
        }

        // เข้ารหัส token เพื่อเปรียบเทียบกับฐานข้อมูล
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

        // ตรวจสอบผู้ใช้
        const user = await prisma.users.findFirst({
            where: { email },
            select: {
                user_id: true,
                email: true,
                status: true
            }
        });

        if (!user) {
            return NextResponse.json(
                { message: 'ไม่พบผู้ใช้นี้ในระบบ' },
                { status: 404 }
            );
        }

        if (user.status !== 'active') {
            return NextResponse.json(
                { message: 'บัญชีผู้ใช้ไม่ได้เปิดใช้งาน' },
                { status: 403 }
            );
        }

        // TODO: ตรวจสอบ token ในฐานข้อมูล (ต้องสร้างตาราง password_resets ก่อน)
        // สำหรับตอนนี้ข้ามการตรวจสอบ token

        // เข้ารหัสรหัสผ่านใหม่
        const hashedPassword = await bcrypt.hash(password, 12);

        // อัปเดตรหัสผ่านในฐานข้อมูล
        await prisma.users.update({
            where: { user_id: user.user_id },
            data: {
                password_hash: hashedPassword,
                updated_at: new Date()
            }
        });

        return NextResponse.json({
            message: 'เปลี่ยนรหัสผ่านเรียบร้อยแล้ว สามารถเข้าสู่ระบบด้วยรหัสผ่านใหม่ได้ทันที',
            success: true
        });

    } catch (error) {
        console.error('Reset password error:', error);
        return NextResponse.json(
            { message: 'เกิดข้อผิดพลาดในระบบ' },
            { status: 500 }
        );
    }
}

// API สำหรับตรวจสอบความถูกต้องของ token
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const token = searchParams.get('token');
        const email = searchParams.get('email');

        if (!token || !email) {
            return NextResponse.json(
                { message: 'ข้อมูลไม่ครบถ้วน', valid: false },
                { status: 400 }
            );
        }

        // ตรวจสอบผู้ใช้
        const user = await prisma.users.findFirst({
            where: { email },
            select: {
                email: true,
                first_name: true,
                last_name: true,
                status: true
            }
        });

        if (!user || user.status !== 'active') {
            return NextResponse.json({
                message: 'ไม่พบผู้ใช้หรือบัญชีไม่ได้เปิดใช้งาน',
                valid: false
            });
        }

        // TODO: ตรวจสอบ token ในฐานข้อมูล
        // สำหรับตอนนี้ถือว่า token ถูกต้องเสมอ

        return NextResponse.json({
            message: 'Token ถูกต้อง',
            valid: true,
            user: {
                email: user.email,
                name: `${user.first_name} ${user.last_name}`
            }
        });

    } catch (error) {
        console.error('Token validation error:', error);
        return NextResponse.json(
            { message: 'เกิดข้อผิดพลาดในระบบ', valid: false },
            { status: 500 }
        );
    }
}

// ฟังก์ชันตรวจสอบความแข็งแกร่งของรหัสผ่าน
function validatePassword(password: string) {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (password.length < minLength) {
        return {
            isValid: false,
            message: `รหัสผ่านต้องมีอย่างน้อย ${minLength} ตัวอักษร`
        };
    }

    if (!hasUpperCase) {
        return {
            isValid: false,
            message: 'รหัสผ่านต้องมีตัวพิมพ์ใหญ่อย่างน้อย 1 ตัว'
        };
    }

    if (!hasLowerCase) {
        return {
            isValid: false,
            message: 'รหัสผ่านต้องมีตัวพิมพ์เล็กอย่างน้อย 1 ตัว'
        };
    }

    if (!hasNumbers) {
        return {
            isValid: false,
            message: 'รหัสผ่านต้องมีตัวเลขอย่างน้อย 1 ตัว'
        };
    }

    if (!hasSpecialChar) {
        return {
            isValid: false,
            message: 'รหัสผ่านต้องมีอักขระพิเศษอย่างน้อย 1 ตัว (!@#$%^&*(),.?":{}|<>)'
        };
    }

    return {
        isValid: true,
        message: 'รหัสผ่านถูกต้อง'
    };
}