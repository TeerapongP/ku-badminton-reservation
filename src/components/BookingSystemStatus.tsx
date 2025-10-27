'use client';

import { useBookingSystem } from '@/hooks/useBookingSystem';
import { Message } from 'primereact/message';
import { Badge } from 'primereact/badge';

export default function BookingSystemStatus() {
  const { isSystemOpen, systemStatus, loading } = useBookingSystem();

  if (loading) {
    return null;
  }

  if (!isSystemOpen) {
    return (
      <Message
        severity="warn"
        text="ระบบการจองปิดอยู่ในขณะนี้ กรุณาติดต่อแอดมิน หรือรอระบบเปิดอัตโนมัติเวลา 9:00 น."
        className="mb-4"
      />
    );
  }

  return (
    <div className="flex align-items-center gap-2 mb-4 p-3 bg-green-50 border-round">
      <Badge value="เปิด" severity="success" />
      <span className="text-green-700">ระบบการจองเปิดให้บริการ</span>
      {systemStatus?.openedBy === 'auto' && (
        <Badge value="เปิดอัตโนมัติ" severity="info" size="small" />
      )}
    </div>
  );
}