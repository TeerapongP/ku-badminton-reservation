import { scheduledTasks } from "@/lib/scheduled-tasks";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/Auth";

function getThailandTime(): string {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Bangkok',
        year:     'numeric',
        month:    '2-digit',
        day:      '2-digit',
        hour:     '2-digit',
        minute:   '2-digit',
        second:   '2-digit',
        hour12:   false,
    }).format(new Date());
}

//  GET — admin only
export async function GET() {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        return NextResponse.json(
            { success: false, error: 'กรุณาเข้าสู่ระบบ' },
            { status: 401 }
        );
    }

    if (!['admin', 'super_admin'].includes(session.user.role)) {
        return NextResponse.json(
            { success: false, error: 'ไม่มีสิทธิ์เข้าถึง' },
            { status: 403 }
        );
    }

    try {
        const status = await scheduledTasks.getCurrentStatus();

        return NextResponse.json({
            success: true,
            data: {
                ...status,
                currentTime:           getThailandTime(),
                scheduledTasksRunning: true,
            },
            message: "Scheduled tasks status retrieved successfully",
        });

    } catch (error) {
        console.error("Error getting scheduled tasks status:", error);
        return NextResponse.json(
            { success: false, error: "เกิดข้อผิดพลาดในการดึงสถานะ scheduled tasks" },
            { status: 500 }
        );
    }
}

//  POST — cron secret only
export async function POST(request: NextRequest) {
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || cronSecret === 'default-secret' || cronSecret.length < 32) {
        console.error('CRON_SECRET not properly configured - must be at least 32 characters');
        return NextResponse.json(
            { success: false, error: "Service misconfigured" },
            { status: 500 }
        );
    }

    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json(
            { success: false, error: "ไม่ได้รับอนุญาต" },
            { status: 401 }
        );
    }

    try {
        //  เรียก public method แทน bracket notation
        await scheduledTasks.runNow();

        const status = await scheduledTasks.getCurrentStatus();

        return NextResponse.json({
            success: true,
            data:    status,
            message: "Scheduled task executed successfully",
        });

    } catch (error) {
        console.error("Error executing scheduled task:", error);
        return NextResponse.json(
            { success: false, error: "เกิดข้อผิดพลาดในการเรียกใช้ scheduled task" },
            { status: 500 }
        );
    }
}

