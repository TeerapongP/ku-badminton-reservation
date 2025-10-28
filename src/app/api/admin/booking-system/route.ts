import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { PrismaClient } from '@prisma/client';


const prisma = new PrismaClient();

// GET - ดึงสถานะระบบการจอง
export async function GET() {
  try {
    const systemStatus = await prisma.systemSettings.findFirst({
      where: { key: 'booking_system_status' }
    });

    if (!systemStatus) {
      // สร้างค่าเริ่มต้น
      const defaultStatus = {
        isOpen: false,
        openedBy: 'admin',
        openedAt: new Date(),
      };

      await prisma.systemSettings.create({
        data: {
          key: 'booking_system_status',
          value: JSON.stringify(defaultStatus),
        }
      });

      return NextResponse.json(defaultStatus);
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

      return NextResponse.json(autoOpenStatus);
    }

    return NextResponse.json(status);
  } catch (error) {
    console.error('Error getting booking system status:', error);
    return NextResponse.json(
      { error: 'Failed to get system status' },
      { status: 500 }
    );
  }
}

// POST - อัปเดตสถานะระบบการจอง
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action } = body; // 'open' หรือ 'close'

    const now = new Date();
    const newStatus = {
      isOpen: action === 'open',
      openedBy: 'admin',
      openedAt: now,
      lastUpdatedBy: session.user.id,
    };

    // อัปเดตใน database
    await prisma.systemSettings.upsert({
      where: { key: 'booking_system_status' },
      update: { value: JSON.stringify(newStatus) },
      create: {
        key: 'booking_system_status',
        value: JSON.stringify(newStatus),
      }
    });

    // บันทึก log
    await prisma.adminLog.create({
      data: {
        adminId: session.user.id,
        action: `BOOKING_SYSTEM_${action.toUpperCase()}`,
        details: `Booking system ${action}ed by admin`,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      }
    });

    return NextResponse.json(newStatus);
  } catch (error) {
    console.error('Error updating booking system status:', error);
    return NextResponse.json(
      { error: 'Failed to update system status' },
      { status: 500 }
    );
  }
}