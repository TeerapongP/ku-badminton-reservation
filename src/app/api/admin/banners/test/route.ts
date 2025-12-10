import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { PrismaClient } from "@prisma/client";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

const prisma = new PrismaClient();

// GET - ทดสอบการเชื่อมต่อ database และสิทธิ์
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        // ตรวจสอบ session
        if (!session?.user?.id) {
            return NextResponse.json({
                success: false,
                error: "ไม่ได้รับอนุญาต - ไม่มี session",
                debug: {
                    session: !!session,
                    user: !!session?.user,
                    userId: session?.user?.id
                }
            }, { status: 401 });
        }

        // ตรวจสอบสิทธิ์
        const userRole = session.user.role;
        if (!['admin', 'super_admin'].includes(userRole ?? "")) {
            return NextResponse.json({
                success: false,
                error: `ไม่มีสิทธิ์เข้าถึง - role: ${userRole}`,
                debug: {
                    userRole,
                    allowedRoles: ['admin', 'super_admin'],
                    hasPermission: ['admin', 'super_admin'].includes(userRole ?? "")
                }
            }, { status: 403 });
        }

        // ทดสอบการเชื่อมต่อ database
        try {
            await prisma.$connect();

            // ทดสอบว่า table banners มีอยู่หรือไม่
            const tableExists = await prisma.$queryRaw`
        SELECT COUNT(*) as count 
        FROM information_schema.tables 
        WHERE table_schema = DATABASE() 
        AND table_name = 'banners'
      `;

            return NextResponse.json({
                success: true,
                message: "ทดสอบสำเร็จ",
                debug: {
                    session: {
                        userId: session.user.id,
                        role: userRole,
                        username: session.user.username
                    },
                    database: {
                        connected: true,
                        tableExists: tableExists,
                    }
                }
            });

        } catch (dbError) {
            return NextResponse.json({
                success: false,
                error: "เกิดข้อผิดพลาดในการเชื่อมต่อ database",
                debug: {
                    dbError: dbError instanceof Error ? dbError.message : String(dbError)
                }
            }, { status: 500 });
        }

    } catch (error) {
        console.error("Test API error:", error);
        return NextResponse.json({
            success: false,
            error: "เกิดข้อผิดพลาดในการทดสอบ",
            debug: {
                error: error instanceof Error ? error.message : String(error)
            }
        }, { status: 500 });
    } finally {
        await prisma.$disconnect();
    }
}