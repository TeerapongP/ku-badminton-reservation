// Scheduled Tasks for Booking System
import { BookingSystemManager } from './booking-system';
import { prisma } from './prisma';
import { getThailandDate } from './timezone';

/**
 * เช็คว่าอยู่ในช่วงเวลาที่ admin สามารถเปิด/ปิดระบบได้หรือไม่
 */
export function isAdminControlAllowed(): boolean {
  const thailandTime = getThailandDate();
  const hour = thailandTime.getHours();
  return hour >= 8 && hour < 20;
}

/**
 * Message แจ้งเตือนเมื่อไม่สามารถเปิด/ปิดระบบได้
 */
export function getAdminControlDisabledMessage(): string {
  return "แอดมินสามารถเปิด/ปิดระบบได้เฉพาะช่วงเวลา 08:00 - 20:00 น. เท่านั้น";
}

export class ScheduledTasks {
  private static instance: ScheduledTasks;
  private intervalId: NodeJS.Timeout | null = null;

  static getInstance(): ScheduledTasks {
    if (!ScheduledTasks.instance) {
      ScheduledTasks.instance = new ScheduledTasks();
    }
    return ScheduledTasks.instance;
  }

  start() {
    if (this.intervalId) return;

    // ตรวจสอบทุก 1 นาที เพื่อความแม่นยำในการยกเลิกการจอง
    this.intervalId = setInterval(() => {
      this.runAllTasks();
    }, 1 * 60 * 1000);
    
    this.runAllTasks();
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private async runAllTasks() {
    await this.checkBookingSystemSchedule();
    await this.autoCancelPendingReservations();
  }

  /**
   * A01 — ป้องกัน DoS โดยการยกเลิกการจองที่ค้างชำระเกิน 15 นาที
   */
  private async autoCancelPendingReservations() {
    try {
      const expirationTime = new Date(Date.now() - 15 * 60 * 1000); // 15 นาทีที่แล้ว

      const expiredBookings = await prisma.reservations.findMany({
        where: {
          status: 'pending',
          payment_status: 'unpaid',
          created_at: { lt: expirationTime }
        },
        select: { reservation_id: true }
      });

      if (expiredBookings.length > 0) {
        const ids = expiredBookings.map(b => b.reservation_id);
        
        await prisma.$transaction([
          // อัปเดตสถานะการจองหลัก
          prisma.reservations.updateMany({
            where: { reservation_id: { in: ids } },
            data: { status: 'cancelled', note: 'System: Auto-cancelled due to payment timeout' }
          }),
          // อัปเดตสถานะรายการสนามเพื่อให้ว่าง
          prisma.reservation_items.updateMany({
            where: { reservation_id: { in: ids } },
            data: { status: 'cancelled' }
          })
        ]);
        
        console.log(`[ScheduledTask] Auto-cancelled ${expiredBookings.length} pending reservations.`);
      }
    } catch (error) {
      console.error('[ScheduledTask] Error auto-cancelling reservations:', error);
    }
  }

  private async checkBookingSystemSchedule() {
    try {
      const thailandTime = getThailandDate();
      const hour = thailandTime.getHours();
      const minute = thailandTime.getMinutes();

      const bookingSystem = BookingSystemManager.getInstance();
      await bookingSystem.loadFromDatabase();
      const currentStatus = bookingSystem.getStatus();

      // เปิดระบบอัตโนมัติเวลา 8:00
      if (hour === 8 && minute < 2 && !currentStatus.isOpen) {
        bookingSystem.openByAdmin('system-auto-open');
        console.log(`[${thailandTime.toISOString()}] ระบบเปิดอัตโนมัติ`);
      }

      // ปิดระบบอัตโนมัติเวลา 20:00
      if (hour === 20 && minute < 2 && currentStatus.isOpen) {
        bookingSystem.closeByAdmin('system-auto-close');
        console.log(`[${thailandTime.toISOString()}] ระบบปิดอัตโนมัติ`);
      }
    } catch (error) {
      console.error('[ScheduledTask] Error in booking system schedule:', error);
    }
  }

  // ตรวจสอบสถานะปัจจุบัน
  async getCurrentStatus() {
    const bookingSystem = BookingSystemManager.getInstance();
    await bookingSystem.loadFromDatabase();
    return bookingSystem.getStatus();
  }

  async runNow(): Promise<void> {
    await this.checkBookingSystemSchedule();
}
}

// Export singleton instance
export const scheduledTasks = ScheduledTasks.getInstance();