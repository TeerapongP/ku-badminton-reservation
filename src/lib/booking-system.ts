// Booking System Management
export interface BookingSystemStatus {
  isOpen: boolean;
  openedBy: 'admin' | 'auto';
  openedAt: Date;
  lastUpdatedBy?: string;
}

export class BookingSystemManager {
  private static instance: BookingSystemManager;
  private status: BookingSystemStatus = {
    isOpen: false,
    openedBy: 'admin',
    openedAt: new Date(),
  };

  static getInstance(): BookingSystemManager {
    if (!BookingSystemManager.instance) {
      BookingSystemManager.instance = new BookingSystemManager();
    }
    return BookingSystemManager.instance;
  }

  // เปิดระบบโดยแอดมิน
  openByAdmin(adminId: string): BookingSystemStatus {
    this.status = {
      isOpen: true,
      openedBy: 'admin',
      openedAt: new Date(),
      lastUpdatedBy: adminId,
    };
    
    // บันทึกลง database
    this.saveToDatabase();
    return this.status;
  }

  // ปิดระบบโดยแอดมิน
  closeByAdmin(adminId: string): BookingSystemStatus {
    this.status = {
      isOpen: false,
      openedBy: 'admin',
      openedAt: new Date(),
      lastUpdatedBy: adminId,
    };
    
    this.saveToDatabase();
    return this.status;
  }

  // ตรวจสอบและจัดการระบบอัตโนมัติ
  autoManage(): BookingSystemStatus {
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
    
    // เปิดระบบอัตโนมัติเวลา 9:00 (ถ้า admin ไม่เปิด)
    if (hour === 9 && minute < 5 && !this.status.isOpen) {
      this.status = {
        isOpen: true,
        openedBy: 'auto',
        openedAt: now,
        lastUpdatedBy: 'system-auto-open'
      };
      
      this.saveToDatabase();
    }
    
    // ปิดระบบอัตโนมัติเวลา 20:00 (ถ้า admin ไม่ปิด)
    if (hour === 20 && minute < 5 && this.status.isOpen) {
      this.status = {
        isOpen: false,
        openedBy: 'auto',
        openedAt: now,
        lastUpdatedBy: 'system-auto-close'
      };
      
      this.saveToDatabase();
    }
    
    return this.status;
  }

  // เปิดระบบอัตโนมัติเวลา 9:00 (backward compatibility)
  autoOpen(): BookingSystemStatus {
    return this.autoManage();
  }

  // ดึงสถานะปัจจุบัน
  getStatus(): BookingSystemStatus {
    return this.status;
  }

  // เช็คว่าระบบเปิดหรือไม่
  isSystemOpen(): boolean {
    // เช็ค auto-open ก่อน
    this.autoOpen();
    return this.status.isOpen;
  }

  // บันทึกลง database
  private async saveToDatabase() {
    try {
      // บันทึกสถานะลง database
      const response = await fetch('/api/admin/booking-system', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(this.status),
      });
      
      if (!response.ok) {
        // Failed to save booking system status
      }
    } catch (error) {
      // Error saving booking system status
    }
  }

  // โหลดสถานะจาก database
  async loadFromDatabase() {
    try {
      const response = await fetch('/api/admin/booking-system');
      if (response.ok) {
        const data = await response.json();
        this.status = data;
      }
    } catch (error) {
      // Error loading booking system status
    }
  }
}