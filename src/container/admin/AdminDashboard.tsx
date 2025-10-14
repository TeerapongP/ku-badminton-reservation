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
    Settings,
    BarChart3,
    Shield,
    Clock,
    CheckCircle,
    XCircle,
    AlertTriangle
} from "lucide-react";

interface DashboardStats {
    pendingMembers: number;
    pendingPayments: number;
    todayBookings: number;
    activeUsers: number;
}

export default function AdminDashboard() {
    const router = useRouter();
    const { data: session, status } = useSession();
    const toast = useToast();

    const [stats, setStats] = useState<DashboardStats>({
        pendingMembers: 0,
        pendingPayments: 0,
        todayBookings: 0,
        activeUsers: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (status === "loading") return;

        if (!session || (session.user as any)?.role !== "admin") {
            toast.showError("ไม่มีสิทธิ์เข้าถึง", "คุณไม่มีสิทธิ์เข้าถึงหน้านี้");
            router.push("/");
            return;
        }

        fetchDashboardStats();
    }, [session, status, router, toast]);

    const fetchDashboardStats = async () => {
        try {
            // Mock data for now - will be replaced with actual API calls
            await new Promise(resolve => setTimeout(resolve, 1000));
            setStats({
                pendingMembers: 5,
                pendingPayments: 12,
                todayBookings: 28,
                activeUsers: 156
            });
        } catch (error) {
            toast.showError("ไม่สามารถโหลดข้อมูลได้", "กรุณาลองใหม่อีกครั้ง");
        } finally {
            setLoading(false);
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

    if (!session || (session.user as any)?.role !== "admin") {
        return null;
    }

    const quickActions = [
        {
            title: "จัดการสมาชิก",
            description: "อนุมัติ/ปฏิเสธสมาชิกใหม่",
            icon: Users,
            color: "tw-from-blue-500 tw-to-blue-600",
            hoverColor: "hover:tw-from-blue-600 hover:tw-to-blue-700",
            count: stats.pendingMembers,
            href: "/admin/members"
        },
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
            count: stats.todayBookings,
            href: "/admin/bookings"
        },
        {
            title: "ควบคุมระบบ",
            description: "ตั้งค่าระบบและ blackout",
            icon: Settings,
            color: "tw-from-orange-500 tw-to-orange-600",
            hoverColor: "hover:tw-from-orange-600 hover:tw-to-orange-700",
            href: "/admin/system"
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
        }
    ];

    const recentActivities = [
        {
            type: "member_approval",
            message: "อนุมัติสมาชิกใหม่: นายสมชาย ใจดี",
            time: "5 นาทีที่แล้ว",
            icon: CheckCircle,
            color: "tw-text-green-600"
        },
        {
            type: "payment_rejection",
            message: "ปฏิเสธการชำระเงิน: สลิปไม่ชัดเจน",
            time: "15 นาทีที่แล้ว",
            icon: XCircle,
            color: "tw-text-red-600"
        },
        {
            type: "booking_created",
            message: "สร้างการจองสำหรับกิจกรรมพิเศษ",
            time: "1 ชั่วโมงที่แล้ว",
            icon: Calendar,
            color: "tw-text-blue-600"
        },
        {
            type: "system_alert",
            message: "ระบบตรวจพบการเข้าสู่ระบบผิดปกติ",
            time: "2 ชั่วโมงที่แล้ว",
            icon: AlertTriangle,
            color: "tw-text-yellow-600"
        }
    ];

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
                            ยินดีต้อนรับ, {session.user?.name || "Admin"}
                        </p>
                    </div>
                    <div className="tw-text-right">
                        <p className="tw-text-sm tw-text-gray-500">
                            เข้าสู่ระบบล่าสุด
                        </p>
                        <p className="tw-text-sm tw-font-medium tw-text-gray-700">
                            {new Date().toLocaleDateString('th-TH', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </p>
                    </div>
                </div>
                <div className="tw-h-1 tw-w-32 tw-bg-gradient-to-r tw-from-blue-500 tw-via-indigo-500 tw-to-purple-500 tw-rounded-full" />
            </div>

            {/* Stats Overview */}
            <div className="tw-grid tw-grid-cols-1 md:tw-grid-cols-2 lg:tw-grid-cols-4 tw-gap-6 tw-mb-8">
                <div className="tw-bg-white tw-rounded-2xl tw-shadow-lg tw-p-6 tw-border tw-border-gray-100">
                    <div className="tw-flex tw-items-center tw-justify-between">
                        <div>
                            <p className="tw-text-sm tw-font-medium tw-text-gray-600">สมาชิกรอการอนุมัติ</p>
                            <p className="tw-text-3xl tw-font-bold tw-text-blue-600">{stats.pendingMembers}</p>
                        </div>
                        <div className="tw-w-12 tw-h-12 tw-bg-blue-100 tw-rounded-xl tw-flex tw-items-center tw-justify-center">
                            <Users className="tw-w-6 tw-h-6 tw-text-blue-600" />
                        </div>
                    </div>
                </div>

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
                    <h2 className="tw-text-2xl tw-font-bold tw-text-gray-800 tw-mb-6">กิจกรรมล่าสุด</h2>
                    <div className="tw-bg-white tw-rounded-2xl tw-shadow-lg tw-p-6 tw-border tw-border-gray-100">
                        <div className="tw-space-y-4">
                            {recentActivities.map((activity, index) => {
                                const IconComponent = activity.icon;
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
                                                {activity.time}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="tw-mt-6 tw-pt-4 tw-border-t tw-border-gray-100">
                            <Button
                                onClick={() => router.push("/admin/audit")}
                                variant="secondary"
                                className="tw-w-full tw-text-sm"
                            >
                                ดูกิจกรรมทั้งหมด
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}