// Scheduled Tasks for Booking System
import { BookingSystemManager } from './booking-system';

export class ScheduledTasks {
  private static instance: ScheduledTasks;
  private intervalId: NodeJS.Timeout | null = null;

  static getInstance(): ScheduledTasks {
    if (!ScheduledTasks.instance) {
      ScheduledTasks.instance = new ScheduledTasks();
    }
    return ScheduledTasks.instance;
  }

  // เริ่มต้น scheduled tasks
  start() {
    if (this.intervalId) {
      return;
    }

    // ตรวจสอบทุก 5 นาที
    this.intervalId = setInterval(() => {
      this.checkBookingSystemSchedule();
    }, 5 * 60 * 1000); // 5 minutes
    
    // เรียกใช้ทันทีเมื่อเริ่มต้น
    this.checkBookingSystemSchedule();
  }

  // หยุด scheduled tasks
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  // ตรวจสอบและจัดการระบบการจองตามเวลา
  private async checkBookingSystemSchedule() {
    try {
      const now = new Date();
      const hour = now.getHours();
      const minute = now.getMinutes();

      const bookingSystem = BookingSystemManager.getInstance();
      await bookingSystem.loadFromDatabase();
      const currentStatus = bookingSystem.getStatus();

      // เปิดระบบอัตโนมัติเวลา 8:00 (ถ้า admin ไม่เปิด)
      if (hour === 8 && minute < 5 && !currentStatus.isOpen) {
        const updatedStatus = {
          isOpen: true,
          openedBy: 'auto' as const,
          openedAt: now,
          lastUpdatedBy: 'system-auto-open'
        };
        
        bookingSystem['status'] = updatedStatus;
        await bookingSystem['saveToDatabase']();
      }

      // ปิดระบบอัตโนมัติเวลา 20:00 (ถ้า admin ไม่ปิด และไม่ได้เปิดด้วย admin override)
      if (hour === 20 && minute < 5 && currentStatus.isOpen && currentStatus.openedBy !== 'admin') {
        const updatedStatus = {
          isOpen: false,
          openedBy: 'auto' as const,
          openedAt: now,
          lastUpdatedBy: 'system-auto-close'
        };
        
        bookingSystem['status'] = updatedStatus;
        await bookingSystem['saveToDatabase']();
      }

      // แจ้งเตือนก่อนปิดระบบ 15 นาที (19:45) - เฉพาะถ้าไม่ได้เปิดโดย admin
      if (hour === 19 && minute >= 45 && minute < 50 && currentStatus.isOpen && currentStatus.openedBy !== 'admin') {
        // TODO: ส่งการแจ้งเตือนไปยัง admin และผู้ใช้
      }

      // แจ้งเตือนก่อนปิดระบบ 5 นาที (19:55) - เฉพาะถ้าไม่ได้เปิดโดย admin
      if (hour === 19 && minute >= 55 && currentStatus.isOpen && currentStatus.openedBy !== 'admin') {
        // TODO: ส่งการแจ้งเตือนไปยัง admin และผู้ใช้
      }

    } catch (error) {
      // Error in scheduled task
    }
  }

  // ตรวจสอบสถานะปัจจุบัน
  async getCurrentStatus() {
    const bookingSystem = BookingSystemManager.getInstance();
    await bookingSystem.loadFromDatabase();
    return bookingSystem.getStatus();
  }
}

// Export singleton instance
export const scheduledTasks = ScheduledTasks.getInstance();