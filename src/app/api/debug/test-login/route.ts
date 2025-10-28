import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
    try {
        const { identifier, password, type } = await request.json();

        console.log("🔐 Test login with:", { identifier, type, hasPassword: !!password });

        let user;

        if (type === 'username') {
            // ค้นหาด้วย username (สำหรับ admin เท่านั้น)
            user = await prisma.users.findFirst({
                where: {
                    username: identifier,
                    OR: [
                        { role: 'admin' },
                        { role: 'super_admin' }
                    ]
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
        }

        if (!user) {
            return NextResponse.json({
                success: false,
                error: "User not found",
                details: `No user found with ${type}: ${identifier}`
            });
        }

        console.log("✅ User found:", {
            id: user.user_id.toString(),
            username: user.username,
            role: user.role,
            status: user.status
        });

        // ตรวจสอบสถานะผู้ใช้
        if (user.status !== 'active') {
            return NextResponse.json({
                success: false,
                error: "User account suspended",
                details: `User status: ${user.status}`
            });
        }

        // ตรวจสอบรหัสผ่าน
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);

        if (!isPasswordValid) {
            return NextResponse.json({
                success: false,
                error: "Invalid password",
                details: "Password does not match"
            });
        }

        return NextResponse.json({
            success: true,
            message: "Login test successful",
            user: {
                id: user.user_id.toString(),
                username: user.username,
                role: user.role,
                name: `${user.first_name} ${user.last_name}`.trim() || user.username
            }
        });

    } catch (error) {
        console.error("Test login error:", error);
        return NextResponse.json({
            success: false,
            error: "Test login failed",
            details: error instanceof Error ? error.message : "Unknown error"
        }, { status: 500 });
    }
}