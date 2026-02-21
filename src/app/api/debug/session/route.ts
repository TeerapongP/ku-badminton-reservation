// src/app/api/auth/debug-session/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/Auth";

export async function GET() {
    // [SECURITY FIX: OWASP A05] - ปิดใน production เด็ดขาด
    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    try {
        const session = await getServerSession(authOptions);

        // [SECURITY FIX: OWASP A01] - เฉพาะ super_admin เท่านั้น
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (session.user.role !== 'super_admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // [SECURITY FIX: OWASP A01] - Return เฉพาะข้อมูลที่จำเป็น ไม่ return id จริง
        return NextResponse.json({
            success: true,
            hasSession: true,
            session: {
                user: {
                    username: session.user.username,
                    role:     session.user.role,
                }
            },
        });

    } catch (error) {
        // [SECURITY FIX: OWASP A05] - Generic error เท่านั้น ไม่ return details
        console.error("Debug session error:", error instanceof Error ? error.message : 'Unknown');
        return NextResponse.json(
            { success: false, error: "Failed to get session" },
            { status: 500 }
        );
    }
}