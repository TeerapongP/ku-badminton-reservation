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

  // เปิดระบบอัตโนมัติเวลา 9:00
  autoOpen(): BookingSystemStatus {
    const now = new Date();
    const hour = now.getHours();
    
    // เช็คว่าเป็นเวลา 9:00 และระบบยังปิดอยู่
    if (hour >= 9 && !this.status.isOpen) {
      this.status = {
        isOpen: true,
        openedBy: 'auto',
        openedAt: now,
      };
      
      this.saveToDatabase();
      console.log(`🤖 Auto-opened booking system at ${now.toLocaleString()}`);
    }
    
    return this.status;
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
        console.error('Failed to save booking system status');
      }
    } catch (error) {
      console.error('Error saving booking system status:', error);
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
      console.error('Error loading booking system status:', error);
    }
  }
}