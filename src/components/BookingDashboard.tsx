"use client"

import { MapPin, Calendar, Clock, XCircle, AlertTriangle } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import BookingTable from "./BookingTable";

import { DashboardBooking, DashboardBookingResponse } from '@/types/booking';

// System Status Interface
interface SystemStatus {
  isOpen: boolean;
  isBusinessHours: boolean;
  effectiveStatus: boolean;
  currentHour: number;
}

// Main Dashboard Component
const BookingDashboard = () => {
  const { data: session, status } = useSession();
  const [bookings, setBookings] = useState<DashboardBooking[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState(60);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    isOpen: true,
    isBusinessHours: true,
    effectiveStatus: true,
    currentHour: 0
  });
  const [systemLoading, setSystemLoading] = useState(true);

  const refreshInterval = useRef<NodeJS.Timeout | null>(null);
  const countdownInterval = useRef<NodeJS.Timeout | null>(null);

  // Fetch system status เฉพาะเมื่อ authenticated
  const fetchSystemStatus = async () => {
    if (status !== 'authenticated') {
      setSystemLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/admin/booking-system');
      const data = await response.json();

      if (data.success) {
        setSystemStatus(data.data);
      } 
    } catch (error) {
      console.error('Fetch system status error:', error);
    } finally {
      setSystemLoading(false);
    }
  };

  // Fetch booking data เฉพาะเมื่อ authenticated
  const fetchBookings = async () => {
    if (status !== 'authenticated') return;

    try {
      setLoading(true);
      setError(null);

      // Fetch from real API
      const response = await fetch('/api/bookings/dashboard');

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: DashboardBookingResponse = await response.json();

      if (result.success) {
        setBookings(result.data);
        setLastUpdate(new Date());
      } else {
        throw new Error(result.message || 'Failed to fetch bookings');
      }
    } catch (err) {
      console.error('Failed to fetch bookings:', err);
      setError('เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  // Initialize dates after component mounts to avoid hydration issues
  useEffect(() => {
    const now = new Date();
    setLastUpdate(now);
    setCurrentTime(now);
    setSystemStatus(prev => ({
      ...prev,
      currentHour: now.getHours()
    }));
  }, []);

  // Setup auto-refresh and countdown เฉพาะเมื่อ authenticated
  useEffect(() => {
    if (status === 'loading') return; // รอให้ session โหลดเสร็จ

    // Initial load
    fetchSystemStatus();
    fetchBookings();

    // Setup auto-refresh every 60 seconds (1 minute) เฉพาะเมื่อ authenticated
    if (status === 'authenticated') {
      refreshInterval.current = setInterval(() => {
        fetchSystemStatus();
        fetchBookings();
        setCountdown(60);
      }, 60000);
    }

    // Setup countdown and time update every 1 second
    countdownInterval.current = setInterval(() => {
      setCountdown(prev => prev > 0 ? prev - 1 : 60);
      setCurrentTime(new Date()); // Update current time every second
    }, 1000);

    // Cleanup
    return () => {
      if (refreshInterval.current) clearInterval(refreshInterval.current);
      if (countdownInterval.current) clearInterval(countdownInterval.current);
    };
  }, [status]);

  const getCurrentDate = () => {
    const today = new Date();
    return today.toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'Asia/Bangkok'
    });
  };

  const getCurrentTime = () => {
    if (!currentTime) return '--:--';
    return currentTime.toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Bangkok'
    });
  };

  return (
    <div className="tw-min-h-screen tw-bg-gradient-to-br tw-from-slate-50 tw-to-slate-100 tw-p-4 sm:tw-p-6 lg:tw-p-8">
      <div className="tw-w-full">
        {/* Header Section */}
        <div className="tw-bg-gradient-to-r tw-from-blue-600 tw-to-blue-700 tw-rounded-2xl tw-p-6 sm:tw-p-8 tw-shadow-xl tw-mb-6">
          <div className="tw-flex tw-flex-col lg:tw-flex-row tw-justify-between tw-items-start lg:tw-items-center tw-gap-4">
            <div>
              <div className="tw-flex tw-items-center tw-gap-2 tw-text-blue-100 tw-mb-2">
                <MapPin className="tw-w-5 tw-h-5" />
                <span className="tw-text-sm tw-font-medium">มหาวิทยาลัยเกษตรศาสตร์ วิทยาเขตกำแพงแสน</span>
              </div>
              <h1 className="tw-text-3xl sm:tw-text-4xl tw-font-bold tw-text-white tw-mb-2">
                ตารางการจองสนามแบดมินตัน
              </h1>
              <div className="tw-flex tw-flex-wrap tw-items-center tw-gap-4 tw-text-blue-100">
                <div className="tw-flex tw-items-center tw-gap-2">
                  <Calendar className="tw-w-4 tw-h-4" />
                  <span className="tw-text-sm">{getCurrentDate()}</span>
                </div>
                <div className="tw-flex tw-items-center tw-gap-2">
                  <Clock className="tw-w-4 tw-h-4" />
                  <span className="tw-text-sm">{getCurrentTime()}</span>
                </div>
              </div>
            </div>

            {systemStatus.effectiveStatus && (
              <div className="tw-bg-white/10 tw-backdrop-blur-sm tw-rounded-xl tw-p-4 tw-border tw-border-white/20">
                <div className="tw-text-center">
                  <div className="tw-text-white/80 tw-text-sm tw-mb-1">อัปเดตข้อมูลใหม่ใน</div>
                  <div className="tw-flex tw-items-center tw-justify-center tw-gap-2">
                    <div className="tw-text-2xl tw-font-bold tw-text-white">{countdown}</div>
                    <div className="tw-text-xs tw-text-white/70">วินาที</div>
                  </div>
                  <div className="tw-text-white/60 tw-text-xs tw-mt-2">
                    อัปเดตล่าสุด: {lastUpdate ? lastUpdate.toLocaleTimeString('th-TH', {
                      hour: '2-digit',
                      minute: '2-digit',
                      timeZone: 'Asia/Bangkok'
                    }) : '--:--'}
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>

        {error && (
          <div className="tw-bg-red-50 tw-border tw-border-red-200 tw-rounded-xl tw-p-4 tw-mb-6">
            <div className="tw-flex tw-items-center tw-gap-2 tw-text-red-700">
              <Clock className="tw-w-5 tw-h-5" />
              <span className="tw-font-medium">เกิดข้อผิดพลาด</span>
            </div>
            <p className="tw-text-red-600 tw-text-sm tw-mt-1">{error}</p>
          </div>
        )}

        {/* System Status Check */}
        {systemLoading ? (
          <div className="tw-bg-white tw-rounded-2xl tw-shadow-lg tw-p-8 tw-text-center">
            <div className="tw-animate-spin tw-rounded-full tw-h-8 tw-w-8 tw-border-b-2 tw-border-blue-600 tw-mx-auto tw-mb-4"></div>
            <p className="tw-text-gray-600">กำลังตรวจสอบสถานะระบบ...</p>
          </div>
        ) : !systemStatus.effectiveStatus ? (
          <div className="tw-bg-white tw-rounded-2xl tw-shadow-lg tw-p-8 tw-text-center tw-border tw-border-red-200">
            <div className="tw-w-16 tw-h-16 tw-bg-red-100 tw-rounded-full tw-flex tw-items-center tw-justify-center tw-mx-auto tw-mb-4">
              <XCircle className="tw-w-8 tw-h-8 tw-text-red-600" />
            </div>
            <h3 className="tw-text-xl tw-font-bold tw-text-red-800 tw-mb-2">
              ระบบการจองปิดให้บริการ
            </h3>
            <div className="tw-space-y-2 tw-text-gray-600">
              {!systemStatus.isOpen ? (
                <p className="tw-flex tw-items-center tw-justify-center tw-gap-2">
                  <AlertTriangle className="tw-w-4 tw-h-4 tw-text-orange-500" />
                  ระบบถูกปิดโดยผู้ดูแล
                </p>
              ) : !systemStatus.isBusinessHours ? (
                <p className="tw-flex tw-items-center tw-justify-center tw-gap-2">
                  <Clock className="tw-w-4 tw-h-4 tw-text-blue-500" />
                  นอกเวลาทำการ (เวลาทำการ: 09:00-22:00 น.)
                </p>
              ) : null}
              <p className="tw-text-sm tw-text-gray-500 tw-mt-4">
                เวลาปัจจุบัน: {getCurrentTime()}
              </p>
            </div>
          </div>
        ) : (
          <BookingTable
            bookings={bookings}
            loading={loading}
          />
        )}
      </div>
    </div>
  );
};

export default BookingDashboard;