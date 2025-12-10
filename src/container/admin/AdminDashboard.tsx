"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/ToastProvider";
import { Button } from "@/components/Button";
import Loading from "@/components/Loading";
import {
    Users,
    CreditCard,
    Calendar,
    BarChart3,
    Shield,
    Clock,
    AlertTriangle,
    CheckCircle,
    XCircle,
    Image,
    Upload,
    LandPlot
} from "lucide-react";
import { Activity } from "@/lib/ActivityData";
import { DashboardStats } from "@/lib/DashboardData";


export default function AdminDashboard() {
    const router = useRouter();
    const { data: session, status } = useSession();
    const toast = useToast();

    const [stats, setStats] = useState<DashboardStats>({
        pendingPayments: 0,
        todayBookings: 0,
        activeUsers: 0,
        totalUsers: 0,
        totalBookings: 0,
        totalRevenue: 0,
        pendingBookings: 0,
        cancelledBookings: 0,
        lastUpdated: ''
    });
    const [loading, setLoading] = useState(true);
    const [activities, setActivities] = useState<Activity[]>([]);
    const [activitiesLoading, setActivitiesLoading] = useState(false);

    // System status
    const [systemStatus, setSystemStatus] = useState({
        isOpen: true,
        isBusinessHours: true,
        effectiveStatus: true,
        currentHour: 0
    });
    const [systemLoading, setSystemLoading] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());

    // Initialize currentHour after component mounts to avoid hydration issues
    useEffect(() => {
        setSystemStatus(prev => ({
            ...prev,
            currentHour: new Date().getHours()
        }));
        setCurrentTime(new Date());
    }, []);

    // Update current time every second
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (status === "loading") return;

        if (!session || ((session.user as any)?.role !== "admin" && (session.user as any)?.role !== "super_admin" && (session.user as any)?.role !== "super_admin")) {
            toast?.showError("ไม่มีสิทธิ์เข้าถึง", "คุณไม่มีสิทธิ์เข้าถึงหน้านี้");
            router.push("/");
            return;
        }

        fetchDashboardStats();
        fetchRecentActivities();
        fetchSystemStatus();

        // Auto refresh every 5 minutes
        const interval = setInterval(() => {
            fetchDashboardStats();
            fetchRecentActivities();
            fetchSystemStatus();
        }, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, [session, status, router, toast]);

    const fetchDashboardStats = async () => {
        try {
            setLoading(true);

            const response = await fetch('/api/admin/dashboard');
            const data = await response.json();

            if (data.success) {
                setStats(data.data);
            } else {
                toast?.showError("เกิดข้อผิดพลาด", data.message || "ไม่สามารถโหลดข้อมูลได้");
            }
        } catch (error) {
            console.error('Fetch dashboard stats error:', error);
            toast?.showError("เกิดข้อผิดพลาด", "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้");
        } finally {
            setLoading(false);
        }
    };

    const fetchRecentActivities = async () => {
        try {
            setActivitiesLoading(true);

            const response = await fetch('/api/admin/activities?limit=10');
            const data = await response.json();

            if (data.success) {
                setActivities(data.data.activities);
            }
        } catch (error) {
            console.error('Fetch activities error:', error);
        } finally {
            setActivitiesLoading(false);
        }
    };

    const fetchSystemStatus = async () => {
        try {
            const response = await fetch('/api/admin/booking-system');
            const data = await response.json();

            if (data.success) {
                setSystemStatus(data.data);
            }
        } catch (error) {
            console.error('Fetch system status error:', error);
        }
    };

    const toggleSystemStatus = async () => {
        // ใช้เวลาไทย (UTC+7)
        const now = new Date();
        const thailandTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
        const currentHour = thailandTime.getHours();

        // ตรวจสอบว่าอยู่นอกช่วงเวลาที่อนุญาต (08:00 - 19:59 น.)
        if (currentHour < 8 || currentHour >= 20) {
            toast?.showError(
                "ไม่สามารถเปิด/ปิดระบบได้",
                "สามารถเปิด/ปิดระบบได้เฉพาะช่วงเวลา 08:00 - 19:59 น. เท่านั้น ระบบจะเปิดอัตโนมัติเวลา 08:00 น. และปิดอัตโนมัติเวลา 20:00 น."
            );
            return;
        }

        try {
            setSystemLoading(true);

            const response = await fetch('/api/admin/booking-system', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    isOpen: !systemStatus.isOpen
                }),
            });

            const data = await response.json();

            if (data.success) {
                setSystemStatus(prev => ({ ...prev, ...data.data }));
                toast?.showSuccess(
                    "อัปเดตสำเร็จ",
                    `${data.data.isOpen ? 'เปิด' : 'ปิด'}ระบบการจองแล้ว`
                );
                // Fetch ข้อมูลใหม่เพื่อให้แน่ใจว่าได้ข้อมูลล่าสุด
                fetchSystemStatus();
            } else {
                toast?.showError("เกิดข้อผิดพลาด", data.error || "ไม่สามารถอัปเดตสถานะระบบได้");
            }
        } catch (error) {
            console.error('Toggle system status error:', error);
            toast?.showError("เกิดข้อผิดพลาด", "ไม่สามารถอัปเดตสถานะระบบได้");
        } finally {
            setSystemLoading(false);
        }
    };

    if (status === "loading" || loading) {
        return (
            <Loading
                size="lg"
                text="กำลังโหลดแดชบอร์ด..."
                color="blue"
                fullScreen={true}
            />
        );
    }

    if (!session || ((session.user as any)?.role !== "admin" && (session.user as any)?.role !== "super_admin" && (session.user as any)?.role !== "super_admin")) {
        return null;
    }

    const quickActions = [
        {
            title: "ตรวจสอบการชำระเงิน",
            description: "ตรวจสอบสลิปการโอนเงิน",
            icon: CreditCard,
            color: "tw-from-emerald-500 tw-to-emerald-600",
            hoverColor: "hover:tw-from-emerald-600 hover:tw-to-emerald-700",
            count: stats.pendingPayments,
            href: "/admin/payments"
        },
        {
            title: "จัดการการจอง",
            description: "จองสนามแบบ Admin",
            icon: Calendar,
            color: "tw-from-purple-500 tw-to-purple-600",
            hoverColor: "hover:tw-from-purple-600 hover:tw-to-purple-700",
            count: stats.pendingBookings > 0 ? stats.pendingBookings : undefined,
            href: "/admin/bookings"
        },
        {
            title: "อัพโหลดข้อมูลนิสิต",
            description: "นำเข้าข้อมูลนิสิตจากไฟล์ Excel",
            icon: Upload,
            color: "tw-from-blue-500 tw-to-cyan-600",
            hoverColor: "hover:tw-from-blue-600 hover:tw-to-cyan-700",
            href: "/admin/students/upload"
        },
        {
            title: "จัดการ Banner",
            description: "จัดการ banner หน้าแรก",
            icon: Image,
            color: "tw-from-indigo-500 tw-to-indigo-600",
            hoverColor: "hover:tw-from-indigo-600 hover:tw-to-indigo-700",
            href: "/admin/banners"
        },
        {
            title: "รายงานและสถิติ",
            description: "ดูรายงานการใช้งาน",
            icon: BarChart3,
            color: "tw-from-teal-500 tw-to-teal-600",
            hoverColor: "hover:tw-from-teal-600 hover:tw-to-teal-700",
            href: "/admin/reports"
        },
        {
            title: "ตรวจสอบ Log",
            description: "ดู audit log และกิจกรรม",
            icon: Shield,
            color: "tw-from-red-500 tw-to-red-600",
            hoverColor: "hover:tw-from-red-600 hover:tw-to-red-700",
            href: "/admin/audit"
        },
        {
            title: "จัดการสนามแบต",
            description: "ควบคุมการเปิด–ปิดสนามและอาคาร",
            icon: LandPlot,
            color: "tw-from-red-500 tw-to-red-600",
            hoverColor: "hover:tw-from-red-600 hover:tw-to-red-700",
            href: "/admin/court-management"
        }
    ];

    // เพิ่ม action สำหรับ super_admin
    if ((session.user as any)?.role === "super_admin" || (session.user as any)?.role === "super_admin") {
        quickActions.push({
            title: "จัดการ Admin",
            description: "จัดการบัญชี Admin และ Super Admin",
            icon: Users,
            color: "tw-from-orange-500 tw-to-red-600",
            hoverColor: "hover:tw-from-orange-600 hover:tw-to-red-700",
            href: "/admin/manage"
        });
    }

    // Helper function สำหรับแปลง icon string เป็น component
    const getIconComponent = (iconName: string) => {
        switch (iconName) {
            case 'CheckCircle': return CheckCircle;
            case 'XCircle': return XCircle;
            case 'Calendar': return Calendar;
            case 'Users': return Users;
            case 'AlertTriangle': return AlertTriangle;
            default: return Clock;
        }
    };

    return (
        <div className="tw-min-h-screen tw-bg-gradient-to-br tw-from-slate-50 tw-via-blue-50 tw-to-indigo-50 tw-px-6 tw-py-8">
            {/* Header */}
            <div className="tw-mb-8">
                <div className="tw-flex tw-items-center tw-justify-between tw-mb-4">
                    <div>
                        <h1 className="tw-text-4xl tw-font-bold tw-bg-gradient-to-r tw-from-blue-600 tw-via-indigo-600 tw-to-purple-600 tw-bg-clip-text tw-text-transparent">
                            Admin Dashboard
                        </h1>
                        <p className="tw-text-gray-600 tw-mt-2">
                            ยินดีต้อนรับ  {session.user?.username}
                        </p>
                    </div>
                    <div className="tw-text-right tw-flex tw-flex-col tw-items-end tw-gap-2">
                        <Button
                            onClick={fetchDashboardStats}
                            variant="secondary"
                            className="tw-px-4 tw-py-2 tw-font-medium tw-rounded-xl tw-transition-all tw-duration-200 tw-bg-gray-100 tw-text-gray-700 tw-border tw-border-transparent tw-flex tw-items-center tw-justify-center hover:tw-bg-gray-200 active:tw-bg-gray-300 focus:tw-ring-0 focus:tw-outline-none"
                        >
                            รีเฟรชข้อมูล
                        </Button>
                        <div>
                            <p className="tw-text-sm tw-text-gray-500">
                                อัปเดตล่าสุด
                            </p>
                            <p className="tw-text-sm tw-font-medium tw-text-gray-700">
                                {stats.lastUpdated ? new Date(stats.lastUpdated).toLocaleDateString('th-TH', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                }) : 'กำลังโหลด...'}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="tw-h-1 tw-w-32 tw-bg-gradient-to-r tw-from-blue-500 tw-via-indigo-500 tw-to-purple-500 tw-rounded-full" />
            </div>

            {/* Stats Overview */}
            <div className="tw-grid tw-grid-cols-1 md:tw-grid-cols-2 lg:tw-grid-cols-4 tw-gap-6 tw-mb-8">
                <div className="tw-bg-white tw-rounded-2xl tw-shadow-lg tw-p-6 tw-border tw-border-gray-100">
                    <div className="tw-flex tw-items-center tw-justify-between">
                        <div>
                            <p className="tw-text-sm tw-font-medium tw-text-gray-600">การชำระเงินรอตรวจสอบ</p>
                            <p className="tw-text-3xl tw-font-bold tw-text-emerald-600">{stats.pendingPayments}</p>
                        </div>
                        <div className="tw-w-12 tw-h-12 tw-bg-emerald-100 tw-rounded-xl tw-flex tw-items-center tw-justify-center">
                            <CreditCard className="tw-w-6 tw-h-6 tw-text-emerald-600" />
                        </div>
                    </div>
                </div>

                <div className="tw-bg-white tw-rounded-2xl tw-shadow-lg tw-p-6 tw-border tw-border-gray-100">
                    <div className="tw-flex tw-items-center tw-justify-between">
                        <div>
                            <p className="tw-text-sm tw-font-medium tw-text-gray-600">การจองวันนี้</p>
                            <p className="tw-text-3xl tw-font-bold tw-text-purple-600">{stats.todayBookings}</p>
                        </div>
                        <div className="tw-w-12 tw-h-12 tw-bg-purple-100 tw-rounded-xl tw-flex tw-items-center tw-justify-center">
                            <Calendar className="tw-w-6 tw-h-6 tw-text-purple-600" />
                        </div>
                    </div>
                </div>

                <div className="tw-bg-white tw-rounded-2xl tw-shadow-lg tw-p-6 tw-border tw-border-gray-100">
                    <div className="tw-flex tw-items-center tw-justify-between">
                        <div>
                            <p className="tw-text-sm tw-font-medium tw-text-gray-600">สมาชิกที่ใช้งานอยู่</p>
                            <p className="tw-text-3xl tw-font-bold tw-text-teal-600">{stats.activeUsers}</p>
                        </div>
                        <div className="tw-w-12 tw-h-12 tw-bg-teal-100 tw-rounded-xl tw-flex tw-items-center tw-justify-center">
                            <Users className="tw-w-6 tw-h-6 tw-text-teal-600" />
                        </div>
                    </div>
                </div>

                <div className="tw-bg-white tw-rounded-2xl tw-shadow-lg tw-p-6 tw-border tw-border-gray-100">
                    <div className="tw-flex tw-items-center tw-justify-between">
                        <div>
                            <p className="tw-text-sm tw-font-medium tw-text-gray-600">รายได้รวม</p>
                            <p className="tw-text-3xl tw-font-bold tw-text-blue-600">
                                ฿{stats.totalRevenue.toLocaleString()}
                            </p>
                        </div>
                        <div className="tw-w-12 tw-h-12 tw-bg-blue-100 tw-rounded-xl tw-flex tw-items-center tw-justify-center">
                            <BarChart3 className="tw-w-6 tw-h-6 tw-text-blue-600" />
                        </div>
                    </div>
                </div>
            </div>

            {/* System Control Panel */}
            <div className="tw-mb-8">
                <h2 className="tw-text-2xl tw-font-bold tw-text-gray-800 tw-mb-6">ควบคุมระบบ</h2>
                <div className="tw-bg-white tw-rounded-2xl tw-shadow-lg tw-p-6 tw-border tw-border-gray-100">
                    <div className="tw-flex tw-items-center tw-justify-between tw-mb-4">
                        <div className="tw-flex tw-items-center tw-space-x-4">
                            <div className={`tw-w-12 tw-h-12 tw-rounded-xl tw-flex tw-items-center tw-justify-center ${systemStatus.effectiveStatus
                                ? 'tw-bg-green-100'
                                : 'tw-bg-red-100'
                                }`}>
                                {systemStatus.effectiveStatus ? (
                                    <CheckCircle className="tw-w-6 tw-h-6 tw-text-green-600" />
                                ) : (
                                    <XCircle className="tw-w-6 tw-h-6 tw-text-red-600" />
                                )}
                            </div>
                            <div>
                                <h3 className="tw-text-lg tw-font-bold tw-text-gray-800">
                                    สถานะระบบการจอง
                                </h3>
                                <p className={`tw-text-sm tw-font-medium ${systemStatus.effectiveStatus
                                    ? 'tw-text-green-600'
                                    : 'tw-text-red-600'
                                    }`}>
                                    {systemStatus.effectiveStatus ? 'เปิดให้บริการ' : 'ปิดให้บริการ'}
                                </p>
                            </div>
                        </div>
                        <Button
                            onClick={toggleSystemStatus}
                            disabled={systemLoading || (() => {
                                const now = new Date();
                                const thailandTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
                                const hour = thailandTime.getHours();
                                return hour < 8 || hour >= 20;
                            })()}
                            className={`tw-px-6 tw-py-3 tw-font-semibold tw-rounded-xl tw-transition-all tw-duration-300 tw-shadow-lg hover:tw-shadow-xl tw-border-0 tw-outline-none focus:tw-outline-none disabled:tw-opacity-50 disabled:tw-cursor-not-allowed ${systemStatus.isOpen
                                ? 'tw-bg-gradient-to-r tw-from-red-500 tw-to-red-600 hover:tw-from-red-600 hover:tw-to-red-700 tw-text-white focus:tw-ring-4 focus:tw-ring-red-300'
                                : 'tw-bg-gradient-to-r tw-from-green-500 tw-to-green-600 hover:tw-from-green-600 hover:tw-to-green-700 tw-text-white focus:tw-ring-4 focus:tw-ring-green-300'
                                }`}
                        >
                            {systemLoading ? (
                                <div className="tw-flex tw-items-center tw-space-x-2">
                                    <div className="tw-animate-spin tw-rounded-full tw-h-4 tw-w-4 tw-border-b-2 tw-border-white"></div>
                                    <span>กำลังอัปเดต...</span>
                                </div>
                            ) : (
                                systemStatus.isOpen ? 'ปิดระบบ' : 'เปิดระบบ'
                            )}
                        </Button>
                    </div>

                    {/* ข้อความแจ้งเตือนสำหรับ Admin */}
                    {(() => {
                        const now = new Date();
                        const thailandTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
                        const hour = thailandTime.getHours();

                        if (hour < 8) {
                            return (
                                <div className="tw-mt-3 tw-p-3 tw-bg-orange-50 tw-border tw-border-orange-200 tw-rounded-lg">
                                    <div className="tw-flex tw-items-center tw-space-x-2">
                                        <AlertTriangle className="tw-w-4 tw-h-4 tw-text-orange-600" />
                                        <p className="tw-text-sm tw-text-orange-700">
                                            ไม่สามารถเปิด/ปิดระบบได้ในช่วงเวลา 20:00 - 07:59 น. ระบบจะเปิดอัตโนมัติเวลา 08:00 น.
                                        </p>
                                    </div>
                                </div>
                            );
                        }

                        if (hour >= 20) {
                            return (
                                <div className="tw-mt-3 tw-p-3 tw-bg-blue-50 tw-border tw-border-blue-200 tw-rounded-lg">
                                    <div className="tw-flex tw-items-center tw-space-x-2">
                                        <CheckCircle className="tw-w-4 tw-h-4 tw-text-blue-600" />
                                        <p className="tw-text-sm tw-text-blue-700">
                                            ระบบปิดอัตโนมัติเวลา 20:00 น. แล้ว ไม่สามารถเปิด/ปิดระบบได้จนกว่าจะถึง 08:00 น.
                                        </p>
                                    </div>
                                </div>
                            );
                        }

                        return null;
                    })()}

                    <div className="tw-grid tw-grid-cols-1 md:tw-grid-cols-3 tw-gap-4 tw-pt-4 tw-border-t tw-border-gray-100">
                        <div className="tw-text-center">
                            <p className="tw-text-sm tw-text-gray-600 tw-mb-1">สถานะการตั้งค่า</p>
                            <div className="tw-flex tw-items-center tw-justify-center tw-space-x-2">
                                <div className={`tw-w-3 tw-h-3 tw-rounded-full ${systemStatus.isOpen ? 'tw-bg-green-500' : 'tw-bg-red-500'
                                    }`}></div>
                                <span className={`tw-text-sm tw-font-medium ${systemStatus.isOpen ? 'tw-text-green-600' : 'tw-text-red-600'
                                    }`}>
                                    {systemStatus.isOpen ? 'เปิด' : 'ปิด'}
                                </span>
                            </div>
                        </div>

                        <div className="tw-text-center">
                            <p className="tw-text-sm tw-text-gray-600 tw-mb-1">เวลาทำการ</p>
                            <div className="tw-flex tw-items-center tw-justify-center tw-space-x-2">
                                <div className={`tw-w-3 tw-h-3 tw-rounded-full ${systemStatus.isBusinessHours ? 'tw-bg-green-500' : 'tw-bg-orange-500'
                                    }`}></div>
                                <span className={`tw-text-sm tw-font-medium ${systemStatus.isBusinessHours ? 'tw-text-green-600' : 'tw-text-orange-600'
                                    }`}>
                                    {systemStatus.isBusinessHours ? 'เวลาทำการ' : 'นอกเวลาทำการ'}
                                </span>
                            </div>
                        </div>

                        <div className="tw-text-center">
                            <p className="tw-text-sm tw-text-gray-600 tw-mb-1">เวลาปัจจุบัน</p>
                            <div className="tw-flex tw-items-center tw-justify-center tw-space-x-2">
                                <Clock className="tw-w-4 tw-h-4 tw-text-gray-500" />
                                <span className="tw-text-sm tw-font-medium tw-text-gray-700">
                                    {currentTime.toLocaleTimeString('th-TH', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        hour12: false
                                    })} น.
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="tw-mt-4 tw-p-3 tw-bg-gray-50 tw-rounded-lg">
                        <p className="tw-text-xs tw-text-gray-600 tw-leading-relaxed">
                            <strong>หมายเหตุ:</strong> ระบบจะเปิดให้บริการเฉพาะเมื่อ "สถานะการตั้งค่า" เป็น "เปิด" และอยู่ใน "เวลาทำการ" (6:00-22:00 น.) เท่านั้น
                        </p>
                    </div>
                </div>
            </div>

            <div className="tw-grid tw-grid-cols-1 lg:tw-grid-cols-3 tw-gap-8">
                {/* Quick Actions */}
                <div className="lg:tw-col-span-2">
                    <h2 className="tw-text-2xl tw-font-bold tw-text-gray-800 tw-mb-6">การจัดการหลัก</h2>
                    <div className="tw-grid tw-grid-cols-1 md:tw-grid-cols-2 tw-gap-6">
                        {quickActions.map((action, index) => {
                            const IconComponent = action.icon;
                            return (
                                <div key={index} className="tw-group tw-cursor-pointer" onClick={() => router.push(action.href)}>
                                    <div className="tw-bg-white tw-rounded-2xl tw-shadow-lg hover:tw-shadow-xl tw-transition-all tw-duration-300 tw-p-6 tw-border tw-border-gray-100 hover:tw-border-gray-200">
                                        <div className="tw-flex tw-items-start tw-justify-between tw-mb-4">
                                            <div className={`tw-w-14 tw-h-14 tw-bg-gradient-to-r ${action.color} tw-rounded-xl tw-flex tw-items-center tw-justify-center tw-shadow-lg`}>
                                                <IconComponent className="tw-w-7 tw-h-7 tw-text-white" />
                                            </div>
                                            {action.count !== undefined && (
                                                <span className="tw-bg-red-500 tw-text-white tw-text-xs tw-font-bold tw-px-2 tw-py-1 tw-rounded-full">
                                                    {action.count}
                                                </span>
                                            )}
                                        </div>
                                        <h3 className="tw-text-lg tw-font-bold tw-text-gray-800 tw-mb-2 group-hover:tw-text-blue-600 tw-transition-colors">
                                            {action.title}
                                        </h3>
                                        <p className="tw-text-gray-600 tw-text-sm">
                                            {action.description}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Recent Activities */}
                <div>
                    <div className="tw-flex tw-items-center tw-justify-between tw-mb-6">
                        <h2 className="tw-text-2xl tw-font-bold tw-text-gray-800">กิจกรรมล่าสุด</h2>
                        <Button
                            onClick={fetchRecentActivities}
                            variant="secondary"
                            disabled={activitiesLoading}
                            className="tw-px-3 tw-py-2 tw-text-sm tw-font-medium tw-rounded-lg tw-transition-all tw-duration-200 tw-bg-gray-100 tw-text-gray-700 tw-border tw-border-transparent tw-flex tw-items-center tw-justify-center hover:tw-bg-gray-200 active:tw-bg-gray-300 focus:tw-ring-0 focus:tw-outline-none disabled:tw-opacity-50"
                        >
                            รีเฟรช
                        </Button>
                    </div>
                    <div className="tw-bg-white tw-rounded-2xl tw-shadow-lg tw-p-6 tw-border tw-border-gray-100">
                        {activitiesLoading ? (
                            <div className="tw-flex tw-items-center tw-justify-center tw-py-8">
                                <div className="tw-animate-spin tw-rounded-full tw-h-8 tw-w-8 tw-border-b-2 tw-border-blue-600"></div>
                                <span className="tw-ml-2 tw-text-gray-600">กำลังโหลดกิจกรรม...</span>
                            </div>
                        ) : activities.length > 0 ? (
                            <div className="tw-space-y-4">
                                {activities.map((activity, index) => {
                                    const IconComponent = getIconComponent(activity.icon);
                                    return (
                                        <div key={index} className="tw-flex tw-items-start tw-space-x-3 tw-p-3 tw-rounded-lg hover:tw-bg-gray-50 tw-transition-colors">
                                            <div className={`tw-w-8 tw-h-8 tw-rounded-full tw-bg-gray-100 tw-flex tw-items-center tw-justify-center tw-flex-shrink-0`}>
                                                <IconComponent className={`tw-w-4 tw-h-4 ${activity.color}`} />
                                            </div>
                                            <div className="tw-flex-1 tw-min-w-0">
                                                <p className="tw-text-sm tw-font-medium tw-text-gray-800 tw-leading-5">
                                                    {activity.message}
                                                </p>
                                                <p className="tw-text-xs tw-text-gray-500 tw-mt-1 tw-flex tw-items-center">
                                                    <Clock className="tw-w-3 tw-h-3 tw-mr-1" />
                                                    {activity.timeAgo}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="tw-text-center tw-py-8">
                                <AlertTriangle className="tw-w-12 tw-h-12 tw-text-gray-300 tw-mx-auto tw-mb-4" />
                                <p className="tw-text-gray-500">ไม่มีกิจกรรมล่าสุด</p>
                            </div>
                        )}
                    </div>
                    <div className="tw-mt-6 tw-pt-4 tw-border-t tw-border-gray-100">
                        <Button
                            onClick={() => router.push("/admin/audit")}
                            className="tw-w-full tw-h-12 tw-text-lg tw-font-semibold tw-shadow-lg tw-rounded-xl tw-transition-all tw-duration-300 hover:tw-shadow-xl hover:tw-scale-105 active:tw-scale-95 tw-relative tw-overflow-hidden tw-border-0 tw-outline-none focus:tw-outline-none disabled:tw-opacity-50 disabled:tw-cursor-not-allowed disabled:hover:tw-scale-100"
                            colorClass="tw-bg-gradient-to-r tw-from-emerald-500 tw-to-emerald-600 hover:tw-from-emerald-600 hover:tw-to-emerald-700 tw-text-white focus:tw-ring-4 focus:tw-ring-emerald-300"
                        >
                            <span className="tw-relative tw-flex tw-items-center tw-justify-center tw-gap-2">
                                ดูกิจกรรมทั้งหมด
                            </span>
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}