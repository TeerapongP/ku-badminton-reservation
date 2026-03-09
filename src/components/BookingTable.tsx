import React, { useState } from 'react';
import { Calendar, Clock, Users, RefreshCw, AlertCircle } from 'lucide-react';

import Loading from './Loading';
import { useRouter } from 'next/navigation';
import { BookingTableProps } from '@/lib/BookingTableProps';

/** ====== Utils (คงโครงเดิม + ใช้ซ้ำทั้ง 2 layout) ====== */
const timeSlots: string[] = Array.from({ length: 11 }, (_, i) =>
    `${(9 + i).toString().padStart(2, '0')}:00`
); // 09:00 - 19:00

// ฟังก์ชั่นสำหรับแปลง court_code เป็นตัวเลข (ใช้เหมือนกันในฝั่ง backend)
function parseCourtNumber(courtCode: string | undefined, fallback: number): number {
    if (!courtCode) return fallback;
    const digits = courtCode.replace(/\D/g, '');
    if (!digits) return fallback;
    const n = Number.parseInt(digits, 10);
    return Number.isFinite(n) ? n : fallback;
}

const getStatusDisplay = (status: string) => {
    switch (status) {
        case 'confirmed':
            return {
                text: 'ไม่ว่าง',
                color:
                    'tw-bg-gradient-to-br tw-from-red-500 tw-to-red-600 tw-text-white tw-shadow-sm',
                chip:
                    'tw-bg-red-100 tw-text-red-800 tw-border tw-border-red-200 hover:tw-bg-red-200',
                icon: '✓',
            };
        case 'pending':
            return {
                text: 'รอตรวจสอบ',
                color:
                    'tw-bg-gradient-to-br tw-from-amber-400 tw-to-amber-500 tw-text-white tw-shadow-sm',
                chip:
                    'tw-bg-amber-100 tw-text-amber-800 tw-border tw-border-amber-200 hover:tw-bg-amber-200',
                icon: '⏳',
            };
        case 'cancelled':
            return {
                text: 'ปิดกั้น',
                color:
                    'tw-bg-gradient-to-br tw-from-gray-400 tw-to-gray-500 tw-text-white tw-shadow-sm',
                chip:
                    'tw-bg-gray-100 tw-text-gray-700 tw-border tw-border-gray-200 hover:tw-bg-gray-200',
                icon: '✕',
            };
        case 'lunch_break':
            return {
                text: 'พักเที่ยง',
                color:
                    'tw-bg-gradient-to-br tw-from-gray-400 tw-to-gray-500 tw-text-white tw-shadow-sm',
                chip:
                    'tw-bg-gray-100 tw-text-gray-700 tw-border tw-border-gray-200 cursor-not-allowed',
                icon: '',
            };
        case 'available':
        default:
            return {
                text: 'ว่าง',
                color:
                    'tw-bg-gradient-to-br tw-from-green-500 tw-to-green-600 tw-text-white tw-shadow-sm',
                chip:
                    'tw-bg-green-100 tw-text-green-800 tw-border tw-border-green-200 hover:tw-bg-green-200 tw-cursor-pointer',
                icon: '○',
            };
    }
};

const getBookingStatus = (
    bookings: any[],
    courtNumber: number,
    timeSlot: string
) => {
    if (timeSlot === '12:00') return { status: 'lunch_break', user: '' };

    const booking = bookings.find(
        (b) => b.court_number === courtNumber && b.time_slot === timeSlot
    );
    if (!booking) return { status: 'available', user: '' };
    return { status: booking.status, user: booking.user_name };
};

/** ====== Mobile Card (แสดงเมื่อ < md) ====== */
const MobileCourtCard = ({
    courtObj,
    index,
    bookings,
    onAvailableClick,
}: {
    courtObj: any;
    index: number;
    bookings: any[];
    onAvailableClick: (courtNumber: number, timeSlot: string) => void;
}) => {
    const courtNumber = typeof courtObj === 'number' ? courtObj : parseCourtNumber(courtObj?.court_code, index + 1);
    const courtName = typeof courtObj === 'number' ? `สนามที่ ${courtObj}` : (courtObj?.name || `สนามที่ ${courtNumber}`);
    const courtDisplayNum = typeof courtObj === 'number' ? courtObj : (courtObj?.court_code ? courtObj.court_code.split('-').pop()?.replace('C', '') : courtNumber);

    return (
        <div className="tw-bg-white tw-rounded-2xl tw-shadow-sm tw-p-4 tw-border tw-border-slate-200">
            <div className="tw-flex tw-items-center tw-justify-between tw-mb-4 tw-pb-3 tw-border-b tw-border-slate-100">
                <div className="tw-flex tw-items-center tw-gap-3">
                    <div className="tw-w-10 tw-h-10 tw-bg-gradient-to-br tw-from-blue-50 tw-to-slate-50 tw-text-blue-600 tw-rounded-xl tw-flex tw-items-center tw-justify-center tw-font-bold tw-text-lg tw-shadow-sm tw-border tw-border-blue-100">
                        {courtDisplayNum}
                    </div>
                    <div>
                        <div className="tw-font-bold tw-text-slate-800 tw-text-base">{courtName}</div>
                        <div className="tw-text-xs tw-text-slate-500 tw-font-medium">Badminton Court</div>
                    </div>
                </div>
            </div>

            {/* แถบเวลาวนเป็นชิป */}
            <div className="tw-flex tw-flex-wrap tw-gap-2">
                {timeSlots.map((t) => {
                    const { status } = getBookingStatus(bookings, courtNumber, t);
                    const map = getStatusDisplay(status);
                    const disabled =
                        status !== 'available' || t === '12:00' || status === 'lunch_break';
                    return (
                        <button
                            key={`${courtNumber}-${t}`}
                            type="button"
                            onClick={() => !disabled && onAvailableClick(courtNumber, t)}
                            className={`tw-text-[11px] tw-px-2.5 tw-py-1.5 tw-rounded-full tw-font-medium tw-transition tw-duration-150 focus:tw-outline-none ${map.chip} ${disabled ? 'tw-cursor-not-allowed tw-opacity-80' : ''
                                }`}
                            aria-label={`${t} - ${map.text}`}
                        >
                            {t} • {map.text}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

/** ====== Desktop Table (แสดงเมื่อ >= md) ====== */
const DesktopTable = ({
    bookings,
    courts,
    loading,
    onAvailableClick,
    hoveredCell,
    setHoveredCell,
}: {
    bookings: any[];
    courts: any[];
    loading: boolean;
    onAvailableClick: (courtNumber: number, timeSlot: string) => void;
    hoveredCell: string | null;
    setHoveredCell: (k: string | null) => void;
}) => {
    if (loading) {
        return (
            <div className="tw-flex tw-justify-center tw-items-center tw-py-12">
                <Loading text="กำลังโหลดข้อมูลการจอง..." fullScreen={false} color="blue" size="lg" />
            </div>
        );
    }

    return (
        <div className="tw-bg-white tw-rounded-2xl tw-shadow-xl tw-overflow-hidden tw-border tw-border-slate-200">
            <div className="tw-overflow-x-auto tw-relative">
                <table className="tw-min-w-full tw-text-sm">
                    <thead>
                        <tr className="tw-bg-gradient-to-r tw-from-slate-100 tw-to-slate-50">
                            <th className="tw-px-4 tw-py-4 tw-text-left tw-text-xs tw-font-bold tw-text-slate-700 tw-uppercase tw-tracking-wider tw-border-r tw-border-slate-200 tw-sticky tw-left-0 tw-bg-gradient-to-r tw-from-slate-100 tw-to-slate-50 tw-z-10">
                                <div className="tw-flex tw-items-center tw-gap-2">
                                    <Users className="tw-w-4 tw-h-4" />
                                    <span>สนาม</span>
                                </div>
                            </th>
                            {timeSlots.map((time, index) => (
                                <th
                                    key={time}
                                    className="tw-px-3 tw-py-4 tw-text-center tw-border-r tw-border-slate-200 tw-min-w-[90px]"
                                >
                                    <div className="tw-flex tw-flex-col tw-items-center tw-gap-1">
                                        <div className="tw-text-sm tw-font-bold tw-text-slate-700">
                                            {time}
                                        </div>
                                        <div className="tw-text-[10px] tw-text-slate-500 tw-font-medium">
                                            {index < timeSlots.length - 1
                                                ? `- ${timeSlots[index + 1]}`
                                                : '- 20:00'}
                                        </div>
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>

                    <tbody className="tw-divide-y tw-divide-slate-200">
                        {courts.map((courtObj, index) => {
                            const courtNumber = typeof courtObj === 'number' ? courtObj : parseCourtNumber(courtObj?.court_code, index + 1);
                            const courtName = typeof courtObj === 'number' ? `สนามที่ ${courtObj}` : (courtObj?.name || `สนามที่ ${courtNumber}`);
                            const courtDisplayNum = typeof courtObj === 'number' ? courtObj : (courtObj?.court_code ? courtObj.court_code.split('-').pop()?.replace('C', '') : courtNumber);

                            return (
                                <tr
                                    key={`court-${courtNumber}-${index}`}
                                    className="hover:tw-bg-slate-50/50 tw-transition-colors tw-duration-150"
                                >
                                    <td className="tw-px-4 tw-py-3 tw-whitespace-nowrap tw-border-r tw-border-slate-200 tw-sticky tw-left-0 tw-bg-white hover:tw-bg-slate-50/50 tw-z-10">
                                        <div className="tw-flex tw-items-center tw-gap-3">
                                            <div className="tw-w-8 tw-h-8 tw-bg-gradient-to-br tw-from-blue-500 tw-to-blue-600 tw-rounded-lg tw-flex tw-items-center tw-justify-center tw-text-white tw-font-bold tw-text-sm tw-shadow-sm">
                                                {courtDisplayNum}
                                            </div>
                                            <div>
                                                <div className="tw-text-sm tw-font-semibold tw-text-slate-800">
                                                    {courtName}
                                                </div>
                                                <div className="tw-text-xs tw-text-slate-500">
                                                    Badminton Court
                                                </div>
                                            </div>
                                        </div>
                                    </td>

                                    {timeSlots.map((t) => {
                                        const { status } = getBookingStatus(bookings, courtNumber, t);
                                        const map = getStatusDisplay(status);
                                        const cellKey = `${courtNumber}-${t}`;
                                        const isHovered = hoveredCell === cellKey;
                                        const clickable = status === 'available';

                                        return (
                                            <td
                                                key={cellKey}
                                                className="tw-px-2 tw-py-2 tw-text-center tw-border-r tw-border-slate-200"
                                                onMouseEnter={() => setHoveredCell(cellKey)}
                                                onMouseLeave={() => setHoveredCell(null)}
                                            >
                                                <div
                                                    className={`
                          tw-px-3 tw-py-2.5 tw-rounded-xl tw-text-xs tw-font-semibold 
                          tw-min-h-full tw-flex tw-flex-col tw-items-center tw-justify-center tw-gap-1
                          tw-transition-all tw-duration-200 ${clickable ? 'tw-cursor-pointer hover:tw-scale-105' : 'tw-cursor-default'
                                                        }
                          ${map.color}
                          ${isHovered ? 'tw-scale-105 tw-shadow-lg tw-z-20' : ''}
                        `}
                                                    onClick={() => clickable && onAvailableClick(courtNumber, t)}
                                                >
                                                    <div className="tw-flex tw-items-center tw-gap-1">
                                                        <span className="tw-text-base">{map.icon}</span>
                                                        <span className="tw-text-md tw-leading-tight">{map.text}</span>
                                                    </div>
                                                </div>
                                            </td>
                                        );
                                    })}
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

/** ====== Main Component (เลือก layout อัตโนมัติด้วยคลาส tailwind) ====== */
const BookingTable = ({ bookings = [], courts = [], loading = false }: BookingTableProps) => {
    const [hoveredCell, setHoveredCell] = useState<string | null>(null);
    const router = useRouter();

    const handleAvailableSlotClick = (courtNumber: number, timeSlot: string) => {
        router.push(`/courts-booking/${courtNumber}?time_slot=${timeSlot}`);
    };

    const getSummary = () => {
        if (!courts || courts.length === 0) {
            return { total: 'ไม่มีค่า', confirmed: 'ไม่มีค่า', pending: 'ไม่มีค่า', available: 'ไม่มีค่า' };
        }
        const total = courts.length * timeSlots.length;
        const confirmed = bookings.filter((b) => b.status === 'confirmed').length;
        const pending = bookings.filter((b) => b.status === 'pending').length;
        const cancelled = bookings.filter((b) => b.status === 'cancelled').length;
        const lunch = courts.length; // 1 ช่องต่อคอร์ทที่ 12:00
        const available = total - confirmed - pending - cancelled - lunch;
        return { total, confirmed, pending, available };
    };

    const summary = getSummary();

    if (loading) {
        return (
            <div className="tw-flex tw-flex-col tw-justify-center tw-items-center tw-py-20">
                <Loading text="กำลังโหลดข้อมูลการจอง..." fullScreen={false} color="blue" size="lg" />
            </div>
        );
    }

    return (
        <div className="tw-space-y-6">
            {/* Summary Cards */}
            <div className="tw-grid tw-grid-cols-2 md:tw-grid-cols-4 tw-gap-4">
                <div className="tw-bg-white tw-rounded-2xl tw-p-5 tw-shadow-lg tw-border tw-border-slate-200 tw-transition-all tw-duration-300 hover:tw-shadow-xl hover:tw-scale-105">
                    <div className="tw-flex tw-items-center tw-justify-between tw-mb-2">
                        <div className="tw-text-3xl tw-font-bold tw-text-slate-800">
                            {summary.total} <span className="tw-text-lg tw-text-gray-600">ชั่วโมง</span>
                        </div>
                        <div className="tw-w-12 tw-h-12 tw-bg-gradient-to-br tw-from-blue-500 tw-to-blue-600 tw-rounded-xl tw-flex tw-items-center tw-justify-center tw-shadow-lg">
                            <Calendar className="tw-w-6 tw-h-6 tw-text-white" />
                        </div>
                    </div>
                    <div className="tw-text-sm tw-font-medium tw-text-slate-600">ช่วงเวลาทั้งหมด</div>
                    <div className="tw-text-xs tw-text-slate-400 tw-mt-1">Total Slots</div>
                </div>

                <div className="tw-bg-white tw-rounded-2xl tw-p-5 tw-shadow-lg tw-border tw-border-red-200 tw-transition-all tw-duration-300 hover:tw-shadow-xl hover:tw-scale-105">
                    <div className="tw-flex tw-items-center tw-justify-between tw-mb-2">
                        <div className="tw-text-3xl tw-font-bold tw-text-red-600">
                            {summary.confirmed} <span className="tw-text-lg tw-text-gray-600">คอร์ท</span>
                        </div>
                        <div className="tw-w-12 tw-h-12 tw-bg-gradient-to-br tw-from-red-500 tw-to-red-600 tw-rounded-xl tw-flex tw-items-center tw-justify-center tw-shadow-lg">
                            <span className="tw-text-2xl tw-text-white">✓</span>
                        </div>
                    </div>
                    <div className="tw-text-sm tw-font-medium tw-text-red-700">คอร์ท</div>
                    <div className="tw-text-xs tw-text-red-500 tw-mt-1">Confirmed</div>
                </div>

                <div className="tw-bg-white tw-rounded-2xl tw-p-5 tw-shadow-lg tw-border tw-border-amber-200 tw-transition-all tw-duration-300 hover:tw-shadow-xl hover:tw-scale-105">
                    <div className="tw-flex tw-items-center tw-justify-between tw-mb-2">
                        <div className="tw-text-3xl tw-font-bold tw-text-amber-600">
                            {summary.pending} <span className="tw-text-lg tw-text-gray-600">รายการ</span>
                        </div>
                        <div className="tw-w-12 tw-h-12 tw-bg-gradient-to-br tw-from-amber-400 tw-to-amber-500 tw-rounded-xl tw-flex tw-items-center tw-justify-center tw-shadow-lg">
                            <Clock className="tw-w-6 tw-h-6 tw-text-white" />
                        </div>
                    </div>
                    <div className="tw-text-sm tw-font-medium tw-text-amber-700">รอตรวจสอบ</div>
                    <div className="tw-text-xs tw-text-amber-500 tw-mt-1">Pending</div>
                </div>

                <div className="tw-bg-white tw-rounded-2xl tw-p-5 tw-shadow-lg tw-border tw-border-green-200 tw-transition-all tw-duration-300 hover:tw-shadow-xl hover:tw-scale-105">
                    <div className="tw-flex tw-items-center tw-justify-between tw-mb-2">
                        <div className="tw-text-3xl tw-font-bold tw-text-green-600">
                            {summary.available} <span className="tw-text-lg tw-text-gray-600">ชั่วโมง</span>
                        </div>
                        <div className="tw-w-12 tw-h-12 tw-bg-gradient-to-br tw-from-green-500 tw-to-green-600 tw-rounded-xl tw-flex tw-items-center tw-justify-center tw-shadow-lg">
                            <span className="tw-text-2xl tw-text-white">○</span>
                        </div>
                    </div>
                    <div className="tw-text-sm tw-font-medium tw-text-green-700">ช่วงเวลาว่าง</div>
                    <div className="tw-text-xs tw-text-green-500 tw-mt-1">Available</div>
                </div>
            </div>

            {/* Desktop Table */}
            {courts && courts.length > 0 && (
                <div className="tw-hidden md:tw-block">
                    <DesktopTable
                        bookings={bookings}
                        courts={courts}
                        loading={loading}
                        onAvailableClick={handleAvailableSlotClick}
                        hoveredCell={hoveredCell}
                        setHoveredCell={setHoveredCell}
                    />
                </div>
            )}

            {/* Mobile Cards */}
            {courts && courts.length > 0 && (
                <div className="tw-grid tw-grid-cols-1 tw-gap-3 md:tw-hidden">
                    {courts.map((c, index) => (
                        <MobileCourtCard
                            key={`mobile-court-${index}`}
                            courtObj={c}
                            index={index}
                            bookings={bookings}
                            onAvailableClick={handleAvailableSlotClick}
                        />
                    ))}
                </div>
            )}

            {(!courts || courts.length === 0) && !loading && (
                <div className="tw-text-center tw-py-16 tw-bg-white tw-rounded-2xl tw-shadow-lg tw-border tw-border-slate-200">
                    <div className="tw-text-6xl tw-mb-4">📅</div>
                    <div className="tw-text-lg tw-font-semibold tw-text-slate-700 tw-mb-2">
                        ไม่มีข้อมูลสนาม
                    </div>
                    <div className="tw-text-sm tw-text-slate-500">ยังไม่มีข้อมูลสนามในวันนี้</div>
                </div>
            )}

            {/* Legend */}
            <div className="tw-bg-white tw-rounded-2xl tw-shadow-lg tw-p-6 tw-border tw-border-slate-200">
                <h3 className="tw-text-sm tw-font-bold tw-text-slate-700 tw-mb-4 tw-flex tw-items-center tw-gap-2">
                    <div className="tw-w-1 tw-h-5 tw-bg-blue-600 tw-rounded-full"></div>
                    คำอธิบายสถานะ
                </h3>
                <div className="tw-grid tw-grid-cols-2 md:tw-grid-cols-5 tw-gap-4">
                    <div className="tw-flex tw-items-center tw-gap-3 tw-p-3 tw-bg-green-50 tw-rounded-xl tw-border tw-border-green-200">
                        <div className="tw-w-10 tw-h-10 tw-bg-gradient-to-br tw-from-green-500 tw-to-green-600 tw-rounded-lg tw-flex tw-items-center tw-justify-center tw-text-white tw-font-bold tw-shadow-sm">
                            ○
                        </div>
                        <div>
                            <div className="tw-text-xs tw-font-bold tw-text-green-800">ว่าง</div>
                            <div className="tw-text-[10px] tw-text-green-600">Available</div>
                        </div>
                    </div>

                    <div className="tw-flex tw-items-center tw-gap-3 tw-p-3 tw-bg-amber-50 tw-rounded-xl tw-border tw-border-amber-200">
                        <div className="tw-w-10 tw-h-10 tw-bg-gradient-to-br tw-from-amber-400 tw-to-amber-500 tw-rounded-lg tw-flex tw-items-center tw-justify-center tw-text-white tw-font-bold tw-shadow-sm">
                            ⏳
                        </div>
                        <div>
                            <div className="tw-text-xs tw-font-bold tw-text-amber-800">รอตรวจสอบ</div>
                            <div className="tw-text-[10px] tw-text-amber-600">Pending</div>
                        </div>
                    </div>

                    <div className="tw-flex tw-items-center tw-gap-3 tw-p-3 tw-bg-red-50 tw-rounded-xl tw-border tw-border-red-200">
                        <div className="tw-w-10 tw-h-10 tw-bg-gradient-to-br tw-from-red-500 tw-to-red-600 tw-rounded-lg tw-flex tw-items-center tw-justify-center tw-text-white tw-font-bold tw-shadow-sm">
                            ✓
                        </div>
                        <div>
                            <div className="tw-text-xs tw-font-bold tw-text-red-800">ไม่ว่าง</div>
                            <div className="tw-text-[10px] tw-text-red-600">Confirmed</div>
                        </div>
                    </div>

                    <div className="tw-flex tw-items-center tw-gap-3 tw-p-3 tw-bg-gray-50 tw-rounded-xl tw-border tw-border-gray-200">
                        <div className="tw-w-10 tw-h-10 tw-bg-gradient-to-br tw-from-gray-400 tw-to-gray-500 tw-rounded-lg tw-flex tw-items-center tw-justify-center tw-text-white tw-font-bold tw-shadow-sm">
                            ✕
                        </div>
                        <div>
                            <div className="tw-text-xs tw-font-bold tw-text-gray-800">ปิดกั้น</div>
                            <div className="tw-text-[10px] tw-text-gray-600">Blocked</div>
                        </div>
                    </div>

                    <div className="tw-flex tw-items-center tw-gap-3 tw-p-3 tw-bg-gray-50 tw-rounded-xl tw-border tw-border-gray-200">
                        <div>
                            <div className="tw-text-xs tw-font-bold tw-text-gray-800">พักเที่ยง</div>
                        </div>
                    </div>
                </div>
            </div>


        </div>
    );
};

export default BookingTable;

/** ====== (ออปชัน) RefreshStatus เดิม ใช้ต่อได้เหมือนเดิม ====== */
export const RefreshStatus = ({
    countdown,
    lastUpdate,
    error,
}: {
    countdown: number;
    lastUpdate: Date | null;
    error: string | null;
}) => {
    const formatTime = (date: Date | null) => {
        if (!date) return '--:--:--';
        return date.toLocaleTimeString('th-TH', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            timeZone: 'Asia/Bangkok',
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
                <div className="tw-flex tw-items-center tw-gap-2 sm:tw-gap-4">
                    <div className="tw-flex tw-items-center tw-gap-2 tw-px-3 sm:tw-px-4 tw-py-2 tw-bg-blue-50 tw-border tw-border-blue-200 tw-rounded-xl">
                        <Clock className="tw-w-4 tw-h-4 tw-text-blue-600" />
                        <span className="tw-text-xs sm:tw-text-sm tw-font-medium tw-text-blue-700">
                            อัปเดตล่าสุด: {formatTime(lastUpdate)}
                        </span>
                    </div>
                    <div className="tw-flex tw-items-center tw-gap-2 tw-px-3 sm:tw-px-4 tw-py-2 tw-bg-emerald-50 tw-border tw-border-emerald-200 tw-rounded-xl">
                        <RefreshCw
                            className={`tw-w-4 tw-h-4 tw-text-emerald-600 ${countdown <= 5 ? 'tw-animate-spin' : ''
                                }`}
                        />
                        <span className="tw-text-xs sm:tw-text-sm tw-font-medium tw-text-emerald-700">
                            รีเฟรชใน {countdown} วินาที
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
};
