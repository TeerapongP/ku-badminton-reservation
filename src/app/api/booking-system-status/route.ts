import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DEFAULT_STATUS = {
    isOpen:        true,
    openedBy:      'system',
    openedAt:      new Date().toISOString(),
    businessHours: { start: 8, end: 20 },
};

function getThailandHour(): number {
    return parseInt(
        new Intl.DateTimeFormat('en-US', {
            timeZone: 'Asia/Bangkok',
            hour:     'numeric',
            hour12:   false,
        }).format(new Date()),
        10
    );
}

// Whitelist เฉพาะ fields ที่รู้จัก ป้องกัน inject ค่าแปลกๆ จาก DB
function safeParseStatus(value: string): Partial<typeof DEFAULT_STATUS> {
    try {
        const parsed = JSON.parse(value);
        return {
            ...(typeof parsed.isOpen   === 'boolean' ? { isOpen:   parsed.isOpen }   : {}),
            ...(typeof parsed.openedBy === 'string'  ? { openedBy: parsed.openedBy } : {}),
            ...(typeof parsed.openedAt === 'string'  ? { openedAt: parsed.openedAt } : {}),
            ...(parsed.businessHours
                ? {
                    businessHours: {
                        start: Number(parsed.businessHours.start ?? 8),
                        end:   Number(parsed.businessHours.end   ?? 20),
                    }
                }
                : {}),
        };
    } catch {
        return {};
    }
}

/**
 * Public API สำหรับเช็คสถานะระบบการจอง (ไม่ต้อง login)
 */
export async function GET() {
    try {
        const systemStatus = await prisma.system_settings.findFirst({
            where: { key: 'booking_system_status' }
        });

        const status = {
            ...DEFAULT_STATUS,
            ...(systemStatus ? safeParseStatus(systemStatus.value) : {}),
        };

        const hour            = getThailandHour();
        const isBusinessHours = hour >= status.businessHours.start && hour < status.businessHours.end;

        return NextResponse.json({
            success: true,
            data: {
                ...status,
                currentHour:     hour,
                isBusinessHours,
                effectiveStatus: status.isOpen && isBusinessHours,
            }
        });

    } catch (error) {
        console.error("Error fetching booking system status:", error);

        const hour            = getThailandHour();
        const isBusinessHours = hour >= 8 && hour < 20;

        // return 200 พร้อม fallback แต่บอก client ว่าใช้ fallback อยู่
        return NextResponse.json({
            success:  true,
            fallback: true,
            data: {
                ...DEFAULT_STATUS,
                currentHour:     hour,
                isBusinessHours,
                effectiveStatus: isBusinessHours,
            }
        });
    }
}