"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/ToastProvider";
import { Button } from "@/components/Button";
import Loading from "@/components/Loading";
import { DropdownField } from "@/components/DropdownField";
import { DateField } from "@/components/DateField";
import {
    ArrowLeft,
    BarChart3,
    TrendingUp,
    TrendingDown,
    Calendar,
    Users,
    Download,
    RefreshCw,
    PieChart,
    DollarSign,
    MapPin,
    FileText
} from "lucide-react";
import { ReportData } from "@/lib/ReportData";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';
import { Line, Bar, Pie, Doughnut } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler
);



export default function AdminReportsContainner() {
    const router = useRouter();
    const { data: session, status } = useSession();
    const toast = useToast();

    const [reportData, setReportData] = useState<ReportData | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedPeriod, setSelectedPeriod] = useState<string>("month");
    const [dateRange, setDateRange] = useState<{
        start: Date | null;
        end: Date | null;
    }>({
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        end: new Date()
    });

    // Period options
    const periodOptions = [
        { label: 'รายวัน', value: 'day' },
        { label: 'รายสัปดาห์', value: 'week' },
        { label: 'รายเดือน', value: 'month' },
        { label: 'รายปี', value: 'year' },
        { label: 'กำหนดเอง', value: 'custom' }
    ];

    // Mock data
    const mockReportData: ReportData = {
        totalBookings: 1247,
        totalRevenue: 186750,
        totalUsers: 892,
        averageBookingValue: 149.8,
        bookingsByStatus: {
            pending: 45,
            confirmed: 892,
            cancelled: 123,
            completed: 167,
            no_show: 20
        },
        revenueByMonth: [
            { month: 'ม.ค.', revenue: 15420, bookings: 103 },
            { month: 'ก.พ.', revenue: 18650, bookings: 124 },
            { month: 'มี.ค.', revenue: 22340, bookings: 149 },
            { month: 'เม.ย.', revenue: 19870, bookings: 132 },
            { month: 'พ.ค.', revenue: 25680, bookings: 171 },
            { month: 'มิ.ย.', revenue: 28950, bookings: 193 },
            { month: 'ก.ค.', revenue: 31240, bookings: 208 },
            { month: 'ส.ค.', revenue: 29870, bookings: 199 },
            { month: 'ก.ย.', revenue: 27650, bookings: 184 },
            { month: 'ต.ค.', revenue: 24580, bookings: 164 }
        ],
        topFacilities: [
            { name: 'สนามแบดมินตัน A', bookings: 342, revenue: 51300 },
            { name: 'สนามแบดมินตัน B', bookings: 298, revenue: 44700 },
            { name: 'สนามแบดมินตัน C', bookings: 267, revenue: 40050 },
            { name: 'สนามแบดมินตัน D', bookings: 189, revenue: 28350 },
            { name: 'สนามแบดมินตัน E', bookings: 151, revenue: 22650 }
        ],
        usersByRole: {
            student: 654,
            staff: 189,
            guest: 42,
            admin: 7
        }
    };



    // Utility functions
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('th-TH', {
            style: 'currency',
            currency: 'THB'
        }).format(amount);
    };

    const formatNumber = (num: number) => {
        return new Intl.NumberFormat('th-TH').format(num);
    };

    // Prepare chart data
    const pieChartData = [
        { name: 'นิสิต', value: reportData?.usersByRole.student || 0, color: '#3B82F6' },
        { name: 'บุคลากร', value: reportData?.usersByRole.staff || 0, color: '#10B981' },
        { name: 'บุคคลภายนอก', value: reportData?.usersByRole.guest || 0, color: '#F59E0B' },
        { name: 'ผู้ดูแลระบบ', value: reportData?.usersByRole.admin || 0, color: '#8B5CF6' }
    ];

    const statusPieData = [
        { name: 'รอยืนยัน', value: reportData?.bookingsByStatus.pending || 0, color: '#F59E0B' },
        { name: 'ยืนยันแล้ว', value: reportData?.bookingsByStatus.confirmed || 0, color: '#10B981' },
        { name: 'ยกเลิก', value: reportData?.bookingsByStatus.cancelled || 0, color: '#EF4444' },
        { name: 'เสร็จสิ้น', value: reportData?.bookingsByStatus.completed || 0, color: '#3B82F6' },
        { name: 'ไม่มาใช้', value: reportData?.bookingsByStatus.no_show || 0, color: '#F97316' }
    ];

    // Check authentication and role
    useEffect(() => {
        if (status === "loading") return;

        if (!session || ((session.user as any)?.role !== "admin" && (session.user as any)?.role !== "super_admin" && (session.user as any)?.role !== "super-admin")) {
            toast?.showError("ไม่มีสิทธิ์เข้าถึง", "คุณไม่มีสิทธิ์เข้าถึงหน้านี้");
            router.push("/");
            return;
        }
    }, [session, status, router, toast]);

    // Load report data
    useEffect(() => {
        const loadReportData = async () => {
            setLoading(true);
            try {
                // TODO: Replace with actual API call
                setTimeout(() => {
                    setReportData(mockReportData);
                    setLoading(false);
                }, 1000);
            } catch (error) {
                console.error('Error loading report data:', error);
                toast?.showError('เกิดข้อผิดพลาดในการโหลดข้อมูลรายงาน');
                setLoading(false);
            }
        };

        loadReportData();
    }, [selectedPeriod, dateRange, toast]);

    const handleRefresh = () => {
        setLoading(true);
        setTimeout(() => {
            setReportData({ ...mockReportData });
            setLoading(false);
            toast?.showSuccess('รีเฟรชข้อมูลสำเร็จ');
        }, 1000);
    };

    const handleExportReport = () => {
        toast?.showInfo('กำลังส่งออกรายงาน...');
    };

    if (status === "loading" || loading) {
        return (
            <Loading
                size="lg"
                text="กำลังโหลดข้อมูลรายงาน..."
                color="blue"
                fullScreen={true}
            />
        );
    }

    if (!session || ((session.user as any)?.role !== "admin" && (session.user as any)?.role !== "super_admin" && (session.user as any)?.role !== "super-admin")) {
        return null;
    }

    if (!reportData) {
        return (
            <div className="tw-min-h-screen tw-bg-gradient-to-br tw-from-slate-50 tw-via-blue-50 tw-to-indigo-50 tw-px-6 tw-py-8">
                <div className="tw-text-center tw-py-12">
                    <FileText className="tw-w-16 tw-h-16 tw-text-gray-300 tw-mx-auto tw-mb-4" />
                    <p className="tw-text-gray-500 tw-text-lg">ไม่สามารถโหลดข้อมูลรายงานได้</p>
                </div>
            </div>
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
                            <BarChart3 className="tw-w-8 tw-h-8 tw-mr-3 tw-text-purple-600" />
                            รายงานและสถิติ
                        </h1>
                        <p className="tw-text-gray-600 tw-mt-1">
                            ดูรายงานและสถิติการใช้งานระบบ
                        </p>
                    </div>
                </div>

                <div className="tw-h-1 tw-w-32 tw-bg-gradient-to-r tw-from-purple-500 tw-via-blue-500 tw-to-indigo-500 tw-rounded-full" />
            </div>

            {/* Filters */}
            <div className="tw-bg-white tw-rounded-2xl tw-shadow-sm tw-p-6 tw-border tw-border-gray-100 tw-mb-6">
                <div className="tw-grid tw-grid-cols-1 tw-md:tw-grid-cols-3 tw-gap-4 tw-items-end">
                    <div>
                        <DropdownField
                            label="ช่วงเวลา"
                            value={selectedPeriod}
                            onChange={setSelectedPeriod}
                            options={periodOptions}
                        />
                    </div>

                    {selectedPeriod === 'custom' && (
                        <>
                            <div>
                                <label className="tw-block tw-text-sm tw-font-medium tw-text-gray-700 tw-mb-2">
                                    วันที่เริ่มต้น
                                </label>
                                <DateField
                                    value={dateRange.start}
                                    onChange={(date) => setDateRange(prev => ({ ...prev, start: date }))}
                                    placeholder="เลือกวันที่"
                                />
                            </div>
                            <div>
                                <label className="tw-block tw-text-sm tw-font-medium tw-text-gray-700 tw-mb-2">
                                    วันที่สิ้นสุด
                                </label>
                                <DateField
                                    value={dateRange.end}
                                    onChange={(date) => setDateRange(prev => ({ ...prev, end: date }))}
                                    placeholder="เลือกวันที่"
                                />
                            </div>
                        </>
                    )}
                </div>

                <div className="tw-flex tw-justify-end tw-gap-3 tw-mt-6 tw-pt-4 tw-border-t tw-border-gray-100">
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
                        onClick={handleExportReport}
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
            {/* Overview Stats */}
            <div className="tw-grid tw-grid-cols-1 tw-md:tw-grid-cols-2 tw-lg:tw-grid-cols-4 tw-gap-6 tw-mb-8">
                <div className="tw-bg-white tw-rounded-2xl tw-shadow-sm tw-p-6 tw-border tw-border-gray-100">
                    <div className="tw-flex tw-items-center tw-justify-between">
                        <div>
                            <p className="tw-text-sm tw-font-medium tw-text-gray-500">การจองทั้งหมด</p>
                            <p className="tw-text-3xl tw-font-bold tw-text-gray-900">{formatNumber(reportData.totalBookings)}</p>
                            <div className="tw-flex tw-items-center tw-mt-2">
                                <TrendingUp className="tw-w-4 tw-h-4 tw-text-green-500 tw-mr-1" />
                                <span className="tw-text-sm tw-text-green-600">+12.5%</span>
                                <span className="tw-text-sm tw-text-gray-500 tw-ml-1">จากเดือนที่แล้ว</span>
                            </div>
                        </div>
                        <div className="tw-w-12 tw-h-12 tw-bg-gradient-to-br tw-from-blue-500 tw-to-blue-600 tw-rounded-xl tw-flex tw-items-center tw-justify-center tw-shadow-lg">
                            <Calendar className="tw-w-6 tw-h-6 tw-text-white" />
                        </div>
                    </div>
                </div>

                <div className="tw-bg-white tw-rounded-2xl tw-shadow-sm tw-p-6 tw-border tw-border-gray-100">
                    <div className="tw-flex tw-items-center tw-justify-between">
                        <div>
                            <p className="tw-text-sm tw-font-medium tw-text-gray-500">รายได้รวม</p>
                            <p className="tw-text-3xl tw-font-bold tw-text-gray-900">{formatCurrency(reportData.totalRevenue)}</p>
                            <div className="tw-flex tw-items-center tw-mt-2">
                                <TrendingUp className="tw-w-4 tw-h-4 tw-text-green-500 tw-mr-1" />
                                <span className="tw-text-sm tw-text-green-600">+8.2%</span>
                                <span className="tw-text-sm tw-text-gray-500 tw-ml-1">จากเดือนที่แล้ว</span>
                            </div>
                        </div>
                        <div className="tw-w-12 tw-h-12 tw-bg-gradient-to-br tw-from-green-500 tw-to-green-600 tw-rounded-xl tw-flex tw-items-center tw-justify-center tw-shadow-lg">
                            <DollarSign className="tw-w-6 tw-h-6 tw-text-white" />
                        </div>
                    </div>
                </div>

                <div className="tw-bg-white tw-rounded-2xl tw-shadow-sm tw-p-6 tw-border tw-border-gray-100">
                    <div className="tw-flex tw-items-center tw-justify-between">
                        <div>
                            <p className="tw-text-sm tw-font-medium tw-text-gray-500">ผู้ใช้ทั้งหมด</p>
                            <p className="tw-text-3xl tw-font-bold tw-text-gray-900">{formatNumber(reportData.totalUsers)}</p>
                            <div className="tw-flex tw-items-center tw-mt-2">
                                <TrendingUp className="tw-w-4 tw-h-4 tw-text-green-500 tw-mr-1" />
                                <span className="tw-text-sm tw-text-green-600">+5.7%</span>
                                <span className="tw-text-sm tw-text-gray-500 tw-ml-1">จากเดือนที่แล้ว</span>
                            </div>
                        </div>
                        <div className="tw-w-12 tw-h-12 tw-bg-gradient-to-br tw-from-purple-500 tw-to-purple-600 tw-rounded-xl tw-flex tw-items-center tw-justify-center tw-shadow-lg">
                            <Users className="tw-w-6 tw-h-6 tw-text-white" />
                        </div>
                    </div>
                </div>

                <div className="tw-bg-white tw-rounded-2xl tw-shadow-sm tw-p-6 tw-border tw-border-gray-100">
                    <div className="tw-flex tw-items-center tw-justify-between">
                        <div>
                            <p className="tw-text-sm tw-font-medium tw-text-gray-500">ค่าเฉลี่ยต่อการจอง</p>
                            <p className="tw-text-3xl tw-font-bold tw-text-gray-900">{formatCurrency(reportData.averageBookingValue)}</p>
                            <div className="tw-flex tw-items-center tw-mt-2">
                                <TrendingDown className="tw-w-4 tw-h-4 tw-text-red-500 tw-mr-1" />
                                <span className="tw-text-sm tw-text-red-600">-2.1%</span>
                                <span className="tw-text-sm tw-text-gray-500 tw-ml-1">จากเดือนที่แล้ว</span>
                            </div>
                        </div>
                        <div className="tw-w-12 tw-h-12 tw-bg-gradient-to-br tw-from-orange-500 tw-to-orange-600 tw-rounded-xl tw-flex tw-items-center tw-justify-center tw-shadow-lg">
                            <TrendingUp className="tw-w-6 tw-h-6 tw-text-white" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="tw-grid tw-grid-cols-1 tw-lg:tw-grid-cols-2 tw-gap-6 tw-mb-8">
                {/* Revenue Line Chart */}
                <div className="tw-bg-white tw-rounded-2xl tw-shadow-sm tw-p-6 tw-border tw-border-gray-100">
                    <div className="tw-flex tw-items-center tw-justify-between tw-mb-6">
                        <h3 className="tw-text-lg tw-font-semibold tw-text-gray-900 tw-flex tw-items-center">
                            <BarChart3 className="tw-w-5 tw-h-5 tw-mr-2 tw-text-blue-600" />
                            รายได้รายเดือน
                        </h3>
                    </div>
                    <div className="tw-h-80">
                        <Line
                            data={{
                                labels: reportData.revenueByMonth.map(item => item.month),
                                datasets: [{
                                    label: 'รายได้',
                                    data: reportData.revenueByMonth.map(item => item.revenue),
                                    borderColor: '#3B82F6',
                                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                                    borderWidth: 3,
                                    fill: true,
                                    tension: 0.4,
                                    pointBackgroundColor: '#3B82F6',
                                    pointBorderColor: '#ffffff',
                                    pointBorderWidth: 2,
                                    pointRadius: 5,
                                    pointHoverRadius: 7
                                }]
                            }}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                    legend: {
                                        display: false
                                    },
                                    tooltip: {
                                        backgroundColor: 'white',
                                        titleColor: '#374151',
                                        bodyColor: '#374151',
                                        borderColor: '#E5E7EB',
                                        borderWidth: 1,
                                        cornerRadius: 8,
                                        callbacks: {
                                            label: (context) => `รายได้: ${formatCurrency(context.parsed.y || 0)}`
                                        }
                                    }
                                },
                                scales: {
                                    x: {
                                        grid: {
                                            color: '#f0f0f0'
                                        },
                                        ticks: {
                                            color: '#6B7280',
                                            font: {
                                                size: 12
                                            }
                                        }
                                    },
                                    y: {
                                        grid: {
                                            color: '#f0f0f0'
                                        },
                                        ticks: {
                                            color: '#6B7280',
                                            font: {
                                                size: 12
                                            },
                                            callback: (value) => `${(Number(value) / 1000).toFixed(0)}K`
                                        }
                                    }
                                }
                            }}
                        />
                    </div>
                </div>

                {/* Bookings Bar Chart */}
                <div className="tw-bg-white tw-rounded-2xl tw-shadow-sm tw-p-6 tw-border tw-border-gray-100">
                    <div className="tw-flex tw-items-center tw-justify-between tw-mb-6">
                        <h3 className="tw-text-lg tw-font-semibold tw-text-gray-900 tw-flex tw-items-center">
                            <BarChart3 className="tw-w-5 tw-h-5 tw-mr-2 tw-text-green-600" />
                            จำนวนการจองรายเดือน
                        </h3>
                    </div>
                    <div className="tw-h-80">
                        <Bar
                            data={{
                                labels: reportData.revenueByMonth.map(item => item.month),
                                datasets: [{
                                    label: 'การจอง',
                                    data: reportData.revenueByMonth.map(item => item.bookings),
                                    backgroundColor: '#10B981',
                                    borderColor: '#10B981',
                                    borderWidth: 1,
                                    borderRadius: 4,
                                    borderSkipped: false,
                                }]
                            }}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                    legend: {
                                        display: false
                                    },
                                    tooltip: {
                                        backgroundColor: 'white',
                                        titleColor: '#374151',
                                        bodyColor: '#374151',
                                        borderColor: '#E5E7EB',
                                        borderWidth: 1,
                                        cornerRadius: 8,
                                        callbacks: {
                                            label: (context) => `การจอง: ${context.parsed.y}`
                                        }
                                    }
                                },
                                scales: {
                                    x: {
                                        grid: {
                                            color: '#f0f0f0'
                                        },
                                        ticks: {
                                            color: '#6B7280',
                                            font: {
                                                size: 12
                                            }
                                        }
                                    },
                                    y: {
                                        grid: {
                                            color: '#f0f0f0'
                                        },
                                        ticks: {
                                            color: '#6B7280',
                                            font: {
                                                size: 12
                                            }
                                        }
                                    }
                                }
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Pie Charts Section */}
            <div className="tw-grid tw-grid-cols-1 tw-lg:tw-grid-cols-2 tw-gap-6 tw-mb-8">
                {/* User Distribution Pie Chart */}
                <div className="tw-bg-white tw-rounded-2xl tw-shadow-sm tw-p-6 tw-border tw-border-gray-100">
                    <div className="tw-flex tw-items-center tw-justify-between tw-mb-6">
                        <h3 className="tw-text-lg tw-font-semibold tw-text-gray-900 tw-flex tw-items-center">
                            <PieChart className="tw-w-5 tw-h-5 tw-mr-2 tw-text-purple-600" />
                            การกระจายผู้ใช้
                        </h3>
                    </div>
                    <div className="tw-h-80">
                        <Pie
                            data={{
                                labels: pieChartData.map(item => item.name),
                                datasets: [{
                                    data: pieChartData.map(item => item.value),
                                    backgroundColor: pieChartData.map(item => item.color),
                                    borderColor: '#ffffff',
                                    borderWidth: 2,
                                    hoverBorderWidth: 3
                                }]
                            }}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                    legend: {
                                        position: 'bottom',
                                        labels: {
                                            padding: 20,
                                            usePointStyle: true,
                                            font: {
                                                size: 12
                                            }
                                        }
                                    },
                                    tooltip: {
                                        backgroundColor: 'white',
                                        titleColor: '#374151',
                                        bodyColor: '#374151',
                                        borderColor: '#E5E7EB',
                                        borderWidth: 1,
                                        cornerRadius: 8,
                                        callbacks: {
                                            label: (context) => {
                                                const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                                                const percentage = ((context.parsed / total) * 100).toFixed(0);
                                                return `${context.label}: ${formatNumber(context.parsed)} คน (${percentage}%)`;
                                            }
                                        }
                                    }
                                }
                            }}
                        />
                    </div>
                </div>

                {/* Booking Status Pie Chart */}
                <div className="tw-bg-white tw-rounded-2xl tw-shadow-sm tw-p-6 tw-border tw-border-gray-100">
                    <div className="tw-flex tw-items-center tw-justify-between tw-mb-6">
                        <h3 className="tw-text-lg tw-font-semibold tw-text-gray-900 tw-flex tw-items-center">
                            <PieChart className="tw-w-5 tw-h-5 tw-mr-2 tw-text-indigo-600" />
                            สถานะการจอง
                        </h3>
                    </div>
                    <div className="tw-h-80">
                        <Pie
                            data={{
                                labels: statusPieData.map(item => item.name),
                                datasets: [{
                                    data: statusPieData.map(item => item.value),
                                    backgroundColor: statusPieData.map(item => item.color),
                                    borderColor: '#ffffff',
                                    borderWidth: 2,
                                    hoverBorderWidth: 3
                                }]
                            }}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                    legend: {
                                        position: 'bottom',
                                        labels: {
                                            padding: 20,
                                            usePointStyle: true,
                                            font: {
                                                size: 12
                                            }
                                        }
                                    },
                                    tooltip: {
                                        backgroundColor: 'white',
                                        titleColor: '#374151',
                                        bodyColor: '#374151',
                                        borderColor: '#E5E7EB',
                                        borderWidth: 1,
                                        cornerRadius: 8,
                                        callbacks: {
                                            label: (context) => {
                                                const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                                                const percentage = ((context.parsed / total) * 100).toFixed(0);
                                                return `${context.label}: ${formatNumber(context.parsed)} การจอง (${percentage}%)`;
                                            }
                                        }
                                    }
                                }
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Top Facilities Chart */}
            <div className="tw-bg-white tw-rounded-2xl tw-shadow-sm tw-p-6 tw-border tw-border-gray-100 tw-mb-8">
                <div className="tw-flex tw-items-center tw-justify-between tw-mb-6">
                    <h3 className="tw-text-lg tw-font-semibold tw-text-gray-900 tw-flex tw-items-center">
                        <MapPin className="tw-w-5 tw-h-5 tw-mr-2 tw-text-emerald-600" />
                        สนามยอดนิยม
                    </h3>
                </div>
                <div className="tw-h-80">
                    <Bar
                        data={{
                            labels: reportData.topFacilities.map(item => item.name),
                            datasets: [{
                                label: 'การจอง',
                                data: reportData.topFacilities.map(item => item.bookings),
                                backgroundColor: '#10B981',
                                borderColor: '#10B981',
                                borderWidth: 1,
                                borderRadius: 4,
                                borderSkipped: false,
                            }]
                        }}
                        options={{
                            indexAxis: 'y' as const,
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                                legend: {
                                    display: false
                                },
                                tooltip: {
                                    backgroundColor: 'white',
                                    titleColor: '#374151',
                                    bodyColor: '#374151',
                                    borderColor: '#E5E7EB',
                                    borderWidth: 1,
                                    cornerRadius: 8,
                                    callbacks: {
                                        label: (context) => `การจอง: ${context.parsed.x}`
                                    }
                                }
                            },
                            scales: {
                                x: {
                                    grid: {
                                        color: '#f0f0f0'
                                    },
                                    ticks: {
                                        color: '#6B7280',
                                        font: {
                                            size: 12
                                        }
                                    }
                                },
                                y: {
                                    grid: {
                                        display: false
                                    },
                                    ticks: {
                                        color: '#6B7280',
                                        font: {
                                            size: 12
                                        }
                                    }
                                }
                            }
                        }}
                    />
                </div>
            </div>
        </div>
    );
}