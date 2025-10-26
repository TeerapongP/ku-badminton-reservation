"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/ToastProvider";
import { Button } from "@/components/Button";
import Loading from "@/components/Loading";
import { DropdownField } from "@/components/DropdownField";
import { DateField } from "@/components/DateField";
import SearchInput from "@/components/SearchInput";
import {
    Clock,
    User,
    MapPin,
    Eye,
    CheckCircle,
    XCircle,
    AlertTriangle,
    X,
    Calendar,
    Phone,
    Mail,
    CreditCard,
    FileText,
    Download,
    RefreshCw,
    ArrowLeft,
    Activity,
} from "lucide-react";
import { Booking } from "@/lib/Booking";
const STATUS_CONFIG = {
    pending: {
        icon: Clock,
        color: 'tw-text-yellow-600',
        bg: 'tw-bg-yellow-50',
        border: 'tw-border-yellow-200',
        label: 'รอยืนยัน'
    },
    confirmed: {
        icon: CheckCircle,
        color: 'tw-text-green-600',
        bg: 'tw-bg-green-50',
        border: 'tw-border-green-200',
        label: 'ยืนยันแล้ว'
    },
    cancelled: {
        icon: XCircle,
        color: 'tw-text-red-600',
        bg: 'tw-bg-red-50',
        border: 'tw-border-red-200',
        label: 'ยกเลิก'
    },
    completed: {
        icon: CheckCircle,
        color: 'tw-text-blue-600',
        bg: 'tw-bg-blue-50',
        border: 'tw-border-blue-200',
        label: 'เสร็จสิ้น'
    },
    no_show: {
        icon: AlertTriangle,
        color: 'tw-text-orange-600',
        bg: 'tw-bg-orange-50',
        border: 'tw-border-orange-200',
        label: 'ไม่มาใช้'
    }
} as const;

const PAYMENT_STATUS_CONFIG = {
    unpaid: { color: 'tw-text-red-600', bg: 'tw-bg-red-50', label: 'ยังไม่ชำระ' },
    partial: { color: 'tw-text-yellow-600', bg: 'tw-bg-yellow-50', label: 'ชำระบางส่วน' },
    paid: { color: 'tw-text-green-600', bg: 'tw-bg-green-50', label: 'ชำระแล้ว' },
    refunded: { color: 'tw-text-gray-600', bg: 'tw-bg-gray-50', label: 'คืนเงินแล้ว' }
} as const;

const ROLE_CONFIG = {
    student: { label: 'นิสิต', color: 'tw-text-blue-600', bg: 'tw-bg-blue-50' },
    staff: { label: 'บุคลากร', color: 'tw-text-green-600', bg: 'tw-bg-green-50' },
    admin: { label: 'ผู้ดูแลระบบ', color: 'tw-text-purple-600', bg: 'tw-bg-purple-50' },
    guest: { label: 'บุคคลภายนอก', color: 'tw-text-gray-600', bg: 'tw-bg-gray-50' }
} as const;

export default function AdminBookingsContainer() {
    const router = useRouter();
    const { data: session, status } = useSession();
    const toast = useToast();

    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [filterStatus, setFilterStatus] = useState<string>("all");
    const [filterPaymentStatus, setFilterPaymentStatus] = useState<string>("all");
    const [filterRole, setFilterRole] = useState<string>("all");

    const [dateRange, setDateRange] = useState<{
        start: Date | null;
        end: Date | null;
    }>({
        start: new Date(),
        end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Next 7 days
    });

    // Dropdown options
    const statusOptions = [
        { label: 'ทั้งหมด', value: 'all' },
        { label: 'รอยืนยัน', value: 'pending' },
        { label: 'ยืนยันแล้ว', value: 'confirmed' },
        { label: 'ยกเลิก', value: 'cancelled' },
        { label: 'เสร็จสิ้น', value: 'completed' },
        { label: 'ไม่มาใช้', value: 'no_show' },
    ];

    const paymentStatusOptions = [
        { label: 'ทั้งหมด', value: 'all' },
        { label: 'ยังไม่ชำระ', value: 'unpaid' },
        { label: 'ชำระบางส่วน', value: 'partial' },
        { label: 'ชำระแล้ว', value: 'paid' },
        { label: 'คืนเงินแล้ว', value: 'refunded' },
    ];

    const roleOptions = [
        { label: 'ทั้งหมด', value: 'all' },
        { label: 'นิสิต', value: 'student' },
        { label: 'บุคลากร', value: 'staff' },
        { label: 'ผู้ดูแลระบบ', value: 'admin' },
        { label: 'บุคคลภายนอก', value: 'guest' },
    ];
    // Utility functions
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('th-TH', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const formatCurrency = (amount: number, currency: string) => {
        return new Intl.NumberFormat('th-TH', {
            style: 'currency',
            currency: currency || 'THB'
        }).format(amount);
    };

    const formatDateTime = (dateString: string) => {
        return new Date(dateString).toLocaleString('th-TH', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Load bookings data
    useEffect(() => {
        const loadBookings = async () => {
            setLoading(true);
            try {
                // TODO: Replace with actual API call
                // const response = await fetch('/api/admin/bookings');
                // const data = await response.json();
                // setBookings(data);

                // For now, use mock data
                setTimeout(() => {
                    setBookings([]);
                    setLoading(false);
                }, 1000);
            } catch (error) {
                console.error('Error loading bookings:', error);
                toast?.showError('เกิดข้อผิดพลาดในการโหลดข้อมูล');
                setLoading(false);
            }
        };

        loadBookings();
    }, [toast]);

    // Filter bookings based on search and filters
    const filteredBookings = useMemo(() => {
        return bookings.filter(booking => {
            // Search filter
            if (searchTerm) {
                const searchLower = searchTerm.toLowerCase();
                const matchesSearch =
                    booking.reservation_id.toLowerCase().includes(searchLower) ||
                    booking.user_name.toLowerCase().includes(searchLower) ||
                    booking.user_email.toLowerCase().includes(searchLower) ||
                    booking.facility_name.toLowerCase().includes(searchLower) ||
                    booking.court_name.toLowerCase().includes(searchLower);

                if (!matchesSearch) return false;
            }

            // Status filter
            if (filterStatus !== 'all' && booking.status !== filterStatus) {
                return false;
            }

            // Payment status filter
            if (filterPaymentStatus !== 'all' && booking.payment_status !== filterPaymentStatus) {
                return false;
            }

            // Role filter
            if (filterRole !== 'all' && booking.user_role !== filterRole) {
                return false;
            }

            // Date range filter
            if (dateRange.start || dateRange.end) {
                const bookingDate = new Date(booking.play_date);
                if (dateRange.start && bookingDate < dateRange.start) return false;
                if (dateRange.end && bookingDate > dateRange.end) return false;
            }

            return true;
        });
    }, [bookings, searchTerm, filterStatus, filterPaymentStatus, filterRole, dateRange]);

    const handleRefresh = () => {
        setLoading(true);
        setTimeout(() => {
            setBookings([]);
            setLoading(false);
            toast?.showSuccess('รีเฟรชข้อมูลสำเร็จ');
        }, 1000);
    };

    const handleExport = () => {
        // TODO: Implement export functionality
        toast?.showInfo('กำลังดาวน์โหลดข้อมูล...');
    };

    const clearFilters = () => {
        setFilterStatus('all');
        setFilterPaymentStatus('all');
        setFilterRole('all');
        setSearchTerm('');
        setDateRange({
            start: new Date(),
            end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        });
    };

    const viewBookingDetail = (booking: Booking) => {
        setSelectedBooking(booking);
        setShowDetailModal(true);
    };

    const getStatusBadge = (status: string) => {
        const statusConfig = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG];
        const StatusIcon = statusConfig.icon;
        return (
            <span className={`tw-inline-flex tw-items-center tw-px-2.5 tw-py-0.5 tw-rounded-full tw-text-xs tw-font-medium tw-border ${statusConfig.bg} ${statusConfig.color} ${statusConfig.border}`}>
                <StatusIcon className="tw-w-3 tw-h-3 tw-mr-1" />
                {statusConfig.label}
            </span>
        );
    };

    const getPaymentStatusBadge = (paymentStatus: string) => {
        const paymentConfig = PAYMENT_STATUS_CONFIG[paymentStatus as keyof typeof PAYMENT_STATUS_CONFIG];
        return (
            <span className={`tw-inline-flex tw-items-center tw-px-2.5 tw-py-0.5 tw-rounded-full tw-text-xs tw-font-medium ${paymentConfig.bg} ${paymentConfig.color}`}>
                <CreditCard className="tw-w-3 tw-h-3 tw-mr-1" />
                {paymentConfig.label}
            </span>
        );
    };

    const getRoleBadge = (role: string) => {
        const roleConfig = ROLE_CONFIG[role as keyof typeof ROLE_CONFIG];
        return (
            <span className={`tw-inline-flex tw-items-center tw-px-2 tw-py-0.5 tw-rounded-full tw-text-xs tw-font-medium ${roleConfig.bg} ${roleConfig.color}`}>
                {roleConfig.label}
            </span>
        );
    };

    if (status === "loading" || loading) {
        return (
            <Loading
                size="lg"
                text="กำลังโหลดข้อมูลการจอง..."
                color="blue"
                fullScreen={true}
            />
        );
    }

    return (
        <div className="tw-min-h-screen tw-bg-gradient-to-br tw-from-slate-50 tw-via-blue-50 tw-to-indigo-50 tw-px-6 tw-py-8">
            {/* Header */}
            <div className="tw-mb-8">
                <div className="tw-flex tw-items-center tw-gap-6 tw-mb-6">
                    <Button
                        onClick={() => router.push("/admin")}
                        variant="secondary"
                        className="tw-px-4 tw-py-2 tw-font-medium tw-rounded-xl tw-transition-all tw-duration-200 tw-bg-indigo-50 tw-text-indigo-700 tw-border tw-border-transparent tw-flex tw-items-center tw-justify-center hover:tw-bg-indigo-100 active:tw-bg-indigo-200 focus:tw-ring-0 focus:tw-outline-none"
                    >
                        <ArrowLeft className="tw-w-4 tw-h-4 tw-mr-2 tw-text-indigo-600" />
                        กลับ
                    </Button>

                    <div className="tw-mt-8">
                        <h1 className="tw-text-3xl md:tw-text-4xl tw-font-bold tw-bg-gradient-to-r tw-from-purple-600 tw-via-blue-600 tw-to-indigo-600 tw-bg-clip-text tw-text-transparent tw-flex tw-items-center">
                            <Calendar className="tw-w-8 tw-h-8 tw-mr-3 tw-text-purple-600" />
                            จัดการการจอง
                        </h1>
                        <p className="tw-text-gray-600 tw-mt-1">
                            ดูและจัดการการจองทั้งหมดในระบบ
                        </p>
                    </div>
                </div>

                <div className="tw-h-1 tw-w-32 tw-bg-gradient-to-r tw-from-purple-500 tw-via-blue-500 tw-to-indigo-500 tw-rounded-full" />
            </div>
            <div className="tw-bg-white tw-rounded-2xl tw-shadow-sm tw-p-6 tw-border tw-border-gray-100 tw-mb-6">
                <div className="tw-grid tw-grid-cols-1 lg:tw-grid-cols-2 tw-gap-6">
                    {/* Search */}
                    <div>
                        <SearchInput value={searchTerm} onChange={setSearchTerm} placeholder="ค้นหาชื่อ, อีเมล, รหัสจอง..." />
                    </div>

                    {/* Actions */}
                    <div className="tw-flex tw-items-end tw-justify-end tw-gap-3 tw-mt-4">
                        <Button
                            onClick={handleRefresh}
                            className="tw-h-11 tw-px-5 tw-font-semibold tw-rounded-xl tw-transition-all tw-duration-300 tw-shadow-md hover:tw-shadow-lg hover:tw-scale-105 active:tw-scale-95 tw-relative tw-overflow-hidden tw-border-0 tw-outline-none focus:tw-outline-none disabled:tw-opacity-50 disabled:tw-cursor-not-allowed"
                            colorClass="tw-bg-gradient-to-r tw-from-emerald-500 tw-to-emerald-600 hover:tw-from-emerald-600 hover:tw-to-emerald-700 tw-text-white focus:tw-ring-4 focus:tw-ring-emerald-300"
                        >
                            <span className="tw-relative tw-flex tw-items-center tw-justify-center tw-gap-2">
                                <RefreshCw className="tw-w-4 tw-h-4 tw-transition-transform group-hover:tw-rotate-180 tw-duration-300" />
                                รีเฟรช
                            </span>
                        </Button>

                        <Button
                            onClick={handleExport}
                            className="tw-h-11 tw-px-5 tw-font-semibold tw-rounded-xl tw-transition-all tw-duration-300 tw-shadow-md hover:tw-shadow-lg hover:tw-scale-105 active:tw-scale-95 tw-relative tw-overflow-hidden tw-border-0 tw-outline-none focus:tw-outline-none disabled:tw-opacity-50 disabled:tw-cursor-not-allowed"
                            colorClass="tw-bg-gradient-to-r tw-from-sky-500 tw-to-sky-600 hover:tw-from-sky-600 hover:tw-to-sky-700 tw-text-white focus:tw-ring-4 focus:tw-ring-sky-300"
                        >
                            <span className="tw-relative tw-flex tw-items-center tw-justify-center tw-gap-2">
                                <Download className="tw-w-4 tw-h-4" />
                                พิมพ์รายงาน
                            </span>
                        </Button>

                    </div>
                </div>

                {/* Filters */}
                <div className="tw-grid tw-grid-cols-1 md:tw-grid-cols-3 tw-gap-4 tw-mt-6">
                    <DropdownField
                        label="สถานะการจอง"
                        value={filterStatus}
                        onChange={setFilterStatus}
                        options={statusOptions}
                    />

                    <DropdownField
                        label="สถานะการชำระ"
                        value={filterPaymentStatus}
                        onChange={setFilterPaymentStatus}
                        options={paymentStatusOptions}
                    />

                    {/* Date Range */}
                    <div>
                        <label className="tw-block tw-text-sm tw-font-medium tw-text-gray-700 tw-mb-2">
                            ช่วงวันที่
                        </label>
                        <div className="tw-flex tw-space-x-2">
                            <DateField
                                value={dateRange.start}
                                onChange={(date) => setDateRange(prev => ({ ...prev, start: date || new Date() }))}
                                placeholder="วันที่เริ่มต้น"
                                className="tw-flex-1"
                            />
                            <DateField
                                value={dateRange.end}
                                onChange={(date) => setDateRange(prev => ({ ...prev, end: date || new Date() }))}
                                placeholder="วันที่สิ้นสุด"
                                className="tw-flex-1"
                            />
                        </div>
                    </div>
                </div>
            </div>
            {/* Bookings Table */}
            <div className="tw-bg-white tw-rounded-2xl tw-shadow-lg tw-border tw-border-gray-100 tw-overflow-hidden">
                <div className="tw-px-6 tw-py-4 tw-border-b tw-border-gray-100 tw-flex tw-items-center tw-justify-between">
                    <h2 className="tw-text-xl tw-font-bold tw-text-gray-800 tw-flex tw-items-center">
                        <Activity className="tw-w-5 tw-h-5 tw-mr-2 tw-text-blue-600" />
                        รายการการจอง ({filteredBookings.length} รายการ)
                    </h2>

                    <div className="tw-flex tw-items-center tw-space-x-2 tw-text-sm tw-text-gray-500">
                        <Clock className="tw-w-4 tw-h-4" />
                        <span>อัปเดตล่าสุด: {new Date().toLocaleString('th-TH')}</span>
                    </div>
                </div>

                {filteredBookings.length === 0 ? (
                    <div className="tw-text-center tw-py-12">
                        <Calendar className="tw-w-16 tw-h-16 tw-text-gray-300 tw-mx-auto tw-mb-4" />
                        <p className="tw-text-gray-500 tw-text-lg">ไม่พบการจอง</p>
                        <p className="tw-text-gray-400 tw-text-sm tw-mt-2">ลองปรับเปลี่ยนตัวกรองหรือช่วงวันที่</p>
                    </div>
                ) : (
                    <div className="tw-overflow-x-auto">
                        <table className="tw-w-full">
                            <thead className="tw-bg-gray-50">
                                <tr>
                                    <th className="tw-px-6 tw-py-3 tw-text-left tw-text-xs tw-font-medium tw-text-gray-500 tw-uppercase tw-tracking-wider">
                                        รหัสจอง
                                    </th>
                                    <th className="tw-px-6 tw-py-3 tw-text-left tw-text-xs tw-font-medium tw-text-gray-500 tw-uppercase tw-tracking-wider">
                                        ผู้จอง
                                    </th>
                                    <th className="tw-px-6 tw-py-3 tw-text-left tw-text-xs tw-font-medium tw-text-gray-500 tw-uppercase tw-tracking-wider">
                                        สนาม
                                    </th>
                                    <th className="tw-px-6 tw-py-3 tw-text-left tw-text-xs tw-font-medium tw-text-gray-500 tw-uppercase tw-tracking-wider">
                                        วันที่เล่น
                                    </th>
                                    <th className="tw-px-6 tw-py-3 tw-text-left tw-text-xs tw-font-medium tw-text-gray-500 tw-uppercase tw-tracking-wider">
                                        จำนวนเงิน
                                    </th>
                                    <th className="tw-px-6 tw-py-3 tw-text-left tw-text-xs tw-font-medium tw-text-gray-500 tw-uppercase tw-tracking-wider">
                                        สถานะ
                                    </th>
                                    <th className="tw-px-6 tw-py-3 tw-text-left tw-text-xs tw-font-medium tw-text-gray-500 tw-uppercase tw-tracking-wider">
                                        การชำระ
                                    </th>
                                    <th className="tw-px-6 tw-py-3 tw-text-left tw-text-xs tw-font-medium tw-text-gray-500 tw-uppercase tw-tracking-wider">
                                        การดำเนินการ
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="tw-bg-white tw-divide-y tw-divide-gray-200">
                                {filteredBookings.map((booking) => (
                                    <tr key={booking.reservation_id} className="hover:tw-bg-gray-50 tw-transition-colors">
                                        <td className="tw-px-6 tw-py-4 tw-whitespace-nowrap tw-text-sm tw-text-gray-900">
                                            <div className="tw-flex tw-items-center">
                                                <div className="tw-w-2 tw-h-8 tw-bg-gradient-to-b tw-from-blue-500 tw-to-purple-500 tw-rounded-full tw-mr-3"></div>
                                                <span className="tw-font-bold">{booking.reservation_id}</span>
                                            </div>
                                        </td>
                                        <td className="tw-px-6 tw-py-4 tw-whitespace-nowrap tw-text-sm tw-text-gray-900">
                                            <div className="tw-flex tw-items-center">
                                                <div className="tw-flex-shrink-0 tw-h-10 tw-w-10">
                                                    <div className="tw-h-10 tw-w-10 tw-rounded-full tw-bg-gradient-to-br tw-from-blue-400 tw-to-purple-500 tw-flex tw-items-center tw-justify-center tw-shadow-lg">
                                                        <User className="tw-w-5 tw-h-5 tw-text-white" />
                                                    </div>
                                                </div>
                                                <div className="tw-ml-3">
                                                    <div className="tw-font-medium">{booking.user_name}</div>
                                                    <div className="tw-text-xs tw-text-gray-500">{booking.user_email}</div>
                                                    <div className="tw-mt-1">
                                                        {getRoleBadge(booking.user_role)}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="tw-px-6 tw-py-4 tw-whitespace-nowrap tw-text-sm tw-text-gray-900">
                                            <div>
                                                <div className="tw-font-semibold">{booking.facility_name}</div>
                                                <div className="tw-text-xs tw-text-gray-500 tw-flex tw-items-center tw-gap-1 tw-mt-1">
                                                    <MapPin className="tw-w-3 tw-h-3 tw-text-blue-500" />
                                                    {booking.court_name} ({booking.court_code})
                                                </div>
                                            </div>
                                        </td>
                                        <td className="tw-px-6 tw-py-4 tw-whitespace-nowrap tw-text-sm tw-text-gray-900">
                                            <div>
                                                <div className="tw-font-semibold tw-flex tw-items-center tw-gap-1">
                                                    <Calendar className="tw-w-4 tw-h-4 tw-text-blue-500" />
                                                    {formatDate(booking.play_date)}
                                                </div>
                                                <div className="tw-flex tw-flex-wrap tw-gap-1 tw-mt-1">
                                                    {booking.time_slots.map((slot, index) => (
                                                        <span key={index} className="tw-px-2 tw-py-1 tw-bg-blue-100 tw-text-blue-800 tw-text-xs tw-font-medium tw-rounded-full">
                                                            {slot}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="tw-px-6 tw-py-4 tw-whitespace-nowrap tw-text-sm tw-font-bold tw-text-green-600">
                                            {formatCurrency(booking.total_amount, booking.currency)}
                                        </td>
                                        <td className="tw-px-6 tw-py-4 tw-whitespace-nowrap">
                                            {getStatusBadge(booking.status)}
                                        </td>
                                        <td className="tw-px-6 tw-py-4 tw-whitespace-nowrap">
                                            {getPaymentStatusBadge(booking.payment_status)}
                                        </td>
                                        <td className="tw-px-6 tw-py-4 tw-whitespace-nowrap tw-text-sm tw-font-medium">
                                            <Button
                                                onClick={() => viewBookingDetail(booking)}
                                                variant="secondary"
                                                className="tw-px-3 tw-py-1 tw-text-xs tw-flex tw-items-center"
                                            >
                                                <Eye className="tw-w-3 tw-h-3 tw-mr-1" />
                                                ดูรายละเอียด
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Detail Modal */}
            {showDetailModal && selectedBooking && (
                <div className="tw-fixed tw-inset-0 tw-bg-black tw-bg-opacity-50 tw-flex tw-items-center tw-justify-center tw-z-50 tw-p-4">
                    <div className="tw-bg-white tw-rounded-2xl tw-max-w-4xl tw-w-full tw-max-h-[90vh] tw-overflow-y-auto">
                        <div className="tw-p-6 tw-border-b tw-border-gray-200">
                            <div className="tw-flex tw-items-center tw-justify-between">
                                <h3 className="tw-text-2xl tw-font-bold tw-text-gray-800 tw-flex tw-items-center">
                                    <Calendar className="tw-w-6 tw-h-6 tw-text-blue-600 tw-mr-2" />
                                    รายละเอียดการจอง #{selectedBooking.reservation_id}
                                </h3>
                                <Button
                                    onClick={() => setShowDetailModal(false)}
                                    variant="secondary"
                                    className="tw-px-3 tw-py-2"
                                >
                                    <X className="tw-w-4 tw-h-4" />
                                </Button>
                            </div>
                        </div>

                        <div className="tw-p-6">
                            <div className="tw-grid tw-grid-cols-1 tw-lg:tw-grid-cols-2 tw-gap-8">
                                {/* Left Column - Booking Info */}
                                <div className="tw-space-y-6">
                                    <div className="tw-bg-gray-50 tw-rounded-lg tw-p-4">
                                        <h4 className="tw-text-lg tw-font-semibold tw-text-gray-900 tw-mb-4">ข้อมูลการจอง</h4>
                                        <div className="tw-space-y-3">
                                            <div className="tw-flex tw-justify-between">
                                                <span className="tw-text-gray-600">รหัสจอง:</span>
                                                <span className="tw-font-semibold">{selectedBooking.reservation_id}</span>
                                            </div>
                                            <div className="tw-flex tw-justify-between">
                                                <span className="tw-text-gray-600">สนาม:</span>
                                                <span className="tw-font-semibold">{selectedBooking.facility_name}</span>
                                            </div>
                                            <div className="tw-flex tw-justify-between">
                                                <span className="tw-text-gray-600">คอร์ท:</span>
                                                <span className="tw-font-semibold">{selectedBooking.court_name} ({selectedBooking.court_code})</span>
                                            </div>
                                            <div className="tw-flex tw-justify-between">
                                                <span className="tw-text-gray-600">วันที่เล่น:</span>
                                                <span className="tw-font-semibold">{formatDate(selectedBooking.play_date)}</span>
                                            </div>
                                            <div className="tw-flex tw-justify-between tw-items-start">
                                                <span className="tw-text-gray-600">เวลา:</span>
                                                <div className="tw-flex tw-flex-wrap tw-gap-1">
                                                    {selectedBooking.time_slots.map((slot, index) => (
                                                        <span key={index} className="tw-px-2 tw-py-1 tw-bg-blue-100 tw-text-blue-800 tw-text-xs tw-font-medium tw-rounded-full">
                                                            {slot}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="tw-flex tw-justify-between">
                                                <span className="tw-text-gray-600">จำนวนเงิน:</span>
                                                <span className="tw-font-bold tw-text-green-600">
                                                    {formatCurrency(selectedBooking.total_amount, selectedBooking.currency)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="tw-bg-gray-50 tw-rounded-lg tw-p-4">
                                        <h4 className="tw-text-lg tw-font-semibold tw-text-gray-900 tw-mb-4">สถานะ</h4>
                                        <div className="tw-space-y-3">
                                            <div className="tw-flex tw-justify-between tw-items-center">
                                                <span className="tw-text-gray-600">สถานะการจอง:</span>
                                                {getStatusBadge(selectedBooking.status)}
                                            </div>
                                            <div className="tw-flex tw-justify-between tw-items-center">
                                                <span className="tw-text-gray-600">สถานะการชำระ:</span>
                                                {getPaymentStatusBadge(selectedBooking.payment_status)}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Column - User Info */}
                                <div className="tw-space-y-6">
                                    <div className="tw-bg-gray-50 tw-rounded-lg tw-p-4">
                                        <h4 className="tw-text-lg tw-font-semibold tw-text-gray-900 tw-mb-4">ข้อมูลผู้จอง</h4>
                                        <div className="tw-space-y-3">
                                            <div className="tw-flex tw-justify-between">
                                                <span className="tw-text-gray-600">ชื่อ:</span>
                                                <span className="tw-font-semibold">{selectedBooking.user_name}</span>
                                            </div>
                                            <div className="tw-flex tw-justify-between tw-items-center">
                                                <span className="tw-text-gray-600">อีเมล:</span>
                                                <div className="tw-flex tw-items-center tw-gap-1">
                                                    <Mail className="tw-w-4 tw-h-4 tw-text-gray-400" />
                                                    <span className="tw-font-semibold">{selectedBooking.user_email}</span>
                                                </div>
                                            </div>
                                            <div className="tw-flex tw-justify-between tw-items-center">
                                                <span className="tw-text-gray-600">เบอร์โทร:</span>
                                                <div className="tw-flex tw-items-center tw-gap-1">
                                                    <Phone className="tw-w-4 tw-h-4 tw-text-gray-400" />
                                                    <span className="tw-font-semibold">{selectedBooking.user_phone}</span>
                                                </div>
                                            </div>
                                            <div className="tw-flex tw-justify-between tw-items-center">
                                                <span className="tw-text-gray-600">ประเภทผู้ใช้:</span>
                                                {getRoleBadge(selectedBooking.user_role)}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="tw-bg-gray-50 tw-rounded-lg tw-p-4">
                                        <h4 className="tw-text-lg tw-font-semibold tw-text-gray-900 tw-mb-4">ประวัติการดำเนินการ</h4>
                                        <div className="tw-space-y-3">
                                            <div className="tw-flex tw-justify-between">
                                                <span className="tw-text-gray-600">วันที่จอง:</span>
                                                <span className="tw-font-semibold">{formatDateTime(selectedBooking.created_at)}</span>
                                            </div>
                                            {selectedBooking.confirmed_at && (
                                                <div className="tw-flex tw-justify-between">
                                                    <span className="tw-text-gray-600">วันที่ยืนยัน:</span>
                                                    <span className="tw-font-semibold">{formatDateTime(selectedBooking.confirmed_at)}</span>
                                                </div>
                                            )}
                                            {selectedBooking.cancelled_at && (
                                                <div className="tw-flex tw-justify-between">
                                                    <span className="tw-text-gray-600">วันที่ยกเลิก:</span>
                                                    <span className="tw-font-semibold">{formatDateTime(selectedBooking.cancelled_at)}</span>
                                                </div>
                                            )}
                                            {selectedBooking.notes && (
                                                <div>
                                                    <span className="tw-text-gray-600 tw-block tw-mb-1">หมายเหตุ:</span>
                                                    <div className="tw-bg-white tw-p-3 tw-rounded tw-border">
                                                        <div className="tw-flex tw-items-start tw-gap-2">
                                                            <FileText className="tw-w-4 tw-h-4 tw-text-gray-400 tw-mt-0.5" />
                                                            <span className="tw-text-sm">{selectedBooking.notes}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="tw-flex tw-justify-end tw-gap-3 tw-mt-8 tw-pt-6 tw-border-t">
                                <Button
                                    onClick={() => setShowDetailModal(false)}
                                >
                                    ปิด
                                </Button>
                                {selectedBooking.status === 'pending' && (
                                    <>
                                        <Button
                                            onClick={() => {
                                                // TODO: Implement confirm booking
                                                toast?.showSuccess('ยืนยันการจองสำเร็จ');
                                                setShowDetailModal(false);
                                            }}
                                            variant="primary"
                                        >
                                            ยืนยันการจอง
                                        </Button>
                                        <Button
                                            onClick={() => {
                                                // TODO: Implement cancel booking
                                                toast?.showSuccess('ยกเลิกการจองสำเร็จ');
                                                setShowDetailModal(false);
                                            }}
                                            variant="danger"
                                        >
                                            ยกเลิกการจอง
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}