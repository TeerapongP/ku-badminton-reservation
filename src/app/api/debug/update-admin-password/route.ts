import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/Auth';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
    // [SECURITY FIX] - Disable in production
    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json(
            { error: 'Not found' },
            { status: 404 }
        );
    }

    // [SECURITY FIX] - Require super_admin authentication
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'super_admin') {
        return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
        );
    }

    try {
        const body = await req.json();
        const { username = 'admin', password = 'admin123' } = body;

        // ค้นหา user
        const existingUser = await prisma.users.findFirst({
            where: { username }
        });

        if (!existingUser) {
            return NextResponse.json({
                success: false,
                error: "ไม่พบ user"
            });
        }

        // Hash password ใหม่
        const password_hash = await bcrypt.hash(password, 12);

        // อัปเดต password
        const updatedUser = await prisma.users.update({
            where: { user_id: existingUser.user_id },
            data: { password_hash },
            select: {
                user_id: true,
                username: true,
                email: true,
                first_name: true,
                last_name: true,
                role: true,
                status: true
            }
        });

        return NextResponse.json({
            success: true,
            message: "อัปเดต password สำเร็จ",
            user: {
                id: updatedUser.user_id.toString(),
                username: updatedUser.username,
                email: updatedUser.email,
                name: `${updatedUser.first_name} ${updatedUser.last_name}`,
                role: updatedUser.role,
                status: updatedUser.status
            },
            credentials: {
                username,
                password
            }
        });

    } catch (error) {
        console.error("Update admin password error:", error);
        return NextResponse.json({
            success: false,
            error: "เกิดข้อผิดพลาด",
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}