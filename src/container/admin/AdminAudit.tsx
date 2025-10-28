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
    Settings,
    Lock,
    Unlock,
    UserPlus,
    Trash2,
    RefreshCw,
    Edit
} from "lucide-react";
import SearchInput from "@/components/SearchInput";
import { DropdownField } from "@/components/DropdownField";
import { DateField } from "@/components/DateField";

interface AuditLog {
    log_id: string;
    user_id: string;
    user_name: string;
    user_role: string;
    action: string;
    resource_type: string;
    resource_id: string;
    details: string;
    ip_address: string;
    user_agent: string;
    timestamp: string;
    status: 'success' | 'failed' | 'warning';
    severity: 'low' | 'medium' | 'high' | 'critical';
}

const AUDIT_ACTIONS = {
    'login': { icon: Lock, color: 'text-blue-600', bg: 'bg-blue-50' },
    'logout': { icon: Unlock, color: 'text-gray-600', bg: 'bg-gray-50' },
    'create': { icon: UserPlus, color: 'text-green-600', bg: 'bg-green-50' },
    'update': { icon: Edit, color: 'text-yellow-600', bg: 'bg-yellow-50' },
    'delete': { icon: Trash2, color: 'text-red-600', bg: 'bg-red-50' },
    'approve': { icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    'reject': { icon: XCircle, color: 'text-rose-600', bg: 'bg-rose-50' },
    'view': { icon: Eye, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    'export': { icon: Download, color: 'text-purple-600', bg: 'bg-purple-50' },
    'system': { icon: Settings, color: 'text-gray-700', bg: 'bg-gray-100' },
} as const;

export default function AdminAuditContainer() {
    const router = useRouter();
    const { data: session, status } = useSession();
    const toast = useToast();

    // Dropdown options
    const actionOptions = [
        { label: 'ทั้งหมด', value: 'all' },
        { label: 'Login', value: 'login' },
        { label: 'Logout', value: 'logout' },
        { label: 'Create', value: 'create' },
        { label: 'Update', value: 'update' },
        { label: 'Delete', value: 'delete' },
        { label: 'Approve', value: 'approve' },
        { label: 'Reject', value: 'reject' },
        { label: 'View', value: 'view' },
        { label: 'Export', value: 'export' },
        { label: 'System', value: 'system' },
    ];

    const severityOptions = [
        { label: 'ทั้งหมด', value: 'all' },
        { label: 'ต่ำ', value: 'low' },
        { label: 'ปานกลาง', value: 'medium' },
        { label: 'สูง', value: 'high' },
        { label: 'วิกฤต', value: 'critical' },
    ];

    const statusOptions = [
        { label: 'ทั้งหมด', value: 'all' },
        { label: 'สำเร็จ', value: 'success' },
        { label: 'ล้มเหลว', value: 'failed' },
        { label: 'เตือน', value: 'warning' },
    ];
    const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [filterAction, setFilterAction] = useState<string>("all");
    const [filterSeverity, setFilterSeverity] = useState<string>("all");
    const [filterStatus, setFilterStatus] = useState<string>("all");
    const [dateRange, setDateRange] = useState({
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        end: new Date()
    });

    useEffect(() => {
        if (status === "loading") return;

        if (!session || ((session.user as any)?.role !== "admin" && (session.user as any)?.role !== "super_admin" && (session.user as any)?.role !== "super-admin")) {
            toast.showError("ไม่มีสิทธิ์เข้าถึง", "คุณไม่มีสิทธิ์เข้าถึงหน้านี้");
            router.push("/");
            return;
        }

        fetchAuditLogs();
    }, [session, status, router, toast, dateRange]);

    const fetchAuditLogs = async () => {
        try {
            setLoading(true);
            // Mock data - ในระบบจริงจะเรียก API
            await new Promise(resolve => setTimeout(resolve, 1000));


            setAuditLogs([]);
        } catch (error) {
            toast.showError("ไม่สามารถโหลดข้อมูลได้", "กรุณาลองใหม่อีกครั้ง");
        } finally {
            setLoading(false);
        }
    }; const
        viewLogDetail = (log: AuditLog) => {
            setSelectedLog(log);
            setShowDetailModal(true);
        };

    const exportLogs = async () => {
        try {
            toast.showInfo("กำลังส่งออกข้อมูล", "กรุณารอสักครู่...");

            // Mock export - ในระบบจริงจะเรียก API
            await new Promise(resolve => setTimeout(resolve, 2000));

            toast.showSuccess("ส่งออกข้อมูลสำเร็จ", "ไฟล์ได้ถูกดาวน์โหลดแล้ว");
        } catch (error) {
            toast.showError("เกิดข้อผิดพลาด", "ไม่สามารถส่งออกข้อมูลได้");
        }
    };

    const refreshLogs = () => {
        fetchAuditLogs();
        toast.showInfo("รีเฟรชข้อมูล", "กำลังโหลดข้อมูลใหม่...");
    };

    const filteredLogs = auditLogs.filter(log => {
        const matchesSearch =
            log.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.resource_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.ip_address.includes(searchTerm);

        const matchesAction = filterAction === "all" || log.action === filterAction;
        const matchesSeverity = filterSeverity === "all" || log.severity === filterSeverity;
        const matchesStatus = filterStatus === "all" || log.status === filterStatus;

        // Date range filtering
        const logDate = new Date(log.timestamp);
        const startDate = new Date(dateRange.start);
        const endDate = new Date(dateRange.end);

        // Set time to start/end of day for proper comparison
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);

        const matchesDateRange = logDate >= startDate && logDate <= endDate;

        return matchesSearch && matchesAction && matchesSeverity && matchesStatus && matchesDateRange;
    });

    const getActionIcon = (action: string) => {
        const actionConfig = AUDIT_ACTIONS[action as keyof typeof AUDIT_ACTIONS] || AUDIT_ACTIONS.system;
        const IconComponent = actionConfig.icon;
        return <IconComponent className={`tw-w-4 tw-h-4 ${actionConfig.color}`} />;
    };

    const getActionBadge = (action: string) => {
        const actionConfig = AUDIT_ACTIONS[action as keyof typeof AUDIT_ACTIONS] || AUDIT_ACTIONS.system;
        return (
            <span className={`tw-inline-flex tw-items-center tw-px-2 tw-py-1 tw-rounded-full tw-text-xs tw-font-medium ${actionConfig.bg} ${actionConfig.color}`}>
                {getActionIcon(action)}
                <span className="tw-ml-1 tw-capitalize">{action}</span>
            </span>
        );
    };

    const getSeverityBadge = (severity: string) => {
        const colors = {
            low: 'tw-bg-gray-100 tw-text-gray-800',
            medium: 'tw-bg-yellow-100 tw-text-yellow-800',
            high: 'tw-bg-orange-100 tw-text-orange-800',
            critical: 'tw-bg-red-100 tw-text-red-800'
        };

        return (
            <span className={`tw-inline-flex tw-items-center tw-px-2 tw-py-1 tw-rounded-full tw-text-xs tw-font-medium ${colors[severity as keyof typeof colors]}`}>
                {severity}
            </span>
        );
    };

    const getStatusBadge = (status: string) => {
        const colors = {
            success: 'tw-bg-green-100 tw-text-green-800',
            failed: 'tw-bg-red-100 tw-text-red-800',
            warning: 'tw-bg-yellow-100 tw-text-yellow-800'
        };

        const icons = {
            success: CheckCircle,
            failed: XCircle,
            warning: AlertTriangle
        };

        const IconComponent = icons[status as keyof typeof icons] || CheckCircle;

        return (
            <span className={`tw-inline-flex tw-items-center tw-px-2 tw-py-1 tw-rounded-full tw-text-xs tw-font-medium ${colors[status as keyof typeof colors]}`}>
                <IconComponent className="tw-w-3 tw-h-3 tw-mr-1" />
                {status}
            </span>
        );
    };

    if (status === "loading" || loading) {
        return (
            <Loading
                size="lg"
                text="กำลังโหลดข้อมูล Audit Logs..."
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

                    <div className="tw-mt-8">
                        <h1 className="tw-text-3xl md:tw-text-4xl tw-font-bold tw-bg-gradient-to-r tw-from-purple-600 tw-via-blue-600 tw-to-indigo-600 tw-bg-clip-text tw-text-transparent tw-flex tw-items-center">
                            <Shield className="tw-w-8 tw-h-8 tw-mr-3 tw-text-purple-600" />
                            Audit Logs
                        </h1>
                        <p className="tw-text-gray-600 tw-mt-1">
                            ตรวจสอบกิจกรรมและการเปลี่ยนแปลงในระบบ
                        </p>
                    </div>
                </div>

                <div className="tw-h-1 tw-w-32 tw-bg-gradient-to-r tw-from-purple-500 tw-via-blue-500 tw-to-indigo-500 tw-rounded-full" />
            </div>

            {/* Filters and Search */}
            <div className="tw-bg-white tw-rounded-2xl tw-shadow-sm tw-p-6 tw-border tw-border-gray-100 tw-mb-6">
                <div className="tw-grid tw-grid-cols-1 lg:tw-grid-cols-2 tw-gap-6">
                    {/* Search */}
                    <div>
                        <SearchInput
                            value={searchTerm}
                            onChange={setSearchTerm}
                            placeholder="ค้นหา logs..."
                            onSubmit={() => console.log("search:", searchTerm)}
                        />
                    </div>

                    {/* Actions */}
                    <div className="tw-flex tw-items-end tw-justify-end tw-gap-3 tw-mt-4">
                        <Button
                            onClick={refreshLogs}
                            className="tw-h-11 tw-px-5 tw-font-semibold tw-rounded-xl tw-transition-all tw-duration-300 tw-shadow-md hover:tw-shadow-lg hover:tw-scale-105 active:tw-scale-95 tw-relative tw-overflow-hidden tw-border-0 tw-outline-none focus:tw-outline-none disabled:tw-opacity-50 disabled:tw-cursor-not-allowed"
                            colorClass="tw-bg-gradient-to-r tw-from-emerald-500 tw-to-emerald-600 hover:tw-from-emerald-600 hover:tw-to-emerald-700 tw-text-white focus:tw-ring-4 focus:tw-ring-emerald-300"
                        >
                            <span className="tw-relative tw-flex tw-items-center tw-justify-center tw-gap-2">
                                <RefreshCw className="tw-w-4 tw-h-4 tw-transition-transform group-hover:tw-rotate-180 tw-duration-300" />
                                รีเฟรช
                            </span>
                        </Button>

                        <Button
                            onClick={exportLogs}
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
                <div className="tw-grid tw-grid-cols-1 md:tw-grid-cols-4 tw-gap-4 tw-mt-6">
                    {/* Action Filter */}
                    <DropdownField
                        label="การกระทำ"
                        value={filterAction}
                        onChange={(value) => setFilterAction(value)}
                        options={actionOptions}
                        placeholder="เลือกการกระทำ"
                        className="tw-w-full"
                    />

                    {/* Severity Filter */}
                    <DropdownField
                        label="ระดับความสำคัญ"
                        value={filterSeverity}
                        onChange={(value) => setFilterSeverity(value)}
                        options={severityOptions}
                        placeholder="เลือกระดับความสำคัญ"
                        className="tw-w-full"
                    />

                    {/* Status Filter */}
                    <DropdownField
                        label="สถานะ"
                        value={filterStatus}
                        onChange={(value) => setFilterStatus(value)}
                        options={statusOptions}
                        placeholder="เลือกสถานะ"
                        className="tw-w-full"
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
            {/* Audit Logs Table */}
            <div className="tw-bg-white tw-rounded-2xl tw-shadow-lg tw-border tw-border-gray-100 tw-overflow-hidden">
                <div className="tw-px-6 tw-py-4 tw-border-b tw-border-gray-100 tw-flex tw-items-center tw-justify-between">
                    <h2 className="tw-text-xl tw-font-bold tw-text-gray-800 tw-flex tw-items-center">
                        <Activity className="tw-w-5 tw-h-5 tw-mr-2 tw-text-blue-600" />
                        Audit Logs ({filteredLogs.length} รายการ)
                    </h2>

                    <div className="tw-flex tw-items-center tw-space-x-2 tw-text-sm tw-text-gray-500">
                        <Clock className="tw-w-4 tw-h-4" />
                        <span>อัปเดตล่าสุด: {new Date().toLocaleString('th-TH')}</span>
                    </div>
                </div>

                {filteredLogs.length === 0 ? (
                    <div className="tw-text-center tw-py-12">
                        <FileText className="tw-w-16 tw-h-16 tw-text-gray-300 tw-mx-auto tw-mb-4" />
                        <p className="tw-text-gray-500 tw-text-lg">ไม่พบ Audit Logs</p>
                        <p className="tw-text-gray-400 tw-text-sm tw-mt-2">ลองปรับเปลี่ยนตัวกรองหรือช่วงวันที่</p>
                    </div>
                ) : (
                    <div className="tw-overflow-x-auto">
                        <table className="tw-w-full">
                            <thead className="tw-bg-gray-50">
                                <tr>
                                    <th className="tw-px-6 tw-py-3 tw-text-left tw-text-xs tw-font-medium tw-text-gray-500 tw-uppercase tw-tracking-wider">
                                        เวลา
                                    </th>
                                    <th className="tw-px-6 tw-py-3 tw-text-left tw-text-xs tw-font-medium tw-text-gray-500 tw-uppercase tw-tracking-wider">
                                        ผู้ใช้
                                    </th>
                                    <th className="tw-px-6 tw-py-3 tw-text-left tw-text-xs tw-font-medium tw-text-gray-500 tw-uppercase tw-tracking-wider">
                                        การกระทำ
                                    </th>
                                    <th className="tw-px-6 tw-py-3 tw-text-left tw-text-xs tw-font-medium tw-text-gray-500 tw-uppercase tw-tracking-wider">
                                        ทรัพยากร
                                    </th>
                                    <th className="tw-px-6 tw-py-3 tw-text-left tw-text-xs tw-font-medium tw-text-gray-500 tw-uppercase tw-tracking-wider">
                                        รายละเอียด
                                    </th>
                                    <th className="tw-px-6 tw-py-3 tw-text-left tw-text-xs tw-font-medium tw-text-gray-500 tw-uppercase tw-tracking-wider">
                                        สถานะ
                                    </th>
                                    <th className="tw-px-6 tw-py-3 tw-text-left tw-text-xs tw-font-medium tw-text-gray-500 tw-uppercase tw-tracking-wider">
                                        ความสำคัญ
                                    </th>
                                    <th className="tw-px-6 tw-py-3 tw-text-left tw-text-xs tw-font-medium tw-text-gray-500 tw-uppercase tw-tracking-wider">
                                        การดำเนินการ
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="tw-bg-white tw-divide-y tw-divide-gray-200">
                                {filteredLogs.map((log) => (
                                    <tr key={log.log_id} className="hover:tw-bg-gray-50 tw-transition-colors">
                                        <td className="tw-px-6 tw-py-4 tw-whitespace-nowrap tw-text-sm tw-text-gray-900">
                                            <div className="tw-flex tw-items-center">
                                                <Clock className="tw-w-4 tw-h-4 tw-text-gray-400 tw-mr-2" />
                                                <div>
                                                    <div className="tw-font-medium">
                                                        {new Date(log.timestamp).toLocaleDateString('th-TH')}
                                                    </div>
                                                    <div className="tw-text-xs tw-text-gray-500">
                                                        {new Date(log.timestamp).toLocaleTimeString('th-TH')}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="tw-px-6 tw-py-4 tw-whitespace-nowrap tw-text-sm tw-text-gray-900">
                                            <div className="tw-flex tw-items-center">
                                                <User className="tw-w-4 tw-h-4 tw-text-gray-400 tw-mr-2" />
                                                <div>
                                                    <div className="tw-font-medium">{log.user_name}</div>
                                                    <div className="tw-text-xs tw-text-gray-500 tw-capitalize">{log.user_role}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="tw-px-6 tw-py-4 tw-whitespace-nowrap">
                                            {getActionBadge(log.action)}
                                        </td>
                                        <td className="tw-px-6 tw-py-4 tw-whitespace-nowrap tw-text-sm tw-text-gray-900">
                                            <div>
                                                <div className="tw-font-medium tw-capitalize">{log.resource_type}</div>
                                                <div className="tw-text-xs tw-text-gray-500">{log.resource_id}</div>
                                            </div>
                                        </td>
                                        <td className="tw-px-6 tw-py-4 tw-text-sm tw-text-gray-900">
                                            <div className="tw-max-w-xs tw-truncate" title={log.details}>
                                                {log.details}
                                            </div>
                                        </td>
                                        <td className="tw-px-6 tw-py-4 tw-whitespace-nowrap">
                                            {getStatusBadge(log.status)}
                                        </td>
                                        <td className="tw-px-6 tw-py-4 tw-whitespace-nowrap">
                                            {getSeverityBadge(log.severity)}
                                        </td>
                                        <td className="tw-px-6 tw-py-4 tw-whitespace-nowrap tw-text-sm tw-font-medium">
                                            <Button
                                                onClick={() => viewLogDetail(log)}
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
            {showDetailModal && selectedLog && (
                <div className="tw-fixed tw-inset-0 tw-bg-black tw-bg-opacity-50 tw-flex tw-items-center tw-justify-center tw-z-50 tw-p-4">
                    <div className="tw-bg-white tw-rounded-2xl tw-max-w-2xl tw-w-full tw-max-h-[90vh] tw-overflow-y-auto">
                        <div className="tw-p-6 tw-border-b tw-border-gray-200">
                            <div className="tw-flex tw-items-center tw-justify-between">
                                <h3 className="tw-text-xl tw-font-bold tw-text-gray-800 tw-flex tw-items-center">
                                    <FileText className="tw-w-6 tw-h-6 tw-text-blue-600 tw-mr-2" />
                                    รายละเอียด Audit Log
                                </h3>
                                <Button
                                    onClick={() => setShowDetailModal(false)}
                                    variant="secondary"
                                    className="tw-px-3 tw-py-2"
                                >
                                    ✕
                                </Button>
                            </div>
                        </div>

                        <div className="tw-p-6">
                            <div className="tw-grid tw-grid-cols-1 md:tw-grid-cols-2 tw-gap-6">
                                {/* Basic Info */}
                                <div className="tw-space-y-4">
                                    <div>
                                        <label className="tw-block tw-text-sm tw-font-medium tw-text-gray-700 tw-mb-1">
                                            Log ID
                                        </label>
                                        <p className="tw-text-sm tw-text-gray-900 tw-font-mono tw-bg-gray-50 tw-px-3 tw-py-2 tw-rounded">
                                            {selectedLog.log_id}
                                        </p>
                                    </div>

                                    <div>
                                        <label className="tw-block tw-text-sm tw-font-medium tw-text-gray-700 tw-mb-1">
                                            ผู้ใช้
                                        </label>
                                        <div className="tw-flex tw-items-center tw-space-x-2">
                                            <User className="tw-w-4 tw-h-4 tw-text-gray-400" />
                                            <span className="tw-text-sm tw-text-gray-900">{selectedLog.user_name}</span>
                                            <span className="tw-text-xs tw-text-gray-500 tw-capitalize">({selectedLog.user_role})</span>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="tw-block tw-text-sm tw-font-medium tw-text-gray-700 tw-mb-1">
                                            การกระทำ
                                        </label>
                                        <div className="tw-flex tw-items-center tw-space-x-2">
                                            {getActionBadge(selectedLog.action)}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="tw-block tw-text-sm tw-font-medium tw-text-gray-700 tw-mb-1">
                                            ทรัพยากร
                                        </label>
                                        <div className="tw-text-sm tw-text-gray-900">
                                            <div className="tw-font-medium tw-capitalize">{selectedLog.resource_type}</div>
                                            <div className="tw-text-xs tw-text-gray-500 tw-font-mono">{selectedLog.resource_id}</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Status & Time */}
                                <div className="tw-space-y-4">
                                    <div>
                                        <label className="tw-block tw-text-sm tw-font-medium tw-text-gray-700 tw-mb-1">
                                            เวลา
                                        </label>
                                        <div className="tw-flex tw-items-center tw-space-x-2">
                                            <Clock className="tw-w-4 tw-h-4 tw-text-gray-400" />
                                            <div className="tw-text-sm tw-text-gray-900">
                                                <div>{new Date(selectedLog.timestamp).toLocaleDateString('th-TH')}</div>
                                                <div className="tw-text-xs tw-text-gray-500">
                                                    {new Date(selectedLog.timestamp).toLocaleTimeString('th-TH')}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="tw-block tw-text-sm tw-font-medium tw-text-gray-700 tw-mb-1">
                                            สถานะ
                                        </label>
                                        {getStatusBadge(selectedLog.status)}
                                    </div>

                                    <div>
                                        <label className="tw-block tw-text-sm tw-font-medium tw-text-gray-700 tw-mb-1">
                                            ระดับความสำคัญ
                                        </label>
                                        {getSeverityBadge(selectedLog.severity)}
                                    </div>

                                    <div>
                                        <label className="tw-block tw-text-sm tw-font-medium tw-text-gray-700 tw-mb-1">
                                            IP Address
                                        </label>
                                        <p className="tw-text-sm tw-text-gray-900 tw-font-mono tw-bg-gray-50 tw-px-3 tw-py-2 tw-rounded">
                                            {selectedLog.ip_address}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Details */}
                            <div className="tw-mt-6">
                                <label className="tw-block tw-text-sm tw-font-medium tw-text-gray-700 tw-mb-2">
                                    รายละเอียด
                                </label>
                                <div className="tw-bg-gray-50 tw-rounded-lg tw-p-4">
                                    <p className="tw-text-sm tw-text-gray-900">{selectedLog.details}</p>
                                </div>
                            </div>

                            {/* User Agent */}
                            <div className="tw-mt-4">
                                <label className="tw-block tw-text-sm tw-font-medium tw-text-gray-700 tw-mb-2">
                                    User Agent
                                </label>
                                <div className="tw-bg-gray-50 tw-rounded-lg tw-p-4">
                                    <p className="tw-text-xs tw-text-gray-600 tw-font-mono tw-break-all">{selectedLog.user_agent}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}