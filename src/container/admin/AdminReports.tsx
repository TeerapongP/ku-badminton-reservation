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
import { Line, Bar, Pie } from 'react-chartjs-2';

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

export default function AdminReportsContainer() {
    const router = useRouter();
    const { data: session, status } = useSession();
    const toast = useToast();

    const [reportData, setReportData] = useState<ReportData | null>(null);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState({
        startDate: "",
        endDate: "",
        days: 30
    });

    // Check authentication and role
    useEffect(() => {
        if (status === "loading") return;

        if (!session || ((session.user as any)?.role !== "admin" && (session.user as any)?.role !== "super_admin" && (session.user as any)?.role !== "super-admin")) {
            toast?.showError("ไม่มีสิทธิ์เข้าถึง", "คุณไม่มีสิทธิ์เข้าถึงหน้านี้");
            router.push("/");
            return;
        }

        fetchReportData();
    }, [session, status, router, toast]);

    const fetchReportData = async () => {
        try {
            setLoading(true);

            const params = new URLSearchParams();

            if (dateRange.startDate && dateRange.endDate) {
                params.append('startDate', dateRange.startDate);
                params.append('endDate', dateRange.endDate);
            } else {
                params.append('days', dateRange.days.toString());
            }

            const response = await fetch(`/api/admin/reports?${params}`);
            const data = await response.json();

            if (data.success) {
                setReportData(data.data);
            } else {
                toast?.showError("เกิดข้อผิดพลาด", data.message || "ไม่สามารถโหลดข้อมูลได้");
            }
        } catch (error) {
            console.error('Fetch report data error:', error);
            toast?.showError("เกิดข้อผิดพลาด", "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้");
        } finally {
            setLoading(false);
        }
    };

    const handleExportReport = async () => {
        try {
            if (!reportData) return;

            // Create comprehensive CSV report
            const csvContent = generateReportCSV(reportData);
            downloadCSV(csvContent, `report-${new Date().toISOString().split('T')[0]}.csv`);
            toast?.showSuccess("ส่งออกสำเร็จ", "ดาวน์โหลดรายงานแล้ว");
        } catch (error) {
            toast?.showError("เกิดข้อผิดพลาด", "ไม่สามารถส่งออกรายงานได้");
        }
    };

    const generateReportCSV = (data: ReportData) => {
        const headers = ['ประเภทข้อมูล', 'รายละเอียด', 'จำนวน', 'มูลค่า (บาท)'];
        const rows = [
            ['สถิติการจอง', 'จำนวนการจองทั้งหมด', data.bookingStats.total.toString(), ''],
            ['รายได้', 'รายได้รวม', '', data.revenueStats.total.toString()],
            ['รายได้', 'รายได้เฉลี่ยต่อการจอง', '', data.revenueStats.average.toFixed(2)],
            ['ผู้ใช้', 'ผู้ใช้ที่ใช้งานอยู่', data.userStats.activeUsers.toString(), ''],
            ...data.facilityStats.map(facility => [
                'สนาม',
                facility.facilityName,
                facility.bookings.toString(),
                facility.revenue.toString()
            ])
        ];

        return [headers, ...rows].map(row => row.join(',')).join('\n');
    };

    const downloadCSV = (content: string, filename: string) => {
        const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
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
        { name: 'นิสิต', value: reportData?.userStats.byRole.student || 0, color: '#3B82F6' },
        { name: 'บุคลากร', value: reportData?.userStats.byRole.staff || 0, color: '#10B981' },
        { name: 'บุคคลภายนอก', value: reportData?.userStats.byRole.guest || 0, color: '#F59E0B' },
        { name: 'ผู้ดูแลระบบ', value: reportData?.userStats.byRole.admin || 0, color: '#8B5CF6' }
    ];

    const statusPieData = [
        { name: 'รอยืนยัน', value: reportData?.bookingStats.byStatus.pending || 0, color: '#F59E0B' },
        { name: 'ยืนยันแล้ว', value: reportData?.bookingStats.byStatus.confirmed || 0, color: '#10B981' },
        { name: 'ยกเลิก', value: reportData?.bookingStats.byStatus.cancelled || 0, color: '#EF4444' },
        { name: 'เสร็จสิ้น', value: reportData?.bookingStats.byStatus.completed || 0, color: '#3B82F6' },
        { name: 'ไม่มาใช้', value: reportData?.bookingStats.byStatus.no_show || 0, color: '#F97316' }
    ];

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
                    <p className="tw-text-gray-500 tw-text-lg">ไม่พบข้อมูลรายงาน</p>
                    <Button
                        onClick={fetchReportData}
                        className="tw-mt-4 tw-px-6 tw-py-2 tw-bg-blue-600 tw-text-white tw-rounded-xl"
                    >
                        โหลดข้อมูลใหม่
                    </Button>
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

                    <div>
                        <h1 className="tw-text-3xl md:tw-text-4xl tw-font-bold tw-bg-gradient-to-r tw-from-teal-600 tw-via-blue-600 tw-to-purple-600 tw-bg-clip-text tw-text-transparent">
                            รายงานและสถิติ
                        </h1>
                        <p className="tw-text-gray-600 tw-mt-1">
                            ข้อมูลการใช้งานและสถิติของระบบ
                        </p>
                    </div>
                </div>
                <div className="tw-h-1 tw-w-32 tw-bg-gradient-to-r tw-from-teal-500 tw-via-blue-500 tw-to-purple-500 tw-rounded-full" />
            </div>

            {/* Controls */}
            <div className="tw-bg-white tw-rounded-2xl tw-shadow-lg tw-p-6 tw-border tw-border-gray-100 tw-mb-8">
                <div className="tw-flex tw-items-center tw-justify-between tw-mb-4">
                    <h3 className="tw-text-lg tw-font-bold tw-text-gray-800">ตัวกรองข้อมูล</h3>
                    <div className="tw-flex tw-gap-2">
                        <Button
                            onClick={fetchReportData}
                            variant="secondary"
                            className="tw-px-4 tw-py-2 tw-font-medium tw-rounded-xl tw-transition-all tw-duration-200 tw-bg-gray-100 tw-text-gray-700 tw-border tw-border-transparent tw-flex tw-items-center tw-justify-center hover:tw-bg-gray-200 active:tw-bg-gray-300 focus:tw-ring-0 focus:tw-outline-none"
                        >
                            <RefreshCw className="tw-w-4 tw-h-4 tw-mr-2" />
                            รีเฟรช
                        </Button>
                        <Button
                            onClick={handleExportReport}
                            className="tw-px-4 tw-py-2 tw-font-medium tw-rounded-xl tw-transition-all tw-duration-200 tw-bg-blue-600 tw-text-white tw-border tw-border-transparent tw-flex tw-items-center tw-justify-center hover:tw-bg-blue-700 active:tw-bg-blue-800 focus:tw-ring-0 focus:tw-outline-none"
                        >
                            <Download className="tw-w-4 tw-h-4 tw-mr-2" />
                            ส่งออก CSV
                        </Button>
                    </div>
                </div>

                <div className="tw-grid tw-grid-cols-1 md:tw-grid-cols-3 tw-gap-4">
                    <DropdownField
                        label="ช่วงเวลา"
                        value={dateRange.days.toString()}
                        onChange={(value) => setDateRange(prev => ({ ...prev, days: parseInt(value as string), startDate: "", endDate: "" }))}
                        options={[
                            { label: '7 วันที่ผ่านมา', value: '7' },
                            { label: '30 วันที่ผ่านมา', value: '30' },
                            { label: '90 วันที่ผ่านมา', value: '90' },
                            { label: 'กำหนดเอง', value: '0' }
                        ]}
                        placeholder="เลือกช่วงเวลา"
                    />

                    {dateRange.days === 0 && (
                        <>
                            <DateField
                                label="วันที่เริ่มต้น"
                                value={dateRange.startDate ? new Date(dateRange.startDate) : null}
                                onChange={(value) => setDateRange(prev => ({
                                    ...prev,
                                    startDate: value ? value.toISOString().split('T')[0] : ''
                                }))}
                                placeholder="เลือกวันที่เริ่มต้น"
                            />

                            <DateField
                                label="วันที่สิ้นสุด"
                                value={dateRange.endDate ? new Date(dateRange.endDate) : null}
                                onChange={(value) => setDateRange(prev => ({
                                    ...prev,
                                    endDate: value ? value.toISOString().split('T')[0] : ''
                                }))}
                                placeholder="เลือกวันที่สิ้นสุด"
                            />
                        </>
                    )}
                </div>

                {dateRange.days === 0 && dateRange.startDate && dateRange.endDate && (
                    <div className="tw-mt-4">
                        <Button
                            onClick={fetchReportData}
                            className="tw-px-6 tw-py-2 tw-bg-blue-600 tw-text-white tw-rounded-xl"
                        >
                            อัปเดตรายงาน
                        </Button>
                    </div>
                )}
            </div>

            {/* Summary Cards */}
            <div className="tw-grid tw-grid-cols-1 md:tw-grid-cols-2 lg:tw-grid-cols-4 tw-gap-6 tw-mb-8">
                <div className="tw-bg-white tw-rounded-2xl tw-shadow-lg tw-p-6 tw-border tw-border-gray-100">
                    <div className="tw-flex tw-items-center tw-justify-between">
                        <div>
                            <p className="tw-text-sm tw-font-medium tw-text-gray-600">การจองทั้งหมด</p>
                            <p className="tw-text-3xl tw-font-bold tw-text-blue-600">{formatNumber(reportData.bookingStats.total)}</p>
                        </div>
                        <div className="tw-w-12 tw-h-12 tw-bg-blue-100 tw-rounded-xl tw-flex tw-items-center tw-justify-center">
                            <Calendar className="tw-w-6 tw-h-6 tw-text-blue-600" />
                        </div>
                    </div>
                </div>

                <div className="tw-bg-white tw-rounded-2xl tw-shadow-lg tw-p-6 tw-border tw-border-gray-100">
                    <div className="tw-flex tw-items-center tw-justify-between">
                        <div>
                            <p className="tw-text-sm tw-font-medium tw-text-gray-600">รายได้รวม</p>
                            <p className="tw-text-3xl tw-font-bold tw-text-green-600">
                                {formatCurrency(reportData.revenueStats.total)}
                            </p>
                        </div>
                        <div className="tw-w-12 tw-h-12 tw-bg-green-100 tw-rounded-xl tw-flex tw-items-center tw-justify-center">
                            <DollarSign className="tw-w-6 tw-h-6 tw-text-green-600" />
                        </div>
                    </div>
                </div>

                <div className="tw-bg-white tw-rounded-2xl tw-shadow-lg tw-p-6 tw-border tw-border-gray-100">
                    <div className="tw-flex tw-items-center tw-justify-between">
                        <div>
                            <p className="tw-text-sm tw-font-medium tw-text-gray-600">ผู้ใช้ที่ใช้งานอยู่</p>
                            <p className="tw-text-3xl tw-font-bold tw-text-purple-600">{formatNumber(reportData.userStats.activeUsers)}</p>
                        </div>
                        <div className="tw-w-12 tw-h-12 tw-bg-purple-100 tw-rounded-xl tw-flex tw-items-center tw-justify-center">
                            <Users className="tw-w-6 tw-h-6 tw-text-purple-600" />
                        </div>
                    </div>
                </div>

                <div className="tw-bg-white tw-rounded-2xl tw-shadow-lg tw-p-6 tw-border tw-border-gray-100">
                    <div className="tw-flex tw-items-center tw-justify-between">
                        <div>
                            <p className="tw-text-sm tw-font-medium tw-text-gray-600">รายได้เฉลี่ย</p>
                            <p className="tw-text-3xl tw-font-bold tw-text-teal-600">
                                {formatCurrency(reportData.revenueStats.average)}
                            </p>
                        </div>
                        <div className="tw-w-12 tw-h-12 tw-bg-teal-100 tw-rounded-xl tw-flex tw-items-center tw-justify-center">
                            <TrendingUp className="tw-w-6 tw-h-6 tw-text-teal-600" />
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
                            แนวโน้มรายวัน
                        </h3>
                    </div>
                    <div className="tw-h-80">
                        <Line
                            data={{
                                labels: reportData.dailyTrends?.map(item => new Date(item.date).toLocaleDateString('th-TH', { month: 'short', day: 'numeric' })) || [],
                                datasets: [{
                                    label: 'รายได้',
                                    data: reportData.dailyTrends?.map(item => item.revenue) || [],
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
                            จำนวนการจองรายวัน
                        </h3>
                    </div>
                    <div className="tw-h-80">
                        <Bar
                            data={{
                                labels: reportData.dailyTrends?.map(item => new Date(item.date).toLocaleDateString('th-TH', { month: 'short', day: 'numeric' })) || [],
                                datasets: [{
                                    label: 'การจอง',
                                    data: reportData.dailyTrends?.map(item => item.bookings) || [],
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
                            <PieChart className="tw-w-5 tw-h-5 tw-mr-2 tw-text-orange-600" />
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
                            labels: reportData.facilityStats?.map(item => item.facilityName) || [],
                            datasets: [{
                                label: 'การจอง',
                                data: reportData.facilityStats?.map(item => item.bookings) || [],
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

            {/* Peak Hours Chart */}
            <div className="tw-bg-white tw-rounded-2xl tw-shadow-sm tw-p-6 tw-border tw-border-gray-100 tw-mb-8">
                <div className="tw-flex tw-items-center tw-justify-between tw-mb-6">
                    <h3 className="tw-text-lg tw-font-semibold tw-text-gray-900 tw-flex tw-items-center">
                        <BarChart3 className="tw-w-5 tw-h-5 tw-mr-2 tw-text-indigo-600" />
                        ช่วงเวลายอดนิยม
                    </h3>
                </div>
                <div className="tw-h-80">
                    <Bar
                        data={{
                            labels: reportData.peakHours?.map(hour => hour.timeLabel) || [],
                            datasets: [{
                                label: 'การจอง',
                                data: reportData.peakHours?.map(hour => hour.bookings) || [],
                                backgroundColor: 'rgba(99, 102, 241, 0.8)',
                                borderColor: 'rgb(99, 102, 241)',
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

            {/* Top Users Table */}
            <div className="tw-bg-white tw-rounded-2xl tw-shadow-sm tw-p-6 tw-border tw-border-gray-100 tw-mb-8">
                <div className="tw-flex tw-items-center tw-justify-between tw-mb-6">
                    <h3 className="tw-text-lg tw-font-semibold tw-text-gray-900 tw-flex tw-items-center">
                        <Users className="tw-w-5 tw-h-5 tw-mr-2 tw-text-purple-600" />
                        ผู้ใช้ที่จองมากที่สุด
                    </h3>
                </div>
                <div className="tw-overflow-x-auto">
                    <table className="tw-w-full tw-text-sm tw-text-left">
                        <thead className="tw-text-xs tw-text-gray-700 tw-uppercase tw-bg-gray-50">
                            <tr>
                                <th className="tw-px-6 tw-py-3">อันดับ</th>
                                <th className="tw-px-6 tw-py-3">ชื่อผู้ใช้</th>
                                <th className="tw-px-6 tw-py-3">ชื่อ-นามสกุล</th>
                                <th className="tw-px-6 tw-py-3">บทบาท</th>
                                <th className="tw-px-6 tw-py-3">จำนวนการจอง</th>
                                <th className="tw-px-6 tw-py-3">ยอดใช้จ่าย</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reportData.userStats.topUsers?.map((user, index) => (
                                <tr key={user.userId} className="tw-bg-white tw-border-b hover:tw-bg-gray-50">
                                    <td className="tw-px-6 tw-py-4 tw-font-medium tw-text-gray-900">
                                        #{index + 1}
                                    </td>
                                    <td className="tw-px-6 tw-py-4">{user.username}</td>
                                    <td className="tw-px-6 tw-py-4">{user.name}</td>
                                    <td className="tw-px-6 tw-py-4">
                                        <span className={`tw-px-2 tw-py-1 tw-text-xs tw-font-medium tw-rounded-full ${user.role === 'admin' ? 'tw-bg-red-100 tw-text-red-800' :
                                            user.role === 'staff' ? 'tw-bg-blue-100 tw-text-blue-800' :
                                                user.role === 'student' ? 'tw-bg-green-100 tw-text-green-800' :
                                                    'tw-bg-gray-100 tw-text-gray-800'
                                            }`}>
                                            {user.role === 'admin' ? 'ผู้ดูแลระบบ' :
                                                user.role === 'staff' ? 'บุคลากร' :
                                                    user.role === 'student' ? 'นิสิต' : 'บุคคลภายนอก'}
                                        </span>
                                    </td>
                                    <td className="tw-px-6 tw-py-4 tw-font-semibold tw-text-blue-600">
                                        {formatNumber(user.bookings)}
                                    </td>
                                    <td className="tw-px-6 tw-py-4 tw-font-semibold tw-text-green-600">
                                        {formatCurrency(user.totalSpent)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}