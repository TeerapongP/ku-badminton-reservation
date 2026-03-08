import { NextRequest, NextResponse } from 'next/server';
import { getThailandDate } from '@/lib/timezone';

export async function checkBookingSystemStatus() {
  try {
    // ใช้ environment variable หรือ default เป็น true
    const systemOpen = process.env.BOOKING_SYSTEM_OPEN !== 'false';

    // เช็ค auto-open โดยใช้เวลาประเทศไทย
    const now = getThailandDate();
    const hour = now.getHours();

    // ระบบเปิดตั้งแต่ 8:00-20:00 น. ตามเวลาไทย
    const isBusinessHours = hour >= 8 && hour < 20;

    // Bypass for automated testing
    if (process.env.NEXT_PUBLIC_BYPASS_BUSINESS_HOURS === 'true') {
      return true;
    }

    return systemOpen && isBusinessHours;
  } catch (error) {
    console.error('Error checking booking system status:', error);
    return false;
  }
}

export function withBookingSystemCheck(handler: Function) {
  return async (request: NextRequest) => {
    const isSystemOpen = await checkBookingSystemStatus();

    if (!isSystemOpen) {
      return NextResponse.json(
        {
          error: 'ระบบการจองปิดอยู่ในขณะนี้',
          message: 'ระบบเปิดให้บริการเวลา 8:00-20:00 น. กรุณาติดต่อแอดมินหากต้องการใช้งานนอกเวลา'
        },
        { status: 403 }
      );
    }

    return handler(request);
  };
}