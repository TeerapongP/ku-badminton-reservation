'use client';

import { useState, useEffect } from 'react';

interface BookingSystemStatus {
  isOpen: boolean;
  openedBy: 'admin' | 'auto';
  openedAt: string;
  lastUpdatedBy?: string;
}

export function useBookingSystem() {
  const [status, setStatus] = useState<BookingSystemStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const checkSystemStatus = async () => {
    try {
      const response = await fetch('/api/admin/booking-system');
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      }
    } catch (error) {
      console.error('Error checking booking system status:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkSystemStatus();
    
    // เช็คสถานะทุก 1 นาที
    const interval = setInterval(checkSystemStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  return {
    isSystemOpen: status?.isOpen ?? false,
    systemStatus: status,
    loading,
    refreshStatus: checkSystemStatus,
  };
}