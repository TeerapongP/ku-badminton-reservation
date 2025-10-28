import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
    try {
        // ตรวจสอบ users ทั้งหมด
        const users = await prisma.users.findMany({
            select: {
                user_id: true,
                username: true,
                role: true,
                status: true,
                student_id: true,
                national_id: true,
                first_name: true,
                last_name: true,
            },
            take: 10 // จำกัดแค่ 10 คน
        });

        // ตรวจสอบ admin users
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
                role: true,
                status: true,
            }
        });

        // แปลง BigInt เป็น string
        const serializedUsers = users.map(user => ({
            ...user,
            user_id: user.user_id.toString()
        }));

        const serializedAdminUsers = adminUsers.map(user => ({
            ...user,
            user_id: user.user_id.toString()
        }));

        return NextResponse.json({
            success: true,
            totalUsers: users.length,
            users: serializedUsers,
            adminUsers: serializedAdminUsers,
            message: "Users retrieved successfully"
        });

    } catch (error) {
        console.error("Debug check users error:", error);
        return NextResponse.json({
            success: false,
            error: "Failed to check users",
            details: error instanceof Error ? error.message : "Unknown error"
        }, { status: 500 });
    }
}