'use client';

import { useState, useEffect } from 'react';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Badge } from 'primereact/badge';
import { Toast } from 'primereact/toast';
import { useRef } from 'react';

interface BookingSystemStatus {
  isOpen: boolean;
  openedBy: 'admin' | 'auto';
  openedAt: string;
  lastUpdatedBy?: string;
}

export default function BookingSystemControl() {
  const [status, setStatus] = useState<BookingSystemStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const toast = useRef<Toast>(null);

  // โหลดสถานะระบบ
  const loadStatus = async () => {
    try {
      const response = await fetch('/api/admin/booking-system');
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      }
    } catch (error) {
      console.error('Error loading system status:', error);
    }
  };

  // เปิด/ปิดระบบ
  const toggleSystem = async (action: 'open' | 'close') => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/booking-system', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      });

      if (response.ok) {
        const newStatus = await response.json();
        setStatus(newStatus);
        
        toast.current?.show({
          severity: 'success',
          summary: 'สำเร็จ',
          detail: `${action === 'open' ? 'เปิด' : 'ปิด'}ระบบการจองแล้ว`,
          life: 3000,
        });
      } else {
        throw new Error('Failed to update system');
      }
    } catch (error) {
      toast.current?.show({
        severity: 'error',
        summary: 'เกิดข้อผิดพลาด',
        detail: 'ไม่สามารถอัปเดตระบบได้',
        life: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  // โหลดสถานะเมื่อ component mount
  useEffect(() => {
    loadStatus();
    
    // อัปเดตสถานะทุก 30 วินาที
    const interval = setInterval(loadStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  if (!status) {
    return <div>กำลังโหลด...</div>;
  }

  return (
    <>
      <Toast ref={toast} />
      <Card 
        title="ควบคุมระบบการจอง"
        className="mb-4"
      >
        <div className="flex flex-column gap-4">
          {/* สถานะปัจจุบัน */}
          <div className="flex align-items-center gap-3">
            <span className="font-semibold">สถานะระบบ:</span>
            <Badge
              value={status.isOpen ? 'เปิด' : 'ปิด'}
              severity={status.isOpen ? 'success' : 'danger'}
              size="large"
            />
            {status.openedBy === 'auto' && (
              <Badge
                value="เปิดอัตโนมัติ"
                severity="info"
              />
            )}
          </div>

          {/* ข้อมูลเพิ่มเติม */}
          <div className="text-sm text-600">
            <div>เปิดโดย: {status.openedBy === 'admin' ? 'แอดมิน' : 'ระบบอัตโนมัติ'}</div>
            <div>เวลา: {new Date(status.openedAt).toLocaleString('th-TH')}</div>
            {status.lastUpdatedBy && (
              <div>อัปเดตล่าสุดโดย: {status.lastUpdatedBy}</div>
            )}
          </div>

          {/* ปุ่มควบคุม */}
          <div className="flex gap-2">
            <Button
              label="เปิดระบบ"
              icon="pi pi-play"
              severity="success"
              disabled={status.isOpen || loading}
              loading={loading}
              onClick={() => toggleSystem('open')}
            />
            <Button
              label="ปิดระบบ"
              icon="pi pi-stop"
              severity="danger"
              disabled={!status.isOpen || loading}
              loading={loading}
              onClick={() => toggleSystem('close')}
            />
            <Button
              label="รีเฟรช"
              icon="pi pi-refresh"
              severity="secondary"
              outlined
              onClick={loadStatus}
            />
          </div>

          {/* คำอธิบาย */}
          <div className="p-3 bg-blue-50 border-round">
            <div className="text-sm">
              <div className="font-semibold mb-2">📋 หมายเหตุ:</div>
              <ul className="list-disc ml-4 text-600">
                <li>ระบบจะเปิดอัตโนมัติเวลา 9:00 น. ถ้าแอดมินลืมเปิด</li>
                <li>เมื่อระบบปิด ผู้ใช้จะไม่สามารถจองสนามได้</li>
                <li>การเปิด/ปิดระบบจะถูกบันทึกใน log</li>
              </ul>
            </div>
          </div>
        </div>
      </Card>
    </>
  );
}