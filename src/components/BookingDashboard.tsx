"use client"

import { MapPin, Calendar, Clock } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import BookingTable from "./BookingTable";
import Footer from "./Footer";


// Mock data for demo
const mockBookings = [
  { id: 1, court_number: 1, time_slot: '08:00', status: 'confirmed', user_name: 'สมชาย' },
  { id: 2, court_number: 1, time_slot: '09:00', status: 'confirmed', user_name: 'สมชาย' },
  { id: 3, court_number: 2, time_slot: '10:00', status: 'pending', user_name: 'สมหญิง' },
  { id: 4, court_number: 3, time_slot: '14:00', status: 'confirmed', user_name: 'สมศักดิ์' },
  { id: 5, court_number: 4, time_slot: '16:00', status: 'cancelled', user_name: 'สมใจ' },
  { id: 6, court_number: 5, time_slot: '18:00', status: 'confirmed', user_name: 'สมพร' },
];
// Main Dashboard Component
const BookingDashboard = () => {
  const [bookings, setBookings] = useState(mockBookings);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [countdown, setCountdown] = useState(60);

  const refreshInterval = useRef<NodeJS.Timeout | null>(null);
  const countdownInterval = useRef<NodeJS.Timeout | null>(null);

  // Fetch booking data
  const fetchBookings = async () => {
    try {
      setLoading(true);
      setError(null);

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      // In real app, fetch from API:
      // const response = await fetch('/api/bookings/dashboard');
      // const result = await response.json();
      // setBookings(result.data);

      setBookings(mockBookings);
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Failed to fetch bookings:', err);
      setError('เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  // Setup auto-refresh and countdown
  useEffect(() => {
    // Initial load
    fetchBookings();

    // Setup auto-refresh every 60 seconds (1 minute)
    refreshInterval.current = setInterval(() => {
      fetchBookings();
      setCountdown(60);
    }, 60000);

    // Setup countdown every 1 second
    countdownInterval.current = setInterval(() => {
      setCountdown(prev => prev > 0 ? prev - 1 : 60);
    }, 1000);

    // Cleanup
    return () => {
      if (refreshInterval.current) clearInterval(refreshInterval.current);
      if (countdownInterval.current) clearInterval(countdownInterval.current);
    };
  }, []);

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
    const today = new Date();
    return today.toLocaleTimeString('th-TH', {
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

            {/* Countdown Section */}
            <div className="tw-bg-white/10 tw-backdrop-blur-sm tw-rounded-xl tw-p-4 tw-border tw-border-white/20">
              <div className="tw-text-center">
                <div className="tw-text-white/80 tw-text-sm tw-mb-1">อัปเดตข้อมูลใหม่ใน</div>
                <div className="tw-flex tw-items-center tw-justify-center tw-gap-2">
                 
                    <div className="tw-text-2xl tw-font-bold tw-text-white">{countdown}</div>
                    <div className="tw-text-xs tw-text-white/70">วินาที</div>
                </div>
                <div className="tw-text-white/60 tw-text-xs tw-mt-2">
                  อัปเดตล่าสุด: {lastUpdate.toLocaleTimeString('th-TH', {
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZone: 'Asia/Bangkok'
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        <BookingTable
          bookings={bookings}
          loading={loading}
        />
        
        <Footer />
      </div>
    </div>
  );
};

export default BookingDashboard;