import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/Auth";
import { isAdminControlAllowed, getAdminControlDisabledMessage } from "@/lib/scheduled-tasks";
import { decode } from "@/lib/Cryto";
import { prisma } from "@/lib/prisma";

async function resolveRole(encrypted: string | undefined | null): Promise<string | null> {
  if (!encrypted) return null;
  try {
    return await decode(encrypted);
  } catch {
    console.error('[admin/booking-system] Failed to decode role');
    return null;
  }
}

// GET - ดึงสถานะระบบการจอง
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "ไม่ได้รับอนุญาต" },
        { status: 401 }
      );
    }

    // ตรวจสอบสิทธิ์ admin หรือ super_admin
    const ADMIN_ROLES = new Set(['admin', 'super_admin']);
    const role = await resolveRole(session?.user?.role);
    if (!session?.user || !ADMIN_ROLES.has(role ?? '')) {
      return NextResponse.json(
        { success: false, error: "ไม่มีสิทธิ์เข้าถึง" },
        { status: 403 }
      );
    }

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

      // เช็ค business hours
      const now = new Date();
      const hour = now.getHours();
      let isBusinessHours = hour >= 8 && hour < 20;
      let effectiveStatus = status.isOpen && isBusinessHours;

      // Bypass check if environment variable is set (for testing)
      if (process.env.NEXT_PUBLIC_BYPASS_BUSINESS_HOURS === 'true') {
        isBusinessHours = true;
        effectiveStatus = true;
      }

      return NextResponse.json({
        success: true,
        data: {
          ...status,
          currentTime: now.toISOString(),
          currentHour: hour,
          isBusinessHours,
          effectiveStatus: effectiveStatus
        }
      });

    } catch (dbError) {
      console.error('Database error:', dbError);

      // Fallback ถ้า table ยังไม่มี
      const currentTime = new Date();
      const hour = currentTime.getHours();
      const isBusinessHours = hour >= 9 && hour < 20;

      return NextResponse.json({
        success: true,
        data: {
          isOpen: true,
          openedBy: 'system',
          openedAt: currentTime.toISOString(),
          businessHours: { start: 8, end: 20 },
          currentTime: currentTime.toISOString(),
          currentHour: hour,
          isBusinessHours,
          effectiveStatus: isBusinessHours,
          note: 'Using fallback status (database table not found)'
        }
      });
    }

  } catch (error) {
    console.error("Error fetching booking system status:", error);
    return NextResponse.json(
      { success: false, error: "เกิดข้อผิดพลาดในการดึงข้อมูลสถานะระบบ" },
      { status: 500 }
    );
  }
}

// PUT - อัปเดตสถานะระบบการจอง
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "ไม่ได้รับอนุญาต" },
        { status: 401 }
      );
    }

    // ตรวจสอบสิทธิ์ admin หรือ super_admin
    const ADMIN_ROLES = new Set(['admin', 'super_admin']);
    const role = await resolveRole(session?.user?.role);
    if (!session?.user || !ADMIN_ROLES.has(role ?? '')) {
      return NextResponse.json(
        { success: false, error: "ไม่มีสิทธิ์เข้าถึง" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { isOpen } = body;

    if (typeof isOpen !== 'boolean') {
      return NextResponse.json(
        { success: false, error: "ข้อมูลไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    // เช็คว่าอยู่ในช่วงเวลาที่ admin สามารถควบคุมได้หรือไม่ (08:00 - 19:59 น. เวลาไทย)
    if (!isAdminControlAllowed()) {
      const message = getAdminControlDisabledMessage();
      return NextResponse.json(
        {
          success: false,
          error: "ไม่สามารถเปิด/ปิดระบบได้ในช่วงเวลานี้",
          message: message
        },
        { status: 403 }
      );
    }

    const now = new Date();
    const thailandTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
    const hour = thailandTime.getHours();
    const statusData = {
      isOpen,
      openedBy: 'admin',
      openedAt: thailandTime.toISOString(),
      businessHours: { start: 8, end: 20 },
      lastUpdatedBy: session.user.username || session.user.id,
      manualOverride: true, // บอกว่า admin เป็นคนเปิด/ปิดเอง
      thailandTime: thailandTime.toISOString()
    };

    try {
      // อัปเดตหรือสร้างใหม่
      await prisma.system_settings.upsert({
        where: { key: 'booking_system_status' },
        update: {
          value: JSON.stringify(statusData),
          updated_at: now
        },
        create: {
          key: 'booking_system_status',
          value: JSON.stringify(statusData)
        }
      });

      // คำนวณ effectiveStatus สำหรับ response
      const isBusinessHours = hour >= 8 && hour < 20;
      const responseData = {
        ...statusData,
        currentTime: thailandTime.toISOString(),
        currentHour: hour,
        isBusinessHours,
        effectiveStatus: isOpen && isBusinessHours
      };

      const message = isOpen
        ? 'เปิดระบบการจองสำเร็จ'
        : 'ปิดระบบการจองสำเร็จ';

      return NextResponse.json({
        success: true,
        message,
        data: responseData
      });

    } catch (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json(
        { success: false, error: "ไม่สามารถอัปเดตสถานะระบบได้ (ตาราง system_settings อาจยังไม่ถูกสร้าง)" },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error("Error updating booking system status:", error);
    return NextResponse.json(
      { success: false, error: "เกิดข้อผิดพลาดในการอัปเดตสถานะระบบ" },
      { status: 500 }
    );
  }
}