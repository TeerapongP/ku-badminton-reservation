import { NextRequest, NextResponse } from 'next/server';

export async function checkBookingSystemStatus() {
  try {
    // ใช้ environment variable หรือ default เป็น true
    const systemOpen = process.env.BOOKING_SYSTEM_OPEN !== 'false';

    // เช็ค auto-open (เวลา 9:00-22:00)
    const now = new Date();
    const hour = now.getHours();

    // ระบบเปิดตั้งแต่ 8:00-20:00
    const isBusinessHours = hour >= 8 && hour < 20;

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