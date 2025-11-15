import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/Auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
    try {
        // ตรวจสอบ session
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json(
                { success: false, error: 'ไม่มีสิทธิ์เข้าถึง' },
                { status: 401 }
            );
        }

        const { currentPassword, newPassword } = await request.json();

        // Validate
        if (!currentPassword || !newPassword) {
            return NextResponse.json(
                { success: false, error: 'กรุณากรอกข้อมูลให้ครบถ้วน' },
                { status: 400 }
            );
        }

        if (newPassword.length < 6) {
            return NextResponse.json(
                { success: false, error: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' },
                { status: 400 }
            );
        }

        if (!/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
            return NextResponse.json(
                { success: false, error: 'รหัสผ่านต้องมีทั้งตัวอักษรและตัวเลข' },
                { status: 400 }
            );
        }

        // ดึงข้อมูล user
        const user = await prisma.users.findUnique({
            where: { user_id: BigInt(session.user.id) },
            select: {
                user_id: true,
                password_hash: true,
                username: true,
                last_login_at: true
            }
        });

        if (!user) {
            return NextResponse.json(
                { success: false, error: 'ไม่พบข้อมูลผู้ใช้' },
                { status: 404 }
            );
        }

        // ตรวจสอบรหัสผ่านปัจจุบัน
        const isPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
        if (!isPasswordValid) {
            return NextResponse.json(
                { success: false, error: 'รหัสผ่านปัจจุบันไม่ถูกต้อง' },
                { status: 400 }
            );
        }

        // เข้ารหัสรหัสผ่านใหม่
        const hashedPassword = await bcrypt.hash(newPassword, 12);

        // อัปเดตรหัสผ่านและ last_login_at (ถ้ายังไม่เคยมี)
        await prisma.users.update({
            where: { user_id: user.user_id },
            data: {
                password_hash: hashedPassword,
                // อัปเดต last_login_at ถ้ายังเป็น null (first login)
                ...(user.last_login_at === null ? { last_login_at: new Date() } : {}),
                updated_at: new Date()
            }
        });

        // บันทึก log
        await prisma.auth_log.create({
            data: {
                user_id: user.user_id,
                username_input: user.username,
                action: 'login_success',
                ip: request.headers.get('x-forwarded-for') || 'unknown',
                user_agent: request.headers.get('user-agent') || 'unknown'
            }
        });

        return NextResponse.json({
            success: true,
            message: 'เปลี่ยนรหัสผ่านสำเร็จ'
        });

    } catch (error: any) {
        console.error('Reset password error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน' },
            { status: 500 }
        );
    }
}
