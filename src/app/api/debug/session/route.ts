import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/Auth";

export async function GET() {
    try {
        const session = await getServerSession(authOptions);

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
