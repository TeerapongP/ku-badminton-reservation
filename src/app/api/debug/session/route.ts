import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/Auth";

export async function GET() {
    // [SECURITY FIX] - Disable in production
    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json(
            { error: 'Not found' },
            { status: 404 }
        );
    }

    try {
        // [SECURITY FIX] - Require super_admin authentication even in development
        const session = await getServerSession(authOptions);
        
        if (!session || session.user.role !== 'super_admin') {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        let maskedUserId = null;
        return NextResponse.json({
            success: true,
            session: {
                ...session,
                user: session?.user ? {
                    ...session.user,
                    id: maskedUserId
                } : null
            },
            hasSession: !!session,
            user: session?.user ? {
                ...session.user,
                id: maskedUserId
            } : null,
            message: "Session retrieved successfully"
        });

    } catch (error) {
        console.error("Debug session error:", error);
        return NextResponse.json({
            success: false,
            error: "Failed to get session",
            details: error instanceof Error ? error.message : "Unknown error"
        }, { status: 500 });
    }
}
