import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';
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

        // ตรวจสอบว่ามี admin อยู่แล้วหรือไม่
        const existingAdmin = await prisma.users.findFirst({
            where: { role: 'admin' }
        });

        if (existingAdmin) {
            return NextResponse.json(
                { success: false, error: "มี Admin อยู่ในระบบแล้ว" },
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

        // สร้าง admin user (ใช้ username login)
        const adminUser = await prisma.users.create({
            data: {
                username,
                password_hash,
                email,
                first_name,
                last_name,
                role: 'admin',
                status: 'active',
                membership: 'member'
            }
        });

        return NextResponse.json({
            success: true,
            message: "สร้าง Admin สำเร็จ",
            admin: {
                id: adminUser.user_id.toString(),
                username: adminUser.username,
                email: adminUser.email,
                name: `${adminUser.first_name} ${adminUser.last_name}`
            }
        });

    } catch (error) {
        console.error("Create admin error:", error);
        return NextResponse.json(
            { success: false, error: "เกิดข้อผิดพลาดในการสร้าง Admin" },
            { status: 500 }
        );
    } finally {
        await prisma.$disconnect();
    }
}