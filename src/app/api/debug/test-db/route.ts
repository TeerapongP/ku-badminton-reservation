import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
    try {
        console.log("🔍 Testing database connection...");

        // ทดสอบ connection
        await prisma.$connect();
        console.log("✅ Database connected successfully");

        // ทดสอบ query users
        const userCount = await prisma.users.count();
        console.log("✅ User count:", userCount);

        // ทดสอบ query admin users
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
            },
            take: 5
        });

        console.log("✅ Admin users found:", adminUsers.length);

        return NextResponse.json({
            success: true,
            message: "Database test successful",
            data: {
                totalUsers: userCount,
                adminUsers: adminUsers.map(user => ({
                    id: user.user_id.toString(),
                    username: user.username,
                    role: user.role,
                    status: user.status
                }))
            }
        });

    } catch (error) {
        console.error("❌ Database test error:", error);
        return NextResponse.json({
            success: false,
            error: "Database test failed",
            details: error instanceof Error ? error.message : "Unknown error"
        }, { status: 500 });
    }
}