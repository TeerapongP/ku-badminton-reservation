"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
    Calendar,
    Clock,
    Filter,
    ChevronLeft,
    ChevronRight,
    RefreshCw,
    CheckCircle,
    XCircle,
    AlertCircle,
    Clock3
} from "lucide-react";
import { useToast } from "@/components/ToastProvider";
import Loading from "@/components/Loading";
import { Button } from "@/components/Button";
import { DropdownField } from "@/components/DropdownField";
import {
    BookingHistoryItem,
    BookingHistoryResponse,
    BookingHistoryFilters,
    BookingStatus
} from "@/types/profile/booking-history";

const BookingHistoryContainer: React.FC = () => {
    const { data: session } = useSession();
    const toast = useToast();

    const [bookings, setBookings] = useState<BookingHistoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [pagination, setPagination] = useState({
        current_page: 1,
        total_pages: 1,
        total_count: 0,
        per_page: 10,
        has_next: false,
        has_prev: false
    });

    const [filters, setFilters] = useState<BookingHistoryFilters>({
        status: 'all',
        startDate: '',
        endDate: '',
        page: 1,
        limit: 10
    });

    const [showFilters, setShowFilters] = useState(false);

    const fetchBookings = useCallback(async (currentFilters: BookingHistoryFilters) => {
        if (!session?.user?.id) return;

        try {
            setIsLoading(true);

            const params = new URLSearchParams();
            if (currentFilters.status && currentFilters.status !== 'all') {
                params.append('status', currentFilters.status);
            }
            if (currentFilters.startDate) {
                params.append('startDate', currentFilters.startDate);
            }
            if (currentFilters.endDate) {
                params.append('endDate', currentFilters.endDate);
            }
            params.append('page', (currentFilters.page || 1).toString());
            params.append('limit', (currentFilters.limit || 10).toString());

            const response = await fetch(
                `/api/profile/${session.user.id}/bookings?${params.toString()}`
            );

            if (!response.ok) {
                throw new Error('Failed to fetch bookings');
            }

            const data: BookingHistoryResponse = await response.json();

            if (data.success) {
                setBookings(data.data.bookings);
                setPagination(data.data.pagination);
            } else {
                toast.showError("เกิดข้อผิดพลาด", data.error || "ไม่สามารถโหลดประวัติการจองได้");
            }
        } catch (error) {
            console.error("Error fetching bookings:", error);
            toast.showError("เกิดข้อผิดพลาด", "ไม่สามารถโหลดประวัติการจองได้");
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [session?.user?.id, toast]);

    useEffect(() => {
        fetchBookings(filters);
    }, [fetchBookings, filters]);

    const handleFilterChange = (key: keyof BookingHistoryFilters, value: any) => {
        setFilters(prev => ({
            ...prev,
            [key]: value,
            page: key !== 'page' ? 1 : value // Reset to page 1 when changing filters
        }));
    };

    const handleRefresh = () => {
        setIsRefreshing(true);
        fetchBookings(filters);
    };

    const handlePageChange = (newPage: number) => {
        handleFilterChange('page', newPage);
    };

    const getStatusIcon = (status: BookingStatus) => {
        switch (status) {
            case 'confirmed':
                return <CheckCircle size={16} className="tw-text-green-600" />;
            case 'pending':
                return <Clock3 size={16} className="tw-text-yellow-600" />;
            case 'cancelled':
                return <XCircle size={16} className="tw-text-red-600" />;
            case 'completed':
                return <CheckCircle size={16} className="tw-text-blue-600" />;
            default:
                return <AlertCircle size={16} className="tw-text-gray-600" />;
        }
    };

    const getStatusText = (status: BookingStatus) => {
        switch (status) {
            case 'confirmed':
                return 'ยืนยันแล้ว';
            case 'pending':
                return 'รอยืนยัน';
            case 'cancelled':
                return 'ยกเลิกแล้ว';
            case 'completed':
                return 'เสร็จสิ้น';
            default:
                return status;
        }
    };

    const getStatusBadgeColor = (status: BookingStatus) => {
        switch (status) {
            case 'confirmed':
                return 'tw-bg-green-100 tw-text-green-800';
            case 'pending':
                return 'tw-bg-yellow-100 tw-text-yellow-800';
            case 'cancelled':
                return 'tw-bg-red-100 tw-text-red-800';
            case 'completed':
                return 'tw-bg-blue-100 tw-text-blue-800';
            default:
                return 'tw-bg-gray-100 tw-text-gray-800';
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("th-TH", {
            year: "numeric",
            month: "long",
            day: "numeric",
        });
    };

    const formatDateTime = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("th-TH", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const statusOptions = [
        { value: 'all', label: 'ทั้งหมด' },
        { value: 'pending', label: 'รอยืนยัน' },
        { value: 'confirmed', label: 'ยืนยันแล้ว' },
        { value: 'completed', label: 'เสร็จสิ้น' },
        { value: 'cancelled', label: 'ยกเลิกแล้ว' }
    ];

    if (isLoading && !isRefreshing) {
        return (
            <Loading
                text="กำลังโหลดประวัติการจอง..."
                color="emerald"
                size="md"
                fullScreen={true}
            />
        );
    }

    return (
        <div className="tw-min-h-screen tw-bg-gradient-to-br tw-from-blue-50 tw-via-white tw-to-green-50 tw-py-8 tw-px-4">
            <div className="tw-max-w-6xl tw-mx-auto">
                {/* Header */}
                <div className="tw-mb-6">
                    <div className="tw-flex tw-items-center tw-justify-between tw-flex-wrap tw-gap-4">
                        <div>
                            <h1 className="tw-text-3xl tw-font-bold tw-text-gray-900">ประวัติการจอง</h1>
                            <p className="tw-text-gray-600 tw-mt-1">
                                ดูประวัติการจองทั้งหมดของคุณ ({pagination.total_count} รายการ)
                            </p>
                        </div>

                        <div className="tw-flex tw-gap-2">
                            <Button
                                onClick={handleRefresh}
                                variant="secondary"
                                className="tw-px-4 tw-py-2 tw-font-medium tw-rounded-xl tw-transition-all tw-duration-200 tw-bg-gray-100 tw-text-gray-700 tw-border tw-border-transparent tw-flex tw-items-center tw-justify-center hover:tw-bg-gray-200 active:tw-bg-gray-300 focus:tw-ring-0 focus:tw-outline-none"
                            >
                                <RefreshCw className="tw-w-4 tw-h-4 tw-mr-2" />
                                รีเฟรช
                            </Button>
                            <Button
                                onClick={() => setShowFilters(!showFilters)}
                                className="
    tw-flex tw-items-center tw-gap-2
    tw-h-11 tw-px-5 tw-font-semibold 
    tw-rounded-xl 
    tw-shadow-md hover:tw-shadow-lg 
    hover:tw-scale-[1.03] active:tw-scale-[0.97]
    tw-transition-all tw-duration-300 tw-ease-out
    tw-border-0 tw-outline-none focus:tw-outline-none focus:tw-ring-0
    tw-appearance-none tw-touch-manipulation
    tw-[-webkit-tap-highlight-color:transparent]
  "
                                colorClass="
    tw-bg-gradient-to-r 
    tw-from-sky-500 tw-to-indigo-600
    hover:tw-from-sky-600 hover:tw-to-indigo-700
    tw-text-white
    focus:tw-ring-4 focus:tw-ring-sky-300/50
  "
                            >
                                <Filter className="tw-w-4 tw-h-4" />
                                ตัวกรอง
                            </Button>

                        </div>
                    </div>
                </div>

                {/* Filters */}
                {showFilters && (
                    <div className="tw-bg-white tw-rounded-xl tw-shadow-md tw-p-6 tw-mb-6">
                        <h3 className="tw-text-lg tw-font-semibold tw-text-gray-900 tw-mb-4">ตัวกรองการค้นหา</h3>

                        <div className="tw-grid tw-grid-cols-1 md:tw-grid-cols-3 tw-gap-4">
                            <div>
                                <label className="tw-block tw-text-sm tw-font-medium tw-text-gray-700 tw-mb-2">
                                    สถานะ
                                </label>
                                <DropdownField
                                    options={statusOptions}
                                    value={filters.status || 'all'}
                                    onChange={(value) => handleFilterChange('status', value)}
                                    placeholder="เลือกสถานะ"
                                />
                            </div>

                            <div>
                                <label className="tw-block tw-text-sm tw-font-medium tw-text-gray-700 tw-mb-2">
                                    วันที่เริ่มต้น
                                </label>
                                <input
                                    type="date"
                                    value={filters.startDate || ''}
                                    onChange={(e) => handleFilterChange('startDate', e.target.value)}
                                    className="tw-w-full tw-px-3 tw-py-2 tw-border tw-border-gray-300 tw-rounded-lg focus:tw-ring-2 focus:tw-ring-blue-500 focus:tw-border-blue-500"
                                />
                            </div>

                            <div>
                                <label className="tw-block tw-text-sm tw-font-medium tw-text-gray-700 tw-mb-2">
                                    วันที่สิ้นสุด
                                </label>
                                <input
                                    type="date"
                                    value={filters.endDate || ''}
                                    onChange={(e) => handleFilterChange('endDate', e.target.value)}
                                    className="tw-w-full tw-px-3 tw-py-2 tw-border tw-border-gray-300 tw-rounded-lg focus:tw-ring-2 focus:tw-ring-blue-500 focus:tw-border-blue-500"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Bookings List */}
                <div className="tw-space-y-4">
                    {bookings.length === 0 ? (
                        <div className="tw-bg-white tw-rounded-xl tw-shadow-md tw-p-12 tw-text-center">
                            <Calendar size={48} className="tw-text-gray-400 tw-mx-auto tw-mb-4" />
                            <h3 className="tw-text-xl tw-font-semibold tw-text-gray-900 tw-mb-2">
                                ไม่พบประวัติการจอง
                            </h3>
                            <p className="tw-text-gray-600">
                                คุณยังไม่มีประวัติการจองในระบบ หรือลองปรับเปลี่ยนตัวกรองการค้นหา
                            </p>
                        </div>
                    ) : (
                        bookings.map((booking) => (
                            <div
                                key={booking.id}
                                className="tw-bg-white tw-rounded-xl tw-shadow-md tw-p-6 tw-transition-all tw-duration-200 hover:tw-shadow-lg"
                            >
                                <div className="tw-flex tw-flex-col lg:tw-flex-row tw-gap-4">
                                    {/* Booking Info */}
                                    <div className="tw-flex-1">
                                        <div className="tw-flex tw-items-start tw-justify-between tw-mb-3">
                                            <div>
                                                <h3 className="tw-text-lg tw-font-semibold tw-text-gray-900">
                                                    {booking.court.facility_name} - {booking.court.name}
                                                </h3>
                                                <p className="tw-text-sm tw-text-gray-600">
                                                    คอร์ตที่ {booking.court.number}
                                                </p>
                                            </div>

                                            <div className={`tw-flex tw-items-center tw-gap-1 tw-px-3 tw-py-1 tw-rounded-full tw-text-sm tw-font-medium ${getStatusBadgeColor(booking.status)}`}>
                                                {getStatusIcon(booking.status)}
                                                {getStatusText(booking.status)}
                                            </div>
                                        </div>

                                        <div className="tw-grid tw-grid-cols-1 sm:tw-grid-cols-2 lg:tw-grid-cols-3 tw-gap-4 tw-text-sm">
                                            <div className="tw-flex tw-items-center tw-gap-2 tw-text-gray-600">
                                                <Calendar size={16} />
                                                <span>{formatDate(booking.booking_date)}</span>
                                            </div>

                                            <div className="tw-flex tw-items-center tw-gap-2 tw-text-gray-600">
                                                <Clock size={16} />
                                                <span>{booking.time_slot.display}</span>
                                            </div>

                                            <div className="tw-flex tw-items-center tw-gap-2 tw-text-gray-600">
                                                <span className="tw-font-medium">฿{booking.total_price.toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Booking Meta */}
                                    <div className="tw-text-right tw-text-sm tw-text-gray-500 tw-min-w-0 lg:tw-min-w-[200px]">
                                        <p>จองเมื่อ: {formatDateTime(booking.created_at)}</p>
                                        {booking.updated_at !== booking.created_at && (
                                            <p>อัปเดต: {formatDateTime(booking.updated_at)}</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Pagination */}
                {pagination.total_pages > 1 && (
                    <div className="tw-flex tw-items-center tw-justify-between tw-mt-8 tw-bg-white tw-rounded-xl tw-shadow-md tw-p-4">
                        <div className="tw-text-sm tw-text-gray-600">
                            แสดง {((pagination.current_page - 1) * pagination.per_page) + 1} - {Math.min(pagination.current_page * pagination.per_page, pagination.total_count)} จาก {pagination.total_count} รายการ
                        </div>

                        <div className="tw-flex tw-items-center tw-gap-2">
                            <Button
                                onClick={() => handlePageChange(pagination.current_page - 1)}
                                disabled={!pagination.has_prev}
                                className="tw-flex tw-items-center tw-gap-1 tw-px-3 tw-py-2 tw-bg-gray-100 hover:tw-bg-gray-200 tw-text-gray-700 tw-rounded-lg tw-transition-colors disabled:tw-opacity-50 disabled:tw-cursor-not-allowed"
                            >
                                <ChevronLeft size={16} />
                                ก่อนหน้า
                            </Button>

                            <span className="tw-px-4 tw-py-2 tw-text-sm tw-font-medium tw-text-gray-700">
                                หน้า {pagination.current_page} จาก {pagination.total_pages}
                            </span>

                            <Button
                                onClick={() => handlePageChange(pagination.current_page + 1)}
                                disabled={!pagination.has_next}
                                className="tw-flex tw-items-center tw-gap-1 tw-px-3 tw-py-2 tw-bg-gray-100 hover:tw-bg-gray-200 tw-text-gray-700 tw-rounded-lg tw-transition-colors disabled:tw-opacity-50 disabled:tw-cursor-not-allowed"
                            >
                                ถัดไป
                                <ChevronRight size={16} />
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BookingHistoryContainer;