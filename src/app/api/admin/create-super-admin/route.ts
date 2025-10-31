import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { username, password, email, first_name, last_name } = body;

        if (!username || !password || !email || !first_name || !last_name) {
            return NextResponse.json(
                { success: false, error: "ข้อมูลไม่ครบถ้วน" },
                { status: 400 }
            );
        }

        // ตรวจสอบ username ซ้ำ
        const existingUser = await prisma.users.findFirst({
            where: {
                OR: [
                    { username },
                    { email }
                ]
            }
        });

        if (existingUser) {
            return NextResponse.json(
                { success: false, error: "Username หรือ Email ซ้ำในระบบ" },
                { status: 400 }
            );
        }

        // Hash password
        const password_hash = await bcrypt.hash(password, 12);

        // สร้าง super_admin user
        const superAdminUser = await prisma.users.create({
            data: {
                username,
                password_hash,
                email,
                first_name,
                last_name,
                role: 'super_admin',
                status: 'active',
                membership: 'member'
            }
        });

        return NextResponse.json({
            success: true,
            message: "สร้าง Super Admin สำเร็จ",
            admin: {
                id: superAdminUser.user_id.toString(),
                username: superAdminUser.username,
                email: superAdminUser.email,
                name: `${superAdminUser.first_name} ${superAdminUser.last_name}`,
                role: superAdminUser.role
            }
        });

    } catch (error) {
        console.error("Create super admin error:", error);
        return NextResponse.json(
            { success: false, error: "เกิดข้อผิดพลาดในการสร้าง Super Admin" },
            { status: 500 }
        );
    } finally {
        await prisma.$disconnect();
    }
}

// GET method สำหรับตรวจสอบว่ามี super_admin อยู่แล้วหรือไม่
export async function GET() {
    try {
        const superAdminCount = await prisma.users.count({
            where: { role: 'super_admin' }
        });

        const adminCount = await prisma.users.count({
            where: { role: 'admin' }
        });

        return NextResponse.json({
            success: true,
            superAdminExists: superAdminCount > 0,
            adminExists: adminCount > 0,
            superAdminCount,
            adminCount
        });

    } catch (error) {
        console.error("Check admin error:", error);
        return NextResponse.json(
            { success: false, error: "เกิดข้อผิดพลาดในการตรวจสอบ" },
            { status: 500 }
        );
    } finally {
        await prisma.$disconnect();
    }
}