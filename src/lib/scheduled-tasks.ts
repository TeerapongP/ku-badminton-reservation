// Scheduled Tasks for Booking System
import { BookingSystemManager } from './booking-system';

/**
 * เช็คว่าอยู่ในช่วงเวลาที่ admin สามารถเปิด/ปิดระบบได้หรือไม่
 * อนุญาตเฉพาะ 08:00 - 19:59 น. (เวลาไทย)
 */
export function isAdminControlAllowed(): boolean {
  const now = new Date();
  const thailandTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
  const hour = thailandTime.getHours();
  
  // อนุญาตให้ admin ควบคุมได้เฉพาะ 08:00 - 19:59 น.
  return hour >= 8 && hour < 20;
}

/**
 * ดึงข้อความแจ้งเตือนเมื่อ admin ไม่สามารถควบคุมระบบได้
 */
export function getAdminControlDisabledMessage(): string {
  const now = new Date();
  const thailandTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
  const hour = thailandTime.getHours();
  
  if (hour >= 20 || hour < 8) {
    return 'ไม่สามารถเปิด/ปิดระบบได้ในช่วงเวลา 20:00 - 07:59 น. ระบบจะเปิดอัตโนมัติเวลา 08:00 น.';
  }
  
  return '';
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
      // ใช้เวลาไทย (UTC+7)
      const now = new Date();
      const thailandTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
      const hour = thailandTime.getHours();
      const minute = thailandTime.getMinutes();

      const bookingSystem = BookingSystemManager.getInstance();
      await bookingSystem.loadFromDatabase();
      const currentStatus = bookingSystem.getStatus();

      // เปิดระบบอัตโนมัติเวลา 8:00 (ถ้า admin ไม่เปิด)
      if (hour === 8 && minute < 5 && !currentStatus.isOpen) {
        const updatedStatus = {
          isOpen: true,
          openedBy: 'auto' as const,
          openedAt: thailandTime,
          lastUpdatedBy: 'system-auto-open'
        };
        
        bookingSystem['status'] = updatedStatus;
        await bookingSystem['saveToDatabase']();
        console.log(`[Thailand Time ${thailandTime.toISOString()}] ระบบเปิดอัตโนมัติ`);
      }

      // ปิดระบบอัตโนมัติเวลา 20:00 (ปิดทุกกรณี ไม่ว่า admin จะเปิดหรือไม่)
      if (hour === 20 && minute < 5 && currentStatus.isOpen) {
        const updatedStatus = {
          isOpen: false,
          openedBy: 'auto' as const,
          openedAt: thailandTime,
          lastUpdatedBy: 'system-auto-close'
        };
        
        bookingSystem['status'] = updatedStatus;
        await bookingSystem['saveToDatabase']();
        console.log(`[Thailand Time ${thailandTime.toISOString()}] ระบบปิดอัตโนมัติ`);
      }

      // แจ้งเตือนก่อนปิดระบบ 15 นาที (19:45)
      if (hour === 19 && minute >= 45 && minute < 50 && currentStatus.isOpen) {
        // TODO: ส่งการแจ้งเตือนไปยัง admin และผู้ใช้
        console.log(`[Thailand Time ${thailandTime.toISOString()}] แจ้งเตือน: ระบบจะปิดใน 15 นาที`);
      }

      // แจ้งเตือนก่อนปิดระบบ 5 นาที (19:55)
      if (hour === 19 && minute >= 55 && currentStatus.isOpen) {
        // TODO: ส่งการแจ้งเตือนไปยัง admin และผู้ใช้
        console.log(`[Thailand Time ${thailandTime.toISOString()}] แจ้งเตือน: ระบบจะปิดใน 5 นาที`);
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

  async runNow(): Promise<void> {
    await this.checkBookingSystemSchedule();
}
}

// Export singleton instance
export const scheduledTasks = ScheduledTasks.getInstance();