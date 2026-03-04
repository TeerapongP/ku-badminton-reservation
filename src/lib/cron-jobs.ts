// Cron Jobs for automatic system management
import { PrismaClient } from '@prisma/client';

// Use singleton pattern for Prisma client
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export class BookingSystemCronJobs {
  // เปิดระบบอัตโนมัติเวลา 9:00 น.
  static async autoOpenBookingSystem() {
    try {
      const now = new Date();
      const hour = now.getHours();

      // เช็คว่าเป็นเวลา 9:00 น.
      if (hour !== 9) {
        console.log(`⏰ Not time to auto-open yet. Current hour: ${hour}`);
        return;
      }

      // ดึงสถานะปัจจุบัน
      const systemStatus = await prisma.systemSettings.findFirst({
        where: { key: 'booking_system_status' }
      });

      let currentStatus = { isOpen: false };
      if (systemStatus) {
        currentStatus = JSON.parse(systemStatus.value);
      }

      // ถ้าระบบปิดอยู่ ให้เปิดอัตโนมัติ
      if (!currentStatus.isOpen) {
        const autoOpenStatus = {
          isOpen: true,
          openedBy: 'auto',
          openedAt: now,
        };

        await prisma.systemSettings.upsert({
          where: { key: 'booking_system_status' },
          update: { value: JSON.stringify(autoOpenStatus) },
          create: {
            key: 'booking_system_status',
            value: JSON.stringify(autoOpenStatus),
          }
        });

        // บันทึก log
        await prisma.adminLog.create({
          data: {
            adminId: 'system',
            action: 'BOOKING_SYSTEM_AUTO_OPEN',
            details: `Booking system auto-opened at ${now.toLocaleString()}`,
            ipAddress: 'system',
          }
        });

        console.log(`🤖 Auto-opened booking system at ${now.toLocaleString()}`);
      } else {
        console.log(` Booking system already open`);
      }
    } catch (error) {
      console.error('Error in auto-open booking system:', error);

      // บันทึก error log
      await prisma.adminLog.create({
        data: {
          adminId: 'system',
          action: 'BOOKING_SYSTEM_AUTO_OPEN_ERROR',
          details: `Error: ${error}`,
          ipAddress: 'system',
        }
      });
    }
  }

  // รัน cron job ทุกชั่วโมง
  static startCronJobs() {
    // รันทุก 1 ชั่วโมง
    setInterval(async () => {
      await this.autoOpenBookingSystem();
    }, 60 * 60 * 1000); // 1 hour

    console.log('🕐 Booking system cron jobs started');
  }
}