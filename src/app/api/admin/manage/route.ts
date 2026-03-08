import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/Auth';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { decode } from '@/lib/Cryto';

async function resolveRole(encrypted: string | undefined | null): Promise<string | null> {
    if (!encrypted) return null;

    // Check if role is already plaintext
    const plainRoles = ['admin', 'super_admin', 'student', 'staff', 'guest'];
    if (plainRoles.includes(encrypted)) {
        return encrypted;
    }

    // Try to decode if encrypted
    try {
        return await decode(encrypted);
    } catch (error) {
        console.error('[admin/manage] Failed to decode role, using as-is:', error);
        return encrypted;
    }
}

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

        const role = await resolveRole(session?.user?.role);
        if (role !== 'super_admin' && role !== 'admin') {
            console.log("❌ Invalid role:", role);
            return NextResponse.json(
                { success: false, error: `ไม่มีสิทธิ์เข้าถึง - role: ${role || 'undefined'}` },
                { status: 403 }
            );
        }

        console.log(" Access granted for user:", session.user.username);

        console.log("🔍 Querying users...");
        const users = await prisma.users.findMany({
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
            },
            take: 100 // Limit to 100 users for performance
        });

        console.log(" Found users:", users.length);

        return NextResponse.json({
            success: true,
            admins: users.map((user: any) => ({
                id: user.user_id.toString(),
                username: user.username,
                email: user.email,
                name: `${user.first_name} ${user.last_name}`,
                role: user.role,
                status: user.status,
                createdAt: user.registered_at,
                lastLoginAt: user.last_login_at
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

        const sessionRole = await resolveRole(session?.user?.role);
        if (!session?.user || sessionRole !== 'super_admin') {
            return NextResponse.json(
                { success: false, error: "ไม่มีสิทธิ์เข้าถึง" },
                { status: 403 }
            );
        }

        const body = await req.json();
        const { username, password, email, first_name, last_name, role: userRole } = body;

        if (!username || !password || !email || !first_name || !last_name || !userRole) {
            return NextResponse.json(
                { success: false, error: "ข้อมูลไม่ครบถ้วน" },
                { status: 400 }
            );
        }

        // ตรวจสอบ role ที่อนุญาต
        if (!['admin', 'super_admin'].includes(userRole)) {
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
                role: userRole,
                status: 'active',
                membership: 'member'
            }
        });

        return NextResponse.json({
            success: true,
            message: `สร้าง ${userRole} สำเร็จ`,
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

        const sessionRole = await resolveRole(session?.user?.role);
        if (!session?.user || sessionRole !== 'super_admin') {
            return NextResponse.json(
                { success: false, error: "ไม่มีสิทธิ์เข้าถึง" },
                { status: 403 }
            );
        }

        const body = await req.json();
        const { id, username, email, first_name, last_name, role: userRole, status, password } = body;

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

        // Get target user
        const targetUser = await prisma.users.findUnique({
            where: { user_id: BigInt(id) },
            select: { role: true, user_id: true }
        });

        if (!targetUser) {
            return NextResponse.json(
                { success: false, error: "ไม่พบผู้ใช้" },
                { status: 404 }
            );
        }

        // Prevent role escalation attacks
        const ADMIN_ROLES = ['admin', 'super_admin'];
        const isTargetAdmin = ADMIN_ROLES.includes(targetUser.role);
        const isNewRoleAdmin = userRole && ADMIN_ROLES.includes(userRole);

        // Only super_admin can change admin roles
        if (isTargetAdmin || isNewRoleAdmin) {
            // Count remaining super_admins
            const superAdminCount = await prisma.users.count({
                where: {
                    role: 'super_admin',
                    status: 'active'
                }
            });

            // Prevent removing last super_admin
            if (superAdminCount <= 1 && targetUser.role === 'super_admin' &&
                (userRole !== 'super_admin' || status === 'inactive')) {
                return NextResponse.json(
                    { success: false, error: "ไม่สามารถลบ super_admin คนสุดท้ายได้" },
                    { status: 400 }
                );
            }
        }

        const updateData: any = {};

        if (username) updateData.username = username;
        if (email) updateData.email = email;
        if (first_name) updateData.first_name = first_name;
        if (last_name) updateData.last_name = last_name;
        if (userRole && ['admin', 'super_admin'].includes(userRole)) updateData.role = userRole;
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

        const sessionRole = await resolveRole(session?.user?.role);
        if (!session?.user || sessionRole !== 'super_admin') {
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