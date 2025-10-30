"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/ToastProvider";
import { Button } from "@/components/Button";
import Loading from "@/components/Loading";
import {
    Shield,
    Download,
    Eye,
    ArrowLeft,
    Clock,
    User,
    Activity,
    AlertTriangle,
    CheckCircle,
    XCircle,
    FileText,
    RefreshCw,
    Filter,
    Calendar,
    TrendingUp,
    TrendingDown,
    BarChart3
} from "lucide-react";
import SearchInput from "@/components/SearchInput";
import { DropdownField } from "@/components/DropdownField";
import { DateField } from "@/components/DateField";

interface AuditLog {
    id: string;
    userId: string | null;
    usernameInput: string;
    action: 'login_success' | 'login_fail' | 'logout';
    ip: string | null;
    userAgent: string | null;
    createdAt: string;
    user: {
        id: string;
        username: string;
        name: string;
        role: string;
        email: string;
    } | null;
}

interface AuditStats {
    period: {
        days: number;
        startDate: string;
        endDate: string;
    };
    loginStats: {
        total: number;
        successful: number;
        failed: number;
        logout: number;
    };
    dailyTrends: Array<{
        date: string;
        action: string;
        count: number;
    }>;
    topFailedIPs: Array<{
        ip: string;
        failedAttempts: number;
    }>;
    suspiciousActivities: Array<{
        username: string;
        ip: string;
        failedAttempts: number;
        lastAttempt: string;
    }>;
    topUsers: Array<{
        userId: string;
        loginCount: number;
        user: {
            username: string;
            name: string;
            role: string;
        } | null;
    }>;
}const ACTION_CONFIG = {
    'login_success': {
        icon: CheckCircle,
        color: 'text-green-600',
        bg: 'bg-green-50',
        label: 'เข้าสู่ระบบสำเร็จ'
    },
    'login_fail': {
        icon: XCircle,
        color: 'text-red-600',
        bg: 'bg-red-50',
        label: 'เข้าสู่ระบบไม่สำเร็จ'
    },
    'logout': {
        icon: ArrowLeft,
        color: 'text-blue-600',
        bg: 'bg-blue-50',
        label: 'ออกจากระบบ'
    }
};

export default function AdminAudit() {
    const router = useRouter();
    const { data: session, status } = useSession();
    const toast = useToast();

    const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
    const [auditStats, setAuditStats] = useState<AuditStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [statsLoading, setStatsLoading] = useState(true);

    // Filters
    const [searchTerm, setSearchTerm] = useState("");
    const [actionFilter, setActionFilter] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    const pageSize = 20;

    useEffect(() => {
        if (status === "loading") return;

        if (!session || ((session.user as any)?.role !== "admin" && (session.user as any)?.role !== "super_admin" && (session.user as any)?.role !== "super-admin")) {
            toast?.showError("ไม่มีสิทธิ์เข้าถึง", "คุณไม่มีสิทธิ์เข้าถึงหน้านี้");
            router.push("/");
            return;
        }

        fetchAuditLogs();
        fetchAuditStats();
    }, [session, status, router, toast, currentPage, actionFilter, startDate, endDate]);

    useEffect(() => {
        // Reset to first page when filters change
        if (currentPage !== 1) {
            setCurrentPage(1);
        } else {
            fetchAuditLogs();
        }
    }, [searchTerm, actionFilter, startDate, endDate]);

    const fetchAuditLogs = async () => {
        try {
            setLoading(true);

            const params = new URLSearchParams({
                page: currentPage.toString(),
                limit: pageSize.toString()
            });

            if (actionFilter) params.append('action', actionFilter);
            if (searchTerm) params.append('username', searchTerm);
            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);

            const response = await fetch(`/api/admin/audit-logs?${params}`);
            const data = await response.json();

            if (data.success) {
                setAuditLogs(data.data.logs);
                setTotalPages(data.data.pagination.totalPages);
                setTotalCount(data.data.pagination.totalCount);
            } else {
                toast?.showError("เกิดข้อผิดพลาด", data.message || "ไม่สามารถโหลดข้อมูลได้");
            }
        } catch (error) {
            console.error('Fetch audit logs error:', error);
            toast?.showError("เกิดข้อผิดพลาด", "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้");
        } finally {
            setLoading(false);
        }
    };

    const fetchAuditStats = async () => {
        try {
            setStatsLoading(true);
            const response = await fetch('/api/admin/audit-stats?days=7');
            const data = await response.json();

            if (data.success) {
                setAuditStats(data.data);
            } else {
                console.error('Failed to fetch audit stats:', data.message);
            }
        } catch (error) {
            console.error('Fetch audit stats error:', error);
        } finally {
            setStatsLoading(false);
        }
    };

    const handleExport = async () => {
        try {
            const params = new URLSearchParams({
                limit: '1000' // Export more records
            });

            if (actionFilter) params.append('action', actionFilter);
            if (searchTerm) params.append('username', searchTerm);
            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);

            const response = await fetch(`/api/admin/audit-logs?${params}`);
            const data = await response.json();

            if (data.success) {
                // Convert to CSV
                const csvContent = convertToCSV(data.data.logs);
                downloadCSV(csvContent, 'audit-logs.csv');
                toast?.showSuccess("ส่งออกสำเร็จ", "ดาวน์โหลดไฟล์ audit logs แล้ว");
            }
        } catch (error) {
            toast?.showError("เกิดข้อผิดพลาด", "ไม่สามารถส่งออกข้อมูลได้");
        }
    };

    const convertToCSV = (logs: AuditLog[]) => {
        const headers = ['วันที่', 'เวลา', 'การกระทำ', 'ผู้ใช้', 'ชื่อผู้ใช้', 'IP Address', 'สถานะ'];
        const rows = logs.map(log => [
            new Date(log.createdAt).toLocaleDateString('th-TH'),
            new Date(log.createdAt).toLocaleTimeString('th-TH'),
            ACTION_CONFIG[log.action]?.label || log.action,
            log.user?.name || 'ไม่ระบุ',
            log.usernameInput,
            log.ip || 'ไม่ระบุ',
            log.action === 'login_success' ? 'สำเร็จ' : log.action === 'login_fail' ? 'ไม่สำเร็จ' : 'ออกจากระบบ'
        ]);

        return [headers, ...rows].map(row => row.join(',')).join('\n');
    };

    const downloadCSV = (content: string, filename: string) => {
        const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
    };

    if (status === "loading" || loading) {
        return (
            <Loading
                size="lg"
                text="กำลังโหลดข้อมูล audit logs..."
                color="blue"
                fullScreen={true}
            />
        );
    }

    if (!session || ((session.user as any)?.role !== "admin" && (session.user as any)?.role !== "super_admin" && (session.user as any)?.role !== "super-admin")) {
        return null;
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
                        <h1 className="tw-text-3xl md:tw-text-4xl tw-font-bold tw-bg-gradient-to-r tw-from-red-600 tw-via-purple-600 tw-to-blue-600 tw-bg-clip-text tw-text-transparent">
                            Audit Logs
                        </h1>
                        <p className="tw-text-gray-600 tw-mt-1">
                            ตรวจสอบกิจกรรมและการเข้าถึงระบบ
                        </p>
                    </div>
                </div>
                <div className="tw-h-1 tw-w-32 tw-bg-gradient-to-r tw-from-red-500 tw-via-purple-500 tw-to-blue-500 tw-rounded-full" />
            </div>

            {/* Statistics Cards */}
            {!statsLoading && auditStats && (
                <div className="tw-grid tw-grid-cols-1 md:tw-grid-cols-4 tw-gap-6 tw-mb-8">
                    <div className="tw-bg-white tw-rounded-2xl tw-shadow-lg tw-p-6 tw-border tw-border-gray-100">
                        <div className="tw-flex tw-items-center tw-justify-between">
                            <div>
                                <p className="tw-text-sm tw-font-medium tw-text-gray-600">รวมทั้งหมด</p>
                                <p className="tw-text-3xl tw-font-bold tw-text-blue-600">{auditStats.loginStats.total}</p>
                            </div>
                            <div className="tw-w-12 tw-h-12 tw-bg-blue-100 tw-rounded-xl tw-flex tw-items-center tw-justify-center">
                                <Activity className="tw-w-6 tw-h-6 tw-text-blue-600" />
                            </div>
                        </div>
                    </div>

                    <div className="tw-bg-white tw-rounded-2xl tw-shadow-lg tw-p-6 tw-border tw-border-gray-100">
                        <div className="tw-flex tw-items-center tw-justify-between">
                            <div>
                                <p className="tw-text-sm tw-font-medium tw-text-gray-600">เข้าสู่ระบบสำเร็จ</p>
                                <p className="tw-text-3xl tw-font-bold tw-text-green-600">{auditStats.loginStats.successful}</p>
                            </div>
                            <div className="tw-w-12 tw-h-12 tw-bg-green-100 tw-rounded-xl tw-flex tw-items-center tw-justify-center">
                                <CheckCircle className="tw-w-6 tw-h-6 tw-text-green-600" />
                            </div>
                        </div>
                    </div>

                    <div className="tw-bg-white tw-rounded-2xl tw-shadow-lg tw-p-6 tw-border tw-border-gray-100">
                        <div className="tw-flex tw-items-center tw-justify-between">
                            <div>
                                <p className="tw-text-sm tw-font-medium tw-text-gray-600">เข้าสู่ระบบไม่สำเร็จ</p>
                                <p className="tw-text-3xl tw-font-bold tw-text-red-600">{auditStats.loginStats.failed}</p>
                            </div>
                            <div className="tw-w-12 tw-h-12 tw-bg-red-100 tw-rounded-xl tw-flex tw-items-center tw-justify-center">
                                <XCircle className="tw-w-6 tw-h-6 tw-text-red-600" />
                            </div>
                        </div>
                    </div>

                    <div className="tw-bg-white tw-rounded-2xl tw-shadow-lg tw-p-6 tw-border tw-border-gray-100">
                        <div className="tw-flex tw-items-center tw-justify-between">
                            <div>
                                <p className="tw-text-sm tw-font-medium tw-text-gray-600">กิจกรรมน่าสงสัย</p>
                                <p className="tw-text-3xl tw-font-bold tw-text-orange-600">{auditStats.suspiciousActivities.length}</p>
                            </div>
                            <div className="tw-w-12 tw-h-12 tw-bg-orange-100 tw-rounded-xl tw-flex tw-items-center tw-justify-center">
                                <AlertTriangle className="tw-w-6 tw-h-6 tw-text-orange-600" />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Suspicious Activities Alert */}
            {!statsLoading && auditStats && auditStats.suspiciousActivities.length > 0 && (
                <div className="tw-bg-orange-50 tw-border tw-border-orange-200 tw-rounded-2xl tw-p-6 tw-mb-8">
                    <div className="tw-flex tw-items-start tw-gap-4">
                        <AlertTriangle className="tw-w-6 tw-h-6 tw-text-orange-600 tw-flex-shrink-0 tw-mt-1" />
                        <div className="tw-flex-1">
                            <h3 className="tw-text-lg tw-font-bold tw-text-orange-800 tw-mb-2">
                                ตรวจพบกิจกรรมน่าสงสัย
                            </h3>
                            <p className="tw-text-orange-700 tw-mb-4">
                                พบการพยายามเข้าสู่ระบบที่ไม่สำเร็จหลายครั้งจาก IP หรือ username เดียวกัน
                            </p>
                            <div className="tw-space-y-2">
                                {auditStats.suspiciousActivities.slice(0, 3).map((activity, index) => (
                                    <div key={index} className="tw-bg-white tw-rounded-lg tw-p-3 tw-text-sm">
                                        <span className="tw-font-medium tw-text-gray-800">
                                            {activity.username}
                                        </span>
                                        <span className="tw-text-gray-600 tw-mx-2">จาก IP</span>
                                        <span className="tw-font-mono tw-text-gray-800">
                                            {activity.ip}
                                        </span>
                                        <span className="tw-text-gray-600 tw-mx-2">พยายาม</span>
                                        <span className="tw-font-bold tw-text-red-600">
                                            {activity.failedAttempts} ครั้ง
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="tw-bg-white tw-rounded-2xl tw-shadow-lg tw-p-6 tw-border tw-border-gray-100 tw-mb-8">
                <div className="tw-flex tw-items-center tw-gap-4 tw-mb-4">
                    <Filter className="tw-w-5 tw-h-5 tw-text-gray-600" />
                    <h3 className="tw-text-lg tw-font-bold tw-text-gray-800">ตัวกรอง</h3>
                </div>

                <div className="tw-grid tw-grid-cols-1 md:tw-grid-cols-2 lg:tw-grid-cols-4 tw-gap-4">
                    <SearchInput
                        value={searchTerm}
                        onChange={setSearchTerm}
                        placeholder="ค้นหาชื่อผู้ใช้..."
                        onSubmit={() => { }}
                    />

                    <DropdownField
                        label=""
                        value={actionFilter}
                        onChange={(value) => setActionFilter(value as string)}
                        options={[
                            { label: 'ทุกการกระทำ', value: '' },
                            { label: 'เข้าสู่ระบบสำเร็จ', value: 'login_success' },
                            { label: 'เข้าสู่ระบบไม่สำเร็จ', value: 'login_fail' },
                            { label: 'ออกจากระบบ', value: 'logout' }
                        ]}
                        placeholder="เลือกการกระทำ"
                    />

                    <DateField
                        label=""
                        value={startDate ? new Date(startDate) : null}
                        onChange={(value) => setStartDate(value ? value.toISOString().split('T')[0] : '')}
                        placeholder="วันที่เริ่มต้น"
                    />

                    <DateField
                        label=""
                        value={endDate ? new Date(endDate) : null}
                        onChange={(value) => setEndDate(value ? value.toISOString().split('T')[0] : '')}
                        placeholder="วันที่สิ้นสุด"
                    />
                </div>

                <div className="tw-flex tw-justify-between tw-items-center tw-mt-4">
                    <p className="tw-text-sm tw-text-gray-600">
                        พบ {totalCount} รายการ
                    </p>
                    <div className="tw-flex tw-gap-2">
                        <Button
                            onClick={fetchAuditLogs}
                            variant="secondary"
                            className="tw-px-4 tw-py-2 tw-font-medium tw-rounded-xl tw-transition-all tw-duration-200 tw-bg-gray-100 tw-text-gray-700 tw-border tw-border-transparent tw-flex tw-items-center tw-justify-center hover:tw-bg-gray-200 active:tw-bg-gray-300 focus:tw-ring-0 focus:tw-outline-none"
                        >
                            <RefreshCw className="tw-w-4 tw-h-4 tw-mr-2" />
                            รีเฟรช
                        </Button>
                        <Button
                            onClick={handleExport}
                            className="tw-px-4 tw-py-2 tw-font-medium tw-rounded-xl tw-transition-all tw-duration-200 tw-bg-blue-600 tw-text-white tw-border tw-border-transparent tw-flex tw-items-center tw-justify-center hover:tw-bg-blue-700 active:tw-bg-blue-800 focus:tw-ring-0 focus:tw-outline-none"
                        >
                            <Download className="tw-w-4 tw-h-4 tw-mr-2" />
                            ส่งออก CSV
                        </Button>
                    </div>
                </div>
            </div>
            {/* Audit Logs Table */}
            <div className="tw-bg-white tw-rounded-2xl tw-shadow-lg tw-border tw-border-gray-100 tw-overflow-hidden">
                <div className="tw-px-6 tw-py-4 tw-border-b tw-border-gray-100">
                    <h2 className="tw-text-xl tw-font-bold tw-text-gray-800 tw-flex tw-items-center">
                        <Shield className="tw-w-5 tw-h-5 tw-mr-2 tw-text-blue-600" />
                        Audit Logs
                    </h2>
                </div>

                <div className="tw-overflow-x-auto">
                    <table className="tw-w-full">
                        <thead className="tw-bg-gray-50">
                            <tr>
                                <th className="tw-px-6 tw-py-4 tw-text-left tw-text-sm tw-font-medium tw-text-gray-500 tw-uppercase">
                                    วันที่/เวลา
                                </th>
                                <th className="tw-px-6 tw-py-4 tw-text-left tw-text-sm tw-font-medium tw-text-gray-500 tw-uppercase">
                                    การกระทำ
                                </th>
                                <th className="tw-px-6 tw-py-4 tw-text-left tw-text-sm tw-font-medium tw-text-gray-500 tw-uppercase">
                                    ผู้ใช้
                                </th>
                                <th className="tw-px-6 tw-py-4 tw-text-left tw-text-sm tw-font-medium tw-text-gray-500 tw-uppercase">
                                    IP Address
                                </th>
                                <th className="tw-px-6 tw-py-4 tw-text-left tw-text-sm tw-font-medium tw-text-gray-500 tw-uppercase">
                                    User Agent
                                </th>
                            </tr>
                        </thead>
                        <tbody className="tw-divide-y tw-divide-gray-200">
                            {auditLogs.map((log) => {
                                const ActionIcon = ACTION_CONFIG[log.action]?.icon || Activity;
                                const actionConfig = ACTION_CONFIG[log.action];

                                return (
                                    <tr key={log.id} className="hover:tw-bg-gray-50">
                                        <td className="tw-px-6 tw-py-4 tw-whitespace-nowrap">
                                            <div className="tw-text-sm tw-text-gray-900">
                                                {new Date(log.createdAt).toLocaleDateString('th-TH', {
                                                    year: 'numeric',
                                                    month: 'short',
                                                    day: 'numeric'
                                                })}
                                            </div>
                                            <div className="tw-text-sm tw-text-gray-500">
                                                {new Date(log.createdAt).toLocaleTimeString('th-TH')}
                                            </div>
                                        </td>
                                        <td className="tw-px-6 tw-py-4 tw-whitespace-nowrap">
                                            <div className={`tw-inline-flex tw-items-center tw-px-3 tw-py-1 tw-rounded-full tw-text-sm tw-font-medium ${actionConfig?.bg || 'tw-bg-gray-50'}`}>
                                                <ActionIcon className={`tw-w-4 tw-h-4 tw-mr-2 ${actionConfig?.color || 'tw-text-gray-600'}`} />
                                                {actionConfig?.label || log.action}
                                            </div>
                                        </td>
                                        <td className="tw-px-6 tw-py-4">
                                            <div className="tw-text-sm tw-text-gray-900">
                                                {log.user ? (
                                                    <>
                                                        <div className="tw-font-medium">{log.user.name}</div>
                                                        <div className="tw-text-gray-500">@{log.user.username}</div>
                                                        <div className="tw-text-xs tw-text-gray-400">{log.user.role}</div>
                                                    </>
                                                ) : (
                                                    <>
                                                        <div className="tw-font-medium tw-text-gray-500">ไม่ระบุ</div>
                                                        <div className="tw-text-gray-400">พยายามเข้าสู่ระบบด้วย: {log.usernameInput}</div>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                        <td className="tw-px-6 tw-py-4 tw-whitespace-nowrap">
                                            <div className="tw-text-sm tw-font-mono tw-text-gray-900">
                                                {log.ip || 'ไม่ระบุ'}
                                            </div>
                                        </td>
                                        <td className="tw-px-6 tw-py-4">
                                            <div className="tw-text-sm tw-text-gray-500 tw-max-w-xs tw-truncate" title={log.userAgent || ''}>
                                                {log.userAgent || 'ไม่ระบุ'}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {auditLogs.length === 0 && !loading && (
                    <div className="tw-text-center tw-py-12">
                        <FileText className="tw-w-16 tw-h-16 tw-text-gray-300 tw-mx-auto tw-mb-4" />
                        <p className="tw-text-gray-500 tw-text-lg">ไม่พบข้อมูล audit logs</p>
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="tw-px-6 tw-py-4 tw-border-t tw-border-gray-100 tw-flex tw-items-center tw-justify-between">
                        <div className="tw-text-sm tw-text-gray-600">
                            หน้า {currentPage} จาก {totalPages} ({totalCount} รายการ)
                        </div>
                        <div className="tw-flex tw-gap-2">
                            <Button
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                                variant="secondary"
                                className="tw-px-3 tw-py-2 tw-font-medium tw-rounded-lg tw-transition-all tw-duration-200 tw-bg-gray-100 tw-text-gray-700 tw-border tw-border-transparent tw-flex tw-items-center tw-justify-center hover:tw-bg-gray-200 active:tw-bg-gray-300 focus:tw-ring-0 focus:tw-outline-none disabled:tw-opacity-50 disabled:tw-cursor-not-allowed"
                            >
                                ก่อนหน้า
                            </Button>
                            <Button
                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={currentPage === totalPages}
                                variant="secondary"
                                className="tw-px-3 tw-py-2 tw-font-medium tw-rounded-lg tw-transition-all tw-duration-200 tw-bg-gray-100 tw-text-gray-700 tw-border tw-border-transparent tw-flex tw-items-center tw-justify-center hover:tw-bg-gray-200 active:tw-bg-gray-300 focus:tw-ring-0 focus:tw-outline-none disabled:tw-opacity-50 disabled:tw-cursor-not-allowed"
                            >
                                ถัดไป
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Top Failed IPs */}
            {!statsLoading && auditStats && auditStats.topFailedIPs.length > 0 && (
                <div className="tw-mt-8 tw-bg-white tw-rounded-2xl tw-shadow-lg tw-border tw-border-gray-100 tw-overflow-hidden">
                    <div className="tw-px-6 tw-py-4 tw-border-b tw-border-gray-100">
                        <h3 className="tw-text-lg tw-font-bold tw-text-gray-800 tw-flex tw-items-center">
                            <AlertTriangle className="tw-w-5 tw-h-5 tw-mr-2 tw-text-red-600" />
                            IP ที่มีการเข้าสู่ระบบไม่สำเร็จมากที่สุด
                        </h3>
                    </div>
                    <div className="tw-p-6">
                        <div className="tw-grid tw-grid-cols-1 md:tw-grid-cols-2 lg:tw-grid-cols-3 tw-gap-4">
                            {auditStats.topFailedIPs.map((item, index) => (
                                <div key={index} className="tw-bg-red-50 tw-border tw-border-red-200 tw-rounded-lg tw-p-4">
                                    <div className="tw-flex tw-items-center tw-justify-between">
                                        <div className="tw-font-mono tw-text-sm tw-text-gray-800">
                                            {item.ip}
                                        </div>
                                        <div className="tw-bg-red-100 tw-text-red-800 tw-px-2 tw-py-1 tw-rounded-full tw-text-xs tw-font-bold">
                                            {item.failedAttempts} ครั้ง
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}