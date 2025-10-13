import NextAuth from "next-auth";
import { authOptions } from "@/lib/Auth";
import { NextRequest, NextResponse } from "next/server";

// สร้าง NextAuth handler
const handler = NextAuth(authOptions);

// GET handler สำหรับ NextAuth requests (session, providers, etc.)
async function GET(req: NextRequest, context: any) {
    try {
        // Log authentication requests สำหรับ debugging
        const url = new URL(req.url);
        const action = url.pathname.split('/').pop() || 'unknown';

        if (process.env.NODE_ENV === 'development') {
            console.log(`NextAuth GET: ${action}`, {
                url: req.url,
                timestamp: new Date().toISOString()
            });
        }

        return await handler(req, context);
    } catch (error) {
        console.error("NextAuth GET Error:", {
            error: error instanceof Error ? error.message : error,
            url: req.url,
            timestamp: new Date().toISOString()
        });

        return NextResponse.json(
            {
                error: "Authentication service error",
                message: "เกิดข้อผิดพลาดในระบบยืนยันตัวตน"
            },
            { status: 500 }
        );
    }
}

// POST handler สำหรับ NextAuth requests (signin, signout, callback)
async function POST(req: NextRequest, context: any) {
    try {
        // Log authentication attempts
        const url = new URL(req.url);
        const action = url.pathname.split('/').pop() || 'unknown';

        if (process.env.NODE_ENV === 'development') {
            console.log(`NextAuth POST: ${action}`, {
                url: req.url,
                timestamp: new Date().toISOString()
            });
        }

        return await handler(req, context);
    } catch (error) {
        console.error("NextAuth POST Error:", {
            error: error instanceof Error ? error.message : error,
            url: req.url,
            timestamp: new Date().toISOString()
        });

        return NextResponse.json(
            {
                error: "Authentication service error",
                message: "เกิดข้อผิดพลาดในการเข้าสู่ระบบ"
            },
            { status: 500 }
        );
    }
}

export { GET, POST };

// Export authOptions สำหรับใช้ในที่อื่น (optional)
export { authOptions } from "@/lib/Auth";

// Export type definitions สำหรับ TypeScript
export type { NextAuthOptions } from "next-auth";