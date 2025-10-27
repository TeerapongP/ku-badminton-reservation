import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function checkBookingSystemStatus() {
  try {
    const systemStatus = await prisma.systemSettings.findFirst({
      where: { key: 'booking_system_status' }
    });

    if (!systemStatus) {
      return false;
    }

    const status = JSON.parse(systemStatus.value);
    
    // เช็ค auto-open (เวลา 9:00)
    const now = new Date();
    const hour = now.getHours();
    
    if (hour >= 9 && !status.isOpen) {
      const autoOpenStatus = {
        isOpen: true,
        openedBy: 'auto',
        openedAt: now,
      };

      // อัปเดตใน database
      await prisma.systemSettings.update({
        where: { key: 'booking_system_status' },
        data: { value: JSON.stringify(autoOpenStatus) }
      });

      return true;
    }

    return status.isOpen;
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
          message: 'กรุณาติดต่อแอดมิน หรือรอระบบเปิดอัตโนมัติเวลา 9:00 น.'
        },
        { status: 403 }
      );
    }

    return handler(request);
  };
}