import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/Auth";

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        return NextResponse.json({
            success: true,
            session: session,
            hasSession: !!session,
            user: session?.user || null,
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