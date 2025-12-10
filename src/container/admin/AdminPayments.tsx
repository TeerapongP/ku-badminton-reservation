"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/ToastProvider";
import { Button } from "@/components/Button";
import Loading from "@/components/Loading";
import { RejectPaymentModal } from "@/components/RejectPaymentModal"
import {
    CreditCard,
    CheckCircle,
    XCircle,
    Clock,
    Eye,
    ArrowLeft,
    Calendar,
    RefreshCw,
    X,
} from "lucide-react";
import SearchInput from "@/components/SearchInput";
import { DropdownField } from "@/components/DropdownField";
import Image from "next/image";
import { PaymentData } from "@/lib/PaymentData";

export default function AdminPaymentsContainer() {
    const router = useRouter();
    const { data: session, status } = useSession();
    const toast = useToast();

    const [payments, setPayments] = useState<PaymentData[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedPayment, setSelectedPayment] = useState<PaymentData | null>(null);
    const [showSlipModal, setShowSlipModal] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [statusFilter, setStatusFilter] = useState("pending");
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false
    });
    const [summary, setSummary] = useState({
        pending: 0,
        approved: 0,
        rejected: 0,
        total: 0
    });

    useEffect(() => {
        if (status === "loading") return;

        // Ensure user has admin/super_admin role
        if (!session || ((session.user as any)?.role !== "admin" && (session.user as any)?.role !== "super_admin")) {
            toast.showError("ไม่มีสิทธิ์เข้าถึง", "คุณไม่มีสิทธิ์เข้าถึงหน้านี้");
            router.push("/");
            return;
        }

        fetchPayments();
    }, [session, status, router, toast]);

    // Fetch payments when filters change
    useEffect(() => {
        if (session) {
            fetchPayments();
        }
    }, [statusFilter, pagination.page, searchTerm, session]);

    const fetchPayments = async () => {
        try {
            setLoading(true);

            const params = new URLSearchParams({
                status: statusFilter,
                page: pagination.page.toString(),
                limit: pagination.limit.toString(),
                ...(searchTerm && { search: searchTerm })
            });

            const response = await fetch(`/api/admin/payments?${params}`);
            const data = await response.json();

            if (data.success) {
                setPayments(data.data.payments);
                setPagination(data.data.pagination);
                setSummary(data.data.summary);
            } else {
                toast?.showError("เกิดข้อผิดพลาด", data.message || "ไม่สามารถโหลดข้อมูลได้");
            }
        } catch (error) {
            console.error('Fetch payments error:', error);
            toast?.showError("เกิดข้อผิดพลาด", "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้");
        } finally {
            setLoading(false);
        }
    };

    const handleApprovePayment = async (paymentId: string, notes?: string) => {
        try {
            const response = await fetch('/api/admin/payments/approve', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    payment_id: paymentId,
                    notes
                })
            });

            const data = await response.json();

            if (data.success) {
                // Remove from current list or refresh data
                setPayments(prev => prev.filter(payment => payment.payment_id !== paymentId));

                // Update summary
                setSummary(prev => ({
                    ...prev,
                    pending: prev.pending - 1,
                    approved: prev.approved + 1
                }));

                toast?.showSuccess("อนุมัติการชำระเงินสำเร็จ", "การจองได้รับการยืนยันแล้ว");
            } else {
                toast?.showError("เกิดข้อผิดพลาด", data.message || "ไม่สามารถอนุมัติการชำระเงินได้");
            }
        } catch (error) {
            console.error('Approve payment error:', error);
            toast?.showError("เกิดข้อผิดพลาด", "ไม่สามารถอนุมัติการชำระเงินได้");
        }
    };

    const handleRejectPayment = async (paymentId: string, reason: string, notes?: string) => {
        try {
            const response = await fetch('/api/admin/payments/reject', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    payment_id: paymentId,
                    reason,
                    notes
                })
            });

            const data = await response.json();

            if (data.success) {
                // Remove from current list or refresh data
                setPayments(prev => prev.filter(payment => payment.payment_id !== paymentId));

                // Update summary
                setSummary(prev => ({
                    ...prev,
                    pending: prev.pending - 1,
                    rejected: prev.rejected + 1
                }));

                toast?.showSuccess("ปฏิเสธการชำระเงินสำเร็จ", `เหตุผล: ${reason}`);

                // Reset modal state
                setShowRejectModal(false);
                setSelectedPayment(null);
            } else {
                toast?.showError("เกิดข้อผิดพลาด", data.message || "ไม่สามารถปฏิเสธการชำระเงินได้");
            }
        } catch (error) {
            console.error('Reject payment error:', error);
            toast?.showError("เกิดข้อผิดพลาด", "ไม่สามารถปฏิเสธการชำระเงินได้");
        }
    };

    const openRejectModal = (payment: PaymentData) => {
        setSelectedPayment(payment);
        setShowRejectModal(true);
    };

    const closeRejectModal = () => {
        setShowRejectModal(false);
        setSelectedPayment(null);
    };

    const viewSlip = (payment: PaymentData) => {
        setSelectedPayment(payment);
        setShowSlipModal(true);
    };

    const handleSearch = (term: string) => {
        setSearchTerm(term);
        setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
    };

    const handlePageChange = (newPage: number) => {
        setPagination(prev => ({ ...prev, page: newPage }));
    };

    const statusOptions = [
        { label: 'รอตรวจสอบ', value: 'pending' },
        { label: 'อนุมัติแล้ว', value: 'succeeded' },
        { label: 'ปฏิเสธแล้ว', value: 'failed' }
    ];

    const formatAmount = (cents: number, currency: string) => {
        // Assuming cents are always divided by 100 for display
        return `${(cents / 100).toLocaleString()} ${currency}`;
    };

    if (status === "loading" || loading) {
        return (
            <Loading
                size="lg"
                text="กำลังโหลดข้อมูลการชำระเงิน..."
                color="blue"
                fullScreen={true}
            />
        );
    }

    if (!session || ((session.user as any)?.role !== "admin" && (session.user as any)?.role !== "super_admin")) {
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
                        <h1 className="tw-text-3xl md:tw-text-4xl tw-font-bold tw-bg-gradient-to-r tw-from-emerald-600 tw-via-teal-600 tw-to-cyan-600 tw-bg-clip-text tw-text-transparent">
                            ตรวจสอบการชำระเงิน
                        </h1>
                        <p className="tw-text-gray-600 tw-mt-1">
                            ตรวจสอบและอนุมัติสลิปการโอนเงิน
                        </p>
                    </div>
                </div>

                <div className="tw-h-1 tw-w-32 tw-bg-gradient-to-r tw-from-emerald-500 tw-via-teal-500 tw-to-cyan-500 tw-rounded-full" />
            </div>

            {/* Summary Cards */}
            <div className="tw-grid tw-grid-cols-1 md:tw-grid-cols-4 tw-gap-6 tw-mb-8">
                <div className="tw-bg-white tw-rounded-2xl tw-shadow-lg tw-p-6 tw-border tw-border-gray-100">
                    <div className="tw-flex tw-items-center tw-justify-between">
                        <div>
                            <p className="tw-text-sm tw-font-medium tw-text-gray-600">รอตรวจสอบ</p>
                            <p className="tw-text-3xl tw-font-bold tw-text-orange-600">{summary.pending}</p>
                        </div>
                        <div className="tw-w-12 tw-h-12 tw-bg-orange-100 tw-rounded-xl tw-flex tw-items-center tw-justify-center">
                            <Clock className="tw-w-6 tw-h-6 tw-text-orange-600" />
                        </div>
                    </div>
                </div>

                <div className="tw-bg-white tw-rounded-2xl tw-shadow-lg tw-p-6 tw-border tw-border-gray-100">
                    <div className="tw-flex tw-items-center tw-justify-between">
                        <div>
                            <p className="tw-text-sm tw-font-medium tw-text-gray-600">อนุมัติแล้ว</p>
                            <p className="tw-text-3xl tw-font-bold tw-text-green-600">{summary.approved}</p>
                        </div>
                        <div className="tw-w-12 tw-h-12 tw-bg-green-100 tw-rounded-xl tw-flex tw-items-center tw-justify-center">
                            <CheckCircle className="tw-w-6 tw-h-6 tw-text-green-600" />
                        </div>
                    </div>
                </div>

                <div className="tw-bg-white tw-rounded-2xl tw-shadow-lg tw-p-6 tw-border tw-border-gray-100">
                    <div className="tw-flex tw-items-center tw-justify-between">
                        <div>
                            <p className="tw-text-sm tw-font-medium tw-text-gray-600">ปฏิเสธแล้ว</p>
                            <p className="tw-text-3xl tw-font-bold tw-text-red-600">{summary.rejected}</p>
                        </div>
                        <div className="tw-w-12 tw-h-12 tw-bg-red-100 tw-rounded-xl tw-flex tw-items-center tw-justify-center">
                            <XCircle className="tw-w-6 tw-h-6 tw-text-red-600" />
                        </div>
                    </div>
                </div>

                <div className="tw-bg-white tw-rounded-2xl tw-shadow-lg tw-p-6 tw-border tw-border-gray-100">
                    <div className="tw-flex tw-items-center tw-justify-between">
                        <div>
                            <p className="tw-text-sm tw-font-medium tw-text-gray-600">ทั้งหมด</p>
                            <p className="tw-text-3xl tw-font-bold tw-text-blue-600">{summary.total}</p>
                        </div>
                        <div className="tw-w-12 tw-h-12 tw-bg-blue-100 tw-rounded-xl tw-flex tw-items-center tw-justify-center">
                            <CreditCard className="tw-w-6 tw-h-6 tw-text-blue-600" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters and Search */}
            <div className="tw-bg-white tw-rounded-2xl tw-shadow-sm tw-p-6 tw-border tw-border-gray-100 tw-mb-8">
                <div className="tw-grid tw-grid-cols-1 md:tw-grid-cols-3 tw-gap-4 tw-items-end">
                    <div>
                        <DropdownField
                            label="สถานะ"
                            value={statusFilter}
                            onChange={setStatusFilter}
                            options={statusOptions}
                            placeholder="เลือกสถานะ"
                        />
                    </div>

                    <div className="md:tw-col-span-2">
                        <label className="tw-block tw-text-sm tw-font-medium tw-text-gray-700 tw-mb-2">
                            ค้นหา
                        </label>
                        <SearchInput
                            value={searchTerm}
                            onChange={setSearchTerm}
                            placeholder="ค้นหาชื่อ, อีเมล, รหัสการจอง..."
                            onSubmit={() => handleSearch(searchTerm)}
                        />
                    </div>
                </div>

                <div className="tw-flex tw-justify-end tw-gap-3 tw-mt-4 tw-pt-4 tw-border-t tw-border-gray-100">
                    <Button
                        onClick={fetchPayments}
                        variant="secondary"
                        className="tw-px-4 tw-py-2 tw-font-medium tw-rounded-xl tw-transition-all tw-duration-200 tw-bg-gray-100 tw-text-gray-700 tw-border tw-border-transparent tw-flex tw-items-center tw-justify-center hover:tw-bg-gray-200 active:tw-bg-gray-300 focus:tw-ring-0 focus:tw-outline-none"
                    >
                        <RefreshCw className="tw-w-4 tw-h-4 tw-mr-2" />
                        รีเฟรช
                    </Button>
                </div>
            </div>

            {/* Payment Table */}
            <div className="tw-bg-white tw-rounded-2xl tw-shadow-lg tw-border tw-border-gray-100 tw-overflow-hidden">
                <div className="tw-px-6 tw-py-4 tw-border-b tw-border-gray-100">
                    <div className="tw-flex tw-items-center tw-justify-between">
                        <h2 className="tw-text-xl tw-font-bold tw-text-gray-800">
                            รายการการชำระเงิน ({pagination.total} รายการ)
                        </h2>
                        <div className="tw-text-sm tw-text-gray-600">
                            หน้า {pagination.page} จาก {pagination.totalPages}
                        </div>
                    </div>
                </div>

                {payments.length === 0 ? (
                    <div className="tw-text-center tw-py-12">
                        <CreditCard className="tw-w-16 tw-h-16 tw-text-gray-300 tw-mx-auto tw-mb-4" />
                        <p className="tw-text-gray-500 tw-text-lg">ไม่มีการชำระเงินรอตรวจสอบ</p>
                    </div>
                ) : (
                    <>
                        <div className="tw-overflow-x-auto">
                            <table className="tw-w-full">
                                <thead className="tw-bg-gray-50 tw-border-b tw-border-gray-200">
                                    <tr>
                                        <th className="tw-px-6 tw-py-4 tw-text-left tw-text-xs tw-font-semibold tw-text-gray-600 tw-uppercase tw-tracking-wider">
                                            สลิปการชำระเงิน
                                        </th>
                                        <th className="tw-px-6 tw-py-4 tw-text-left tw-text-xs tw-font-semibold tw-text-gray-600 tw-uppercase tw-tracking-wider">
                                            ผู้ชำระเงิน
                                        </th>
                                        <th className="tw-px-6 tw-py-4 tw-text-left tw-text-xs tw-font-semibold tw-text-gray-600 tw-uppercase tw-tracking-wider">
                                            รายละเอียดการจอง
                                        </th>
                                        <th className="tw-px-6 tw-py-4 tw-text-left tw-text-xs tw-font-semibold tw-text-gray-600 tw-uppercase tw-tracking-wider">
                                            จำนวนเงิน
                                        </th>
                                        <th className="tw-px-6 tw-py-4 tw-text-left tw-text-xs tw-font-semibold tw-text-gray-600 tw-uppercase tw-tracking-wider">
                                            สถานะ
                                        </th>
                                        <th className="tw-px-6 tw-py-4 tw-text-center tw-text-xs tw-font-semibold tw-text-gray-600 tw-uppercase tw-tracking-wider">
                                            การดำเนินการ
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="tw-bg-white tw-divide-y tw-divide-gray-200">
                                    {payments.map((payment) => (
                                        <tr key={payment.payment_id} className="hover:tw-bg-gray-50 tw-transition-colors">
                                            {/* Slip Image */}
                                            <td className="tw-px-6 tw-py-4">
                                                <div
                                                    onClick={() => viewSlip(payment)}
                                                    className="tw-relative tw-w-24 tw-h-32 tw-rounded-lg tw-overflow-hidden tw-shadow-md tw-cursor-pointer hover:tw-shadow-lg tw-transition-shadow"
                                                >
                                                    {payment?.slip_url ? (
                                                        <Image
                                                            src={payment.slip_url}
                                                            alt="สลิปการชำระเงิน"
                                                            fill
                                                            className="tw-object-cover"
                                                            sizes="96px"
                                                        />
                                                    ) : (
                                                        <div className="tw-w-full tw-h-full tw-bg-gray-100 tw-flex tw-items-center tw-justify-center">
                                                            <CreditCard className="tw-w-8 tw-h-8 tw-text-gray-400" />
                                                        </div>
                                                    )}
                                                </div>
                                            </td>

                                            {/* User Info */}
                                            <td className="tw-px-6 tw-py-4">
                                                <div>
                                                    <p className="tw-text-sm tw-font-semibold tw-text-gray-900">
                                                        {payment.user_name}
                                                    </p>
                                                    <p className="tw-text-sm tw-text-gray-600">
                                                        {payment.user_email}
                                                    </p>
                                                    <p className="tw-text-xs tw-text-gray-500 tw-mt-1">
                                                        รหัส: {payment.reservation_id}
                                                    </p>
                                                    <p className="tw-text-xs tw-text-gray-400 tw-flex tw-items-center tw-mt-1">
                                                        <Clock className="tw-w-3 tw-h-3 tw-mr-1" />
                                                        {new Date(payment.uploaded_at).toLocaleString('th-TH')}
                                                    </p>
                                                </div>
                                            </td>

                                            {/* Booking Details */}
                                            <td className="tw-px-6 tw-py-4">
                                                <div className="tw-space-y-2">
                                                    {payment.booking_details.facilities.map((facility, index) => (
                                                        <div key={index} className="tw-text-sm">
                                                            <p className="tw-font-medium tw-text-gray-900">
                                                                {facility.facility_name}
                                                            </p>
                                                            <p className="tw-text-gray-600">
                                                                {facility.court_name}
                                                            </p>
                                                            <p className="tw-text-gray-500 tw-text-xs">
                                                                <Calendar className="tw-w-3 tw-h-3 tw-inline tw-mr-1" />
                                                                {new Date(facility.play_date).toLocaleDateString('th-TH')}
                                                            </p>
                                                            <p className="tw-text-gray-500 tw-text-xs">
                                                                <Clock className="tw-w-3 tw-h-3 tw-inline tw-mr-1" />
                                                                {facility.start_time} - {facility.end_time}
                                                            </p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </td>

                                            {/* Amount */}
                                            <td className="tw-px-6 tw-py-4">
                                                <p className="tw-text-lg tw-font-bold tw-text-emerald-600">
                                                    {formatAmount(payment.amount_cents, payment.currency)}
                                                </p>
                                            </td>

                                            {/* Status */}
                                            <td className="tw-px-6 tw-py-4">
                                                <span className={`tw-inline-flex tw-items-center tw-px-3 tw-py-1 tw-rounded-full tw-text-xs tw-font-semibold ${payment.status === 'pending'
                                                    ? 'tw-bg-orange-100 tw-text-orange-800'
                                                    : payment.status === 'succeeded'
                                                        ? 'tw-bg-green-100 tw-text-green-800'
                                                        : 'tw-bg-red-100 tw-text-red-800'
                                                    }`}>
                                                    {payment.status === 'pending' ? 'รอตรวจสอบ' :
                                                        payment.status === 'succeeded' ? 'อนุมัติแล้ว' : 'ปฏิเสธแล้ว'}
                                                </span>
                                            </td>

                                            {/* Actions */}
                                            <td className="tw-px-6 tw-py-4">
                                                {/* ปรับ tw-justify-center เป็น tw-justify-between หรือใช้ tw-w-full */}
                                                <div className="tw-flex tw-items-center tw-justify-between tw-gap-2 tw-w-full">
                                                    <Button
                                                        onClick={() => handleApprovePayment(payment.payment_id)}
                                                        disabled={payment.status !== 'pending'}
                                                        // เพิ่ม tw-flex-grow เพื่อให้ปุ่มยืดเต็มที่
                                                        className="tw-px-3 tw-py-2 tw-text-sm tw-font-semibold tw-rounded-lg tw-transition-all tw-duration-200 tw-border-0 tw-outline-none focus:tw-outline-none disabled:tw-opacity-50 disabled:tw-cursor-not-allowed tw-flex-grow"
                                                        colorClass="tw-bg-emerald-500 hover:tw-bg-emerald-600 tw-text-white"
                                                    >
                                                        <CheckCircle className="tw-w-4 tw-h-4 tw-mx-auto" />
                                                    </Button>

                                                    <Button
                                                        onClick={() => openRejectModal(payment)}
                                                        disabled={payment.status !== 'pending'}
                                                        // เพิ่ม tw-flex-grow เพื่อให้ปุ่มยืดเต็มที่
                                                        className="tw-px-3 tw-py-2 tw-text-sm tw-font-medium tw-rounded-lg tw-transition-all tw-duration-200 tw-border-0 tw-outline-none focus:tw-outline-none disabled:tw-opacity-50 disabled:tw-cursor-not-allowed tw-flex-grow"
                                                        colorClass="tw-bg-rose-500 hover:tw-bg-rose-600 tw-text-white"
                                                    >
                                                        <XCircle className="tw-w-4 tw-h-4 tw-mx-auto" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {pagination.totalPages > 1 && (
                            <div className="tw-flex tw-items-center tw-justify-between tw-px-6 tw-py-4 tw-border-t tw-border-gray-100">
                                <div className="tw-text-sm tw-text-gray-600">
                                    แสดง {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} จาก {pagination.total} รายการ
                                </div>
                                <div className="tw-flex tw-space-x-2">
                                    <Button
                                        onClick={() => handlePageChange(pagination.page - 1)}
                                        disabled={!pagination.hasPrev}
                                        variant="secondary"
                                        className="tw-px-3 tw-py-2 tw-text-sm tw-font-medium tw-rounded-lg tw-transition-all tw-duration-200 tw-bg-gray-100 tw-text-gray-700 tw-border tw-border-transparent tw-flex tw-items-center tw-justify-center hover:tw-bg-gray-200 active:tw-bg-gray-300 focus:tw-ring-0 focus:tw-outline-none disabled:tw-opacity-50 disabled:tw-cursor-not-allowed"
                                    >
                                        ก่อนหน้า
                                    </Button>

                                    <span className="tw-px-4 tw-py-2 tw-text-sm tw-font-medium tw-text-gray-700">
                                        {pagination.page} / {pagination.totalPages}
                                    </span>

                                    <Button
                                        onClick={() => handlePageChange(pagination.page + 1)}
                                        disabled={!pagination.hasNext}
                                        variant="secondary"
                                        className="tw-px-3 tw-py-2 tw-text-sm tw-font-medium tw-rounded-lg tw-transition-all tw-duration-200 tw-bg-gray-100 tw-text-gray-700 tw-border tw-border-transparent tw-flex tw-items-center tw-justify-center hover:tw-bg-gray-200 active:tw-bg-gray-300 focus:tw-ring-0 focus:tw-outline-none disabled:tw-opacity-50 disabled:tw-cursor-not-allowed"
                                    >
                                        ถัดไป
                                    </Button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Slip Modal - Completed Section */}
            {showSlipModal && selectedPayment && (
                <div className="tw-fixed tw-inset-0 tw-bg-black tw-bg-opacity-50 tw-flex tw-items-center tw-justify-center tw-z-50 tw-p-4">
                    <div className="tw-bg-white tw-rounded-2xl tw-max-w-2xl tw-w-full tw-max-h-[90vh] tw-overflow-y-auto tw-shadow-2xl">
                        {/* Modal Header */}
                        <div className="tw-p-6 tw-border-b tw-border-gray-200">
                            <div className="tw-flex tw-items-center tw-justify-between">
                                <h3 className="tw-text-2xl tw-font-bold tw-text-gray-800">
                                    สลิปการชำระเงิน
                                </h3>
                                <Button
                                    onClick={() => setShowSlipModal(false)}

                                    className="
    tw-p-2 
    tw-rounded-full 
    tw-text-gray-500                   
    tw-transition 
    tw-duration-200 
    focus:tw-ring-2                     
    focus:tw-ring-indigo-500/50 
    tw-shadow-none                      
    tw-border-none                      
"
                                >
                                    <X className="tw-w-5 tw-h-5" />
                                </Button>
                            </div>
                            <p className="tw-text-sm tw-text-gray-500 tw-mt-1">
                                ยอดเงิน: <span className="tw-font-medium tw-text-emerald-600">{formatAmount(selectedPayment.amount_cents, selectedPayment.currency)}</span>
                            </p>
                        </div>

                        {/* Modal Body: Slip Image */}
                        <div className="tw-p-6 tw-flex tw-justify-center">
                            {selectedPayment.slip_url ? (
                                <div className="tw-relative tw-max-w-full tw-h-auto tw-rounded-lg tw-shadow-xl tw-overflow-hidden">
                                    {/* Next/Image usage for optimization, adjust dimensions as needed */}
                                    <Image
                                        src={selectedPayment.slip_url}
                                        alt="สลิปการชำระเงินขนาดเต็ม"
                                        width={800}
                                        height={1200}
                                        className="tw-object-contain tw-max-h-[70vh] tw-w-full tw-h-auto"
                                    />
                                </div>
                            ) : (
                                <div className="tw-text-center tw-py-12">
                                    <XCircle className="tw-w-16 tw-h-16 tw-text-red-500 tw-mx-auto tw-mb-4" />
                                    <p className="tw-text-gray-700 tw-text-lg tw-font-medium">ไม่พบภาพสลิปการชำระเงิน</p>
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            )}

            {/* Reject Payment Modal */}
            {showRejectModal && selectedPayment && (
                <RejectPaymentModal
                    visible={showRejectModal}
                    onHide={closeRejectModal}
                    selectedPayment={{
                        user_name: selectedPayment.user_name,
                        reservation_id: selectedPayment.reservation_id,
                        amount_cents: selectedPayment.amount_cents,
                        currency: selectedPayment.currency
                    }}
                    onConfirm={(reason) => handleRejectPayment(selectedPayment.payment_id, reason)}
                />
            )}
        </div>
    );
}