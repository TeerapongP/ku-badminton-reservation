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

// GET — admin only
export async function GET() {
    // A10 — ครอบ try/catch ตั้งแต่ต้น รวม getServerSession ด้วย
    try {
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
        // A09 — log เฉพาะ message ไม่ expose stack trace ออก response
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[GET /scheduled-tasks][${new Date().toISOString()}]`, message);
        return NextResponse.json(
            { success: false, error: "เกิดข้อผิดพลาดในการดึงสถานะ scheduled tasks" },
            { status: 500 }
        );
    }
}

// POST — cron secret only
export async function POST(request: NextRequest) {
    // A10 — ครอบ try/catch ตั้งแต่ต้น
    try {
        const cronSecret = process.env.CRON_SECRET;

        if (!cronSecret || cronSecret === 'default-secret' || cronSecret.length < 32) {
            console.error(`[POST /scheduled-tasks][${new Date().toISOString()}] CRON_SECRET not properly configured`);
            return NextResponse.json(
                { success: false, error: "Service misconfigured" },
                { status: 500 }
            );
        }

        // A01 — ตรวจสอบ Authorization header
        const authHeader = request.headers.get('authorization');
        if (authHeader !== `Bearer ${cronSecret}`) {
            // A09 — log การพยายาม access ที่ไม่ได้รับอนุญาต
            const clientIP = request.headers.get('x-forwarded-for') ?? 'unknown';
            console.warn(`[POST /scheduled-tasks][${new Date().toISOString()}] Unauthorized access attempt from IP: ${clientIP}`);
            return NextResponse.json(
                { success: false, error: "ไม่ได้รับอนุญาต" },
                { status: 401 }
            );
        }

        // A01 — ตรวจสอบ IP allowlist (optional แต่แนะนำ)
        const allowedIPs = process.env.ALLOWED_CRON_IPS?.split(',').map(ip => ip.trim()) ?? [];
        if (allowedIPs.length > 0) {
            const clientIP = request.headers.get('x-forwarded-for') ?? '';
            const isAllowed = allowedIPs.some(ip => clientIP.includes(ip));
            if (!isAllowed) {
                console.warn(`[POST /scheduled-tasks][${new Date().toISOString()}] IP not in allowlist: ${clientIP}`);
                return NextResponse.json(
                    { success: false, error: "ไม่ได้รับอนุญาต" },
                    { status: 403 }
                );
            }
        }

        await scheduledTasks.runNow();

        const status = await scheduledTasks.getCurrentStatus();

        return NextResponse.json({
            success: true,
            data:    status,
            message: "Scheduled task executed successfully",
        });

    } catch (error) {
        // A09 — log เฉพาะ message ไม่ expose stack trace ออก response
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[POST /scheduled-tasks][${new Date().toISOString()}]`, message);
        return NextResponse.json(
            { success: false, error: "เกิดข้อผิดพลาดในการเรียกใช้ scheduled task" },
            { status: 500 }
        );
    }
}