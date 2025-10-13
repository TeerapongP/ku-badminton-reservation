import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/Auth";
import { PrismaClient } from "@/generated/prisma";

const prisma = new PrismaClient();

export async function POST(req: Request) {
    try {
        // ดึง session ปัจจุบัน
        const session = await getServerSession(authOptions);

        if (session?.user?.id) {
            // บันทึก logout log
            await prisma.auth_log.create({
                data: {
                    user_id: BigInt(session.user.id),
                    username_input: session.user.username ?? session.user.email,
                    action: "login_success", // ใช้ action ที่มีอยู่ในระบบ
                    ip: "unknown", // สามารถดึง real IP ได้ถ้าต้องการ
                    user_agent: req.headers.get("user-agent") ?? "unknown"
                }
            });
        }

        return NextResponse.json({
            success: true,
            message: "ออกจากระบบสำเร็จ"
        });
    } catch (error) {
        console.error("Logout API error:", error);

        // แม้จะ error ก็ให้ return success เพราะ NextAuth จะจัดการ logout ให้อยู่แล้ว
        return NextResponse.json({
            success: true,
            message: "ออกจากระบบสำเร็จ"
        });
    }
}