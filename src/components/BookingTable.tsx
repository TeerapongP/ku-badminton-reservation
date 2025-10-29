import React, { useState, useEffect, useRef } from 'react';
import { Calendar, Clock, Users, MapPin, RefreshCw, AlertCircle } from 'lucide-react';
import { BookingTableProps } from '@/lib/BookingTableProps';
import Loading from './Loading';

const BookingTable = ({ bookings = [], loading = false }: BookingTableProps) => {
    const [hoveredCell, setHoveredCell] = useState<string | null>(null);

    // Generate time slots (05:00 - 19:00)
    const timeSlots: any[] = [];
    for (let hour = 5; hour <= 19; hour++) {
        timeSlots.push(`${hour.toString().padStart(2, '0')}:00`);
    }

    // Generate courts (1-6)
    const courts = Array.from({ length: 6 }, (_, i) => i + 1);

    // Get current date in Thai format
    const getCurrentDate = () => {
        const today = new Date();
        return today.toLocaleDateString('th-TH', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            timeZone: 'Asia/Bangkok'
        });
    };

    // Get booking status for specific court and time
    const getBookingStatus = (courtNumber: number, timeSlot: any) => {
        // Check if it's lunch break time (12:00)
        if (timeSlot === '12:00') {
            return { status: 'lunch_break', user: '' };
        }

        const booking = bookings.find(b =>
            b.court_number === courtNumber &&
            b.time_slot === timeSlot
        );

        if (!booking) return { status: 'available', user: '' };
        return { status: booking.status, user: booking.user_name };
    };

    // Get status display
    const getStatusDisplay = (status: any) => {
        switch (status) {
            case 'confirmed':
                return {
                    text: 'จองแล้ว',
                    color: 'tw-bg-gradient-to-br tw-from-emerald-500 tw-to-emerald-600 tw-text-white tw-shadow-sm',
                    icon: '✓'
                };
            case 'pending':
                return {
                    text: 'รอชำระ',
                    color: 'tw-bg-gradient-to-br tw-from-amber-400 tw-to-amber-500 tw-text-white tw-shadow-sm',
                    icon: '⏳'
                };
            case 'cancelled':
                return {
                    text: 'ยกเลิก',
                    color: 'tw-bg-gradient-to-br tw-from-gray-400 tw-to-gray-500 tw-text-white tw-shadow-sm',
                    icon: '✕'
                };
            case 'lunch_break':
                return {
                    text: 'พักเที่ยง',
                    color: 'tw-bg-gradient-to-br tw-from-orange-400 tw-to-orange-500 tw-text-white tw-shadow-sm',
                };
            case 'available':
                return {
                    text: 'ว่าง',
                    color: 'tw-bg-gradient-to-br tw-from-slate-50 tw-to-slate-100 tw-text-slate-600 tw-border tw-border-slate-200',
                    icon: '○'
                };
            default:
                return {
                    text: 'ว่าง',
                    color: 'tw-bg-gradient-to-br tw-from-slate-50 tw-to-slate-100 tw-text-slate-600 tw-border tw-border-slate-200',
                    icon: '○'
                };
        }
    };

    // Get summary statistics
    const getSummary = () => {
        const total = courts.length * timeSlots.length;
        const confirmed = bookings.filter(b => b.status === 'confirmed').length;
        const pending = bookings.filter(b => b.status === 'pending').length;
        const available = total - confirmed - pending - bookings.filter(b => b.status === 'cancelled').length;

        return { total, confirmed, pending, available };
    };

    const summary = getSummary();

    if (loading) {
        return (
            <div className="tw-flex tw-flex-col tw-justify-center tw-items-center tw-py-20">
                <Loading
                    text="กำลังโหลดข้อมูลการจอง..."
                    fullScreen={false}
                    color="blue"
                    size="lg"
                />
            </div>
        );
    }

    return (
        <div className="tw-space-y-6">
            {/* Summary Cards */}
            <div className="tw-grid tw-grid-cols-2 md:tw-grid-cols-4 tw-gap-4">
                <div className="tw-bg-white tw-rounded-2xl tw-p-5 tw-shadow-lg tw-border tw-border-slate-200 tw-transition-all tw-duration-300 hover:tw-shadow-xl hover:tw-scale-105">
                    <div className="tw-flex tw-items-center tw-justify-between tw-mb-2">
                        <div className="tw-text-3xl tw-font-bold tw-text-slate-800">{summary.total}</div>
                        <div className="tw-w-12 tw-h-12 tw-bg-gradient-to-br tw-from-blue-500 tw-to-blue-600 tw-rounded-xl tw-flex tw-items-center tw-justify-center tw-shadow-lg">
                            <Calendar className="tw-w-6 tw-h-6 tw-text-white" />
                        </div>
                    </div>
                    <div className="tw-text-sm tw-font-medium tw-text-slate-600">ช่วงเวลาทั้งหมด</div>
                    <div className="tw-text-xs tw-text-slate-400 tw-mt-1">Total Slots</div>
                </div>

                <div className="tw-bg-white tw-rounded-2xl tw-p-5 tw-shadow-lg tw-border tw-border-emerald-200 tw-transition-all tw-duration-300 hover:tw-shadow-xl hover:tw-scale-105">
                    <div className="tw-flex tw-items-center tw-justify-between tw-mb-2">
                        <div className="tw-text-3xl tw-font-bold tw-text-emerald-600">{summary.confirmed}</div>
                        <div className="tw-w-12 tw-h-12 tw-bg-gradient-to-br tw-from-emerald-500 tw-to-emerald-600 tw-rounded-xl tw-flex tw-items-center tw-justify-center tw-shadow-lg">
                            <span className="tw-text-2xl tw-text-white">✓</span>
                        </div>
                    </div>
                    <div className="tw-text-sm tw-font-medium tw-text-emerald-700">จองแล้ว</div>
                    <div className="tw-text-xs tw-text-emerald-500 tw-mt-1">Confirmed</div>
                </div>

                <div className="tw-bg-white tw-rounded-2xl tw-p-5 tw-shadow-lg tw-border tw-border-amber-200 tw-transition-all tw-duration-300 hover:tw-shadow-xl hover:tw-scale-105">
                    <div className="tw-flex tw-items-center tw-justify-between tw-mb-2">
                        <div className="tw-text-3xl tw-font-bold tw-text-amber-600">{summary.pending}</div>
                        <div className="tw-w-12 tw-h-12 tw-bg-gradient-to-br tw-from-amber-400 tw-to-amber-500 tw-rounded-xl tw-flex tw-items-center tw-justify-center tw-shadow-lg">
                            <Clock className="tw-w-6 tw-h-6 tw-text-white" />
                        </div>
                    </div>
                    <div className="tw-text-sm tw-font-medium tw-text-amber-700">รอชำระเงิน</div>
                    <div className="tw-text-xs tw-text-amber-500 tw-mt-1">Pending</div>
                </div>

                <div className="tw-bg-white tw-rounded-2xl tw-p-5 tw-shadow-lg tw-border tw-border-slate-200 tw-transition-all tw-duration-300 hover:tw-shadow-xl hover:tw-scale-105">
                    <div className="tw-flex tw-items-center tw-justify-between tw-mb-2">
                        <div className="tw-text-3xl tw-font-bold tw-text-slate-700">{summary.available}</div>
                        <div className="tw-w-12 tw-h-12 tw-bg-gradient-to-br tw-from-slate-400 tw-to-slate-500 tw-rounded-xl tw-flex tw-items-center tw-justify-center tw-shadow-lg">
                            <span className="tw-text-2xl tw-text-white">○</span>
                        </div>
                    </div>
                    <div className="tw-text-sm tw-font-medium tw-text-slate-600">ช่วงเวลาว่าง</div>
                    <div className="tw-text-xs tw-text-slate-400 tw-mt-1">Available</div>
                </div>
            </div>

            {/* Table Container */}
            <div className="tw-bg-white tw-rounded-2xl tw-shadow-xl tw-overflow-hidden tw-border tw-border-slate-200">
                <div className="tw-overflow-x-auto">
                    <table className="tw-min-w-full">
                        {/* Header */}
                        <thead>
                            <tr className="tw-bg-gradient-to-r tw-from-slate-100 tw-to-slate-50">
                                <th className="tw-px-4 tw-py-4 tw-text-left tw-text-xs tw-font-bold tw-text-slate-700 tw-uppercase tw-tracking-wider tw-border-r tw-border-slate-200 tw-sticky tw-left-0 tw-bg-gradient-to-r tw-from-slate-100 tw-to-slate-50 tw-z-10">
                                    <div className="tw-flex tw-items-center tw-gap-2">
                                        <Users className="tw-w-4 tw-h-4" />
                                        <span>สนาม</span>
                                    </div>
                                </th>
                                {timeSlots.map((time, index) => (
                                    <th key={time} className="tw-px-3 tw-py-4 tw-text-center tw-border-r tw-border-slate-200 tw-min-w-[90px]">
                                        <div className="tw-flex tw-flex-col tw-items-center tw-gap-1">
                                            <div className="tw-text-sm tw-font-bold tw-text-slate-700">{time}</div>
                                            <div className="tw-text-[10px] tw-text-slate-500 tw-font-medium">
                                                {index < timeSlots.length - 1 ? `- ${timeSlots[index + 1]}` : '- 20:00'}
                                            </div>
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>

                        {/* Body */}
                        <tbody className="tw-divide-y tw-divide-slate-200">
                            {courts.map(courtNumber => (
                                <tr key={courtNumber} className="hover:tw-bg-slate-50/50 tw-transition-colors tw-duration-150">
                                    <td className="tw-px-4 tw-py-3 tw-whitespace-nowrap tw-border-r tw-border-slate-200 tw-sticky tw-left-0 tw-bg-white hover:tw-bg-slate-50/50 tw-z-10">
                                        <div className="tw-flex tw-items-center tw-gap-3">
                                            <div className="tw-w-8 tw-h-8 tw-bg-gradient-to-br tw-from-blue-500 tw-to-blue-600 tw-rounded-lg tw-flex tw-items-center tw-justify-center tw-text-white tw-font-bold tw-text-sm tw-shadow-sm">
                                                {courtNumber}
                                            </div>
                                            <div>
                                                <div className="tw-text-sm tw-font-semibold tw-text-slate-800">
                                                    สนามที่ {courtNumber}
                                                </div>
                                                <div className="tw-text-xs tw-text-slate-500">Badminton Court</div>
                                            </div>
                                        </div>
                                    </td>
                                    {timeSlots.map(timeSlot => {
                                        const { status, user } = getBookingStatus(courtNumber, timeSlot);
                                        const { text, color, icon } = getStatusDisplay(status);
                                        const cellKey = `${courtNumber}-${timeSlot}`;
                                        const isHovered = hoveredCell === cellKey;

                                        return (
                                            <td
                                                key={cellKey}
                                                className="tw-px-2 tw-py-2 tw-text-center tw-border-r tw-border-slate-200"
                                                onMouseEnter={() => setHoveredCell(cellKey)}
                                                onMouseLeave={() => setHoveredCell(null)}
                                            >
                                                <div className={`
                          tw-px-3 tw-py-2.5 tw-rounded-xl tw-text-xs tw-font-semibold 
                          tw-min-h-[48px] tw-flex tw-flex-col tw-items-center tw-justify-center tw-gap-1
                          tw-transition-all tw-duration-200 tw-cursor-pointer
                          ${color}
                          ${isHovered ? 'tw-scale-105 tw-shadow-lg tw-z-20' : ''}
                        `}>
                                                    <span className="tw-text-base">{icon}</span>
                                                    <span className="tw-text-[11px] tw-leading-tight">{text}</span>
                                                    {user && isHovered && (
                                                        <span className="tw-text-[10px] tw-opacity-90 tw-mt-0.5">{user}</span>
                                                    )}
                                                </div>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Legend */}
            <div className="tw-bg-white tw-rounded-2xl tw-shadow-lg tw-p-6 tw-border tw-border-slate-200">
                <h3 className="tw-text-sm tw-font-bold tw-text-slate-700 tw-mb-4 tw-flex tw-items-center tw-gap-2">
                    <div className="tw-w-1 tw-h-5 tw-bg-blue-600 tw-rounded-full"></div>
                    คำอธิบายสถานะ
                </h3>
                <div className="tw-grid tw-grid-cols-2 md:tw-grid-cols-5 tw-gap-4">
                    <div className="tw-flex tw-items-center tw-gap-3 tw-p-3 tw-bg-emerald-50 tw-rounded-xl tw-border tw-border-emerald-200">
                        <div className="tw-w-10 tw-h-10 tw-bg-gradient-to-br tw-from-emerald-500 tw-to-emerald-600 tw-rounded-lg tw-flex tw-items-center tw-justify-center tw-text-white tw-font-bold tw-shadow-sm">
                            ✓
                        </div>
                        <div>
                            <div className="tw-text-xs tw-font-bold tw-text-emerald-800">จองแล้ว</div>
                            <div className="tw-text-[10px] tw-text-emerald-600">Confirmed</div>
                        </div>
                    </div>

                    <div className="tw-flex tw-items-center tw-gap-3 tw-p-3 tw-bg-amber-50 tw-rounded-xl tw-border tw-border-amber-200">
                        <div className="tw-w-10 tw-h-10 tw-bg-gradient-to-br tw-from-amber-400 tw-to-amber-500 tw-rounded-lg tw-flex tw-items-center tw-justify-center tw-text-white tw-font-bold tw-shadow-sm">
                            ⏳
                        </div>
                        <div>
                            <div className="tw-text-xs tw-font-bold tw-text-amber-800">รอชำระเงิน</div>
                            <div className="tw-text-[10px] tw-text-amber-600">Pending</div>
                        </div>
                    </div>

                    <div className="tw-flex tw-items-center tw-gap-3 tw-p-3 tw-bg-gray-50 tw-rounded-xl tw-border tw-border-gray-200">
                        <div className="tw-w-10 tw-h-10 tw-bg-gradient-to-br tw-from-gray-400 tw-to-gray-500 tw-rounded-lg tw-flex tw-items-center tw-justify-center tw-text-white tw-font-bold tw-shadow-sm">
                            ✕
                        </div>
                        <div>
                            <div className="tw-text-xs tw-font-bold tw-text-gray-800">ยกเลิกแล้ว</div>
                            <div className="tw-text-[10px] tw-text-gray-600">Cancelled</div>
                        </div>
                    </div>

                    <div className="tw-flex tw-items-center tw-gap-3 tw-p-3 tw-bg-orange-50 tw-rounded-xl tw-border tw-border-orange-200">
                        <div className="tw-w-10 tw-h-10 tw-bg-gradient-to-br tw-from-orange-400 tw-to-orange-500 tw-rounded-lg tw-flex tw-items-center tw-justify-center tw-text-white tw-font-bold tw-shadow-sm">
                            🍽️
                        </div>
                        <div>
                            <div className="tw-text-xs tw-font-bold tw-text-orange-800">พักเที่ยง</div>
                            <div className="tw-text-[10px] tw-text-orange-600">Lunch Break</div>
                        </div>
                    </div>

                    <div className="tw-flex tw-items-center tw-gap-3 tw-p-3 tw-bg-slate-50 tw-rounded-xl tw-border tw-border-slate-200">
                        <div className="tw-w-10 tw-h-10 tw-bg-gradient-to-br tw-from-slate-100 tw-to-slate-200 tw-rounded-lg tw-flex tw-items-center tw-justify-center tw-text-slate-600 tw-font-bold tw-border tw-border-slate-300">
                            ○
                        </div>
                        <div>
                            <div className="tw-text-xs tw-font-bold tw-text-slate-800">ว่าง</div>
                            <div className="tw-text-[10px] tw-text-slate-600">Available</div>
                        </div>
                    </div>
                </div>
            </div>

            {bookings.length === 0 && !loading && (
                <div className="tw-text-center tw-py-16 tw-bg-white tw-rounded-2xl tw-shadow-lg tw-border tw-border-slate-200">
                    <div className="tw-text-6xl tw-mb-4">📅</div>
                    <div className="tw-text-lg tw-font-semibold tw-text-slate-700 tw-mb-2">
                        ไม่มีข้อมูลการจอง
                    </div>
                    <div className="tw-text-sm tw-text-slate-500">
                        ยังไม่มีการจองสนามในวันนี้
                    </div>
                </div>
            )}
        </div>
    );
};

// RefreshStatus Component
const RefreshStatus = ({ countdown, lastUpdate, error }: { countdown: number, lastUpdate: Date | null, error: string | null }) => {
    const formatTime = (date: Date | null) => {
        if (!date) return '--:--:--';
        return date.toLocaleTimeString('th-TH', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            timeZone: 'Asia/Bangkok'
        });
    };

    return (
        <div className="tw-flex tw-flex-col sm:tw-flex-row tw-items-start sm:tw-items-center tw-justify-between tw-gap-4 tw-mb-6">
            {error ? (
                <div className="tw-flex tw-items-center tw-gap-2 tw-px-4 tw-py-2 tw-bg-red-50 tw-border tw-border-red-200 tw-rounded-xl tw-text-red-700">
                    <AlertCircle className="tw-w-4 tw-h-4" />
                    <span className="tw-text-sm tw-font-medium">{error}</span>
                </div>
            ) : (
                <div className="tw-flex tw-items-center tw-gap-4">
                    <div className="tw-flex tw-items-center tw-gap-2 tw-px-4 tw-py-2 tw-bg-blue-50 tw-border tw-border-blue-200 tw-rounded-xl">
                        <Clock className="tw-w-4 tw-h-4 tw-text-blue-600" />
                        <span className="tw-text-sm tw-font-medium tw-text-blue-700">
                            อัปเดตล่าสุด: {formatTime(lastUpdate)}
                        </span>
                    </div>
                    <div className="tw-flex tw-items-center tw-gap-2 tw-px-4 tw-py-2 tw-bg-emerald-50 tw-border tw-border-emerald-200 tw-rounded-xl">
                        <RefreshCw className={`tw-w-4 tw-h-4 tw-text-emerald-600 ${countdown <= 5 ? 'tw-animate-spin' : ''}`} />
                        <span className="tw-text-sm tw-font-medium tw-text-emerald-700">
                            รีเฟรชใน {countdown} วินาที
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BookingTable;