import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/Auth';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

// GET - ดึงรายการ admin users
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        console.log("🔍 Admin manage API - Session debug:", {
            hasSession: !!session,
            hasUser: !!session?.user,
            userRole: session?.user?.role,
            userId: session?.user?.id,
            username: session?.user?.username
        });

        if (!session?.user) {
            console.log("❌ No session or user found");
            return NextResponse.json(
                { success: false, error: "ไม่มีสิทธิ์เข้าถึง - ไม่พบ session" },
                { status: 403 }
            );
        }

        if (session.user.role !== 'super_admin') {
            console.log("❌ Invalid role:", session.user.role);
            return NextResponse.json(
                { success: false, error: `ไม่มีสิทธิ์เข้าถึง - role: ${session.user.role || 'undefined'}` },
                { status: 403 }
            );
        }

        console.log("✅ Access granted for user:", session.user.username);

        console.log("🔍 Querying admin users...");
        const adminUsers = await prisma.users.findMany({
            where: {
                OR: [
                    { role: 'admin' },
                    { role: 'super_admin' }
                ]
            },
            select: {
                user_id: true,
                username: true,
                email: true,
                first_name: true,
                last_name: true,
                role: true,
                status: true,
                registered_at: true,
                last_login_at: true
            },
            orderBy: {
                registered_at: 'desc'
            }
        });

        console.log("✅ Found admin users:", adminUsers.length);

        return NextResponse.json({
            success: true,
            admins: adminUsers.map((admin: { user_id: { toString: () => any; }; username: any; email: any; first_name: any; last_name: any; role: any; status: any; registered_at: any; last_login_at: any; }) => ({
                id: admin.user_id.toString(),
                username: admin.username,
                email: admin.email,
                name: `${admin.first_name} ${admin.last_name}`,
                role: admin.role,
                status: admin.status,
                createdAt: admin.registered_at,
                lastLoginAt: admin.last_login_at
            }))
        });

    } catch (error) {
        console.error("❌ Get admin users error:", error);
        console.error("❌ Error details:", {
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : 'No stack trace',
            name: error instanceof Error ? error.name : 'Unknown'
        });

        return NextResponse.json(
            {
                success: false,
                error: "เกิดข้อผิดพลาดในการดึงข้อมูล",
                details: error instanceof Error ? error.message : "Unknown error"
            },
            { status: 500 }
        );
    }
}

// POST - สร้าง admin user ใหม่
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user || (session.user.role !== 'super_admin' && session.user.role !== 'super_admin')) {
            return NextResponse.json(
                { success: false, error: "ไม่มีสิทธิ์เข้าถึง" },
                { status: 403 }
            );
        }

        const body = await req.json();
        const { username, password, email, first_name, last_name, role } = body;

        if (!username || !password || !email || !first_name || !last_name || !role) {
            return NextResponse.json(
                { success: false, error: "ข้อมูลไม่ครบถ้วน" },
                { status: 400 }
            );
        }

        // ตรวจสอบ role ที่อนุญาต
        if (!['admin', 'super_admin', 'super_admin'].includes(role)) {
            return NextResponse.json(
                { success: false, error: "Role ไม่ถูกต้อง" },
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

        // สร้าง admin user
        const newAdmin = await prisma.users.create({
            data: {
                username,
                password_hash,
                email,
                first_name,
                last_name,
                role,
                status: 'active',
                membership: 'member'
            }
        });

        return NextResponse.json({
            success: true,
            message: `สร้าง ${role} สำเร็จ`,
            admin: {
                id: newAdmin.user_id.toString(),
                username: newAdmin.username,
                email: newAdmin.email,
                name: `${newAdmin.first_name} ${newAdmin.last_name}`,
                role: newAdmin.role
            }
        });

    } catch (error) {
        console.error("Create admin error:", error);
        return NextResponse.json(
            { success: false, error: "เกิดข้อผิดพลาดในการสร้าง Admin" },
            { status: 500 }
        );
    }
}

// PUT - อัปเดต admin user
export async function PUT(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user || (session.user.role !== 'super_admin' && session.user.role !== 'super_admin')) {
            return NextResponse.json(
                { success: false, error: "ไม่มีสิทธิ์เข้าถึง" },
                { status: 403 }
            );
        }

        const body = await req.json();
        const { id, username, email, first_name, last_name, role, status, password } = body;

        if (!id) {
            return NextResponse.json(
                { success: false, error: "ไม่พบ ID ผู้ใช้" },
                { status: 400 }
            );
        }

        // ตรวจสอบว่าไม่ใช่การแก้ไขตัวเอง
        if (session.user.id === id) {
            return NextResponse.json(
                { success: false, error: "ไม่สามารถแก้ไขข้อมูลตัวเองได้" },
                { status: 400 }
            );
        }

        const updateData: any = {};

        if (username) updateData.username = username;
        if (email) updateData.email = email;
        if (first_name) updateData.first_name = first_name;
        if (last_name) updateData.last_name = last_name;
        if (role && ['admin', 'super_admin', 'super_admin'].includes(role)) updateData.role = role;
        if (status && ['active', 'inactive', 'suspended'].includes(status)) updateData.status = status;

        if (password) {
            updateData.password_hash = await bcrypt.hash(password, 12);
        }

        const updatedAdmin = await prisma.users.update({
            where: { user_id: parseInt(id) },
            data: updateData,
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
            message: "อัปเดตข้อมูลสำเร็จ",
            admin: {
                id: updatedAdmin.user_id.toString(),
                username: updatedAdmin.username,
                email: updatedAdmin.email,
                name: `${updatedAdmin.first_name} ${updatedAdmin.last_name}`,
                role: updatedAdmin.role,
                status: updatedAdmin.status
            }
        });

    } catch (error) {
        console.error("Update admin error:", error);
        return NextResponse.json(
            { success: false, error: "เกิดข้อผิดพลาดในการอัปเดต" },
            { status: 500 }
        );
    }
}

// DELETE - ลบ admin user
export async function DELETE(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user || (session.user.role !== 'super_admin' && session.user.role !== 'super_admin')) {
            return NextResponse.json(
                { success: false, error: "ไม่มีสิทธิ์เข้าถึง" },
                { status: 403 }
            );
        }

        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json(
                { success: false, error: "ไม่พบ ID ผู้ใช้" },
                { status: 400 }
            );
        }

        // ตรวจสอบว่าไม่ใช่การลบตัวเอง
        if (session.user.id === id) {
            return NextResponse.json(
                { success: false, error: "ไม่สามารถลบบัญชีตัวเองได้" },
                { status: 400 }
            );
        }

        await prisma.users.delete({
            where: { user_id: parseInt(id) }
        });

        return NextResponse.json({
            success: true,
            message: "ลบ Admin สำเร็จ"
        });

    } catch (error) {
        console.error("Delete admin error:", error);
        return NextResponse.json(
            { success: false, error: "เกิดข้อผิดพลาดในการลบ" },
            { status: 500 }
        );
    }
}