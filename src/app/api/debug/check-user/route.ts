import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
    try {
        // ค้นหา admin user
        const adminUser = await prisma.users.findFirst({
            where: {
                username: 'admin'
            },
            select: {
                user_id: true,
                username: true,
                password_hash: true,
                email: true,
                first_name: true,
                last_name: true,
                role: true,
                status: true,
            }
        });

        if (!adminUser) {
            return NextResponse.json({
                success: false,
                message: "ไม่พบ admin user"
            });
        }

        // ตรวจสอบ password
        const testPassword = 'admin123';
        const isPasswordValid = adminUser.password_hash ?
            await bcrypt.compare(testPassword, adminUser.password_hash) : false;

        return NextResponse.json({
            success: true,
            user: {
                id: adminUser.user_id,
                username: adminUser.username,
                email: adminUser.email,
                name: `${adminUser.first_name} ${adminUser.last_name}`,
                role: adminUser.role,
                status: adminUser.status,
                hasPasswordHash: !!adminUser.password_hash,
                passwordHashLength: adminUser.password_hash?.length || 0,
                isPasswordValid
            }
        });

    } catch (error) {
        console.error("Debug check user error:", error);
        return NextResponse.json({
            success: false,
            error: "เกิดข้อผิดพลาด",
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    } finally {
        await prisma.$disconnect();
    }
}