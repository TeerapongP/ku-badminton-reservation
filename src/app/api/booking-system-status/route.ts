import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Public API สำหรับเช็คสถานะระบบการจอง (ไม่ต้อง login)
 */
export async function GET(request: NextRequest) {
  try {
    const systemStatus = await prisma.system_settings.findFirst({
      where: { key: 'booking_system_status' }
    });

    let status = {
      isOpen: true,
      openedBy: 'system',
      openedAt: new Date().toISOString(),
      businessHours: { start: 8, end: 20 }
    };

    if (systemStatus) {
      try {
        status = { ...status, ...JSON.parse(systemStatus.value) };
      } catch (parseError) {
        console.error('Error parsing system status:', parseError);
      }
    }

    // เช็ค business hours (เวลาไทย)
    const now = new Date();
    const thailandTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
    const hour = thailandTime.getHours();
    const isBusinessHours = hour >= 8 && hour < 20;

    return NextResponse.json({
      success: true,
      data: {
        ...status,
        currentTime: thailandTime.toISOString(),
        currentHour: hour,
        isBusinessHours,
        effectiveStatus: status.isOpen && isBusinessHours
      }
    });

  } catch (error) {
    console.error("Error fetching booking system status:", error);
    
    // Fallback ถ้า error
    const now = new Date();
    const thailandTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
    const hour = thailandTime.getHours();
    const isBusinessHours = hour >= 8 && hour < 20;

    return NextResponse.json({
      success: true,
      data: {
        isOpen: true,
        openedBy: 'system',
        openedAt: thailandTime.toISOString(),
        businessHours: { start: 8, end: 20 },
        currentTime: thailandTime.toISOString(),
        currentHour: hour,
        isBusinessHours,
        effectiveStatus: isBusinessHours,
        note: 'Using fallback status'
      }
    });
  }
}
