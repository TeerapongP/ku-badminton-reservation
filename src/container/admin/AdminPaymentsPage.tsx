"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/ToastProvider";
import { Button } from "@/components/Button";
import Loading from "@/components/Loading";
import {
    CreditCard,
    Search,
    Filter,
    CheckCircle,
    XCircle,
    Clock,
    Eye,
    ArrowLeft,
    Download,
    Calendar
} from "lucide-react";

interface PendingPayment {
    payment_id: string;
    reservation_id: string;
    user_name: string;
    user_email: string;
    amount_cents: number;
    currency: string;
    uploaded_at: string;
    slip_url: string;
    booking_details: {
        facility_name: string;
        court_name: string;
        play_date: string;
        time_slot: string;
    };
}

export default function AdminPaymentsPage() {
    const router = useRouter();
    const { data: session, status } = useSession();
    const toast = useToast();

    const [payments, setPayments] = useState<PendingPayment[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedPayment, setSelectedPayment] = useState<PendingPayment | null>(null);
    const [showSlipModal, setShowSlipModal] = useState(false);

    useEffect(() => {
        if (status === "loading") return;

        if (!session || (session.user as any)?.role !== "admin") {
            toast.showError("ไม่มีสิทธิ์เข้าถึง", "คุณไม่มีสิทธิ์เข้าถึงหน้านี้");
            router.push("/");
            return;
        }

        fetchPendingPayments();
    }, [session, status, router, toast]);

    const fetchPendingPayments = async () => {
        try {
            // Mock data for now - will be replaced with actual API calls
            await new Promise(resolve => setTimeout(resolve, 1000));

            const mockPayments: PendingPayment[] = [
                {
                    payment_id: "1",
                    reservation_id: "R001",
                    user_name: "สมชาย ใจดี",
                    user_email: "somchai@ku.th",
                    amount_cents: 10000,
                    currency: "THB",
                    uploaded_at: "2024-01-16T14:30:00Z",
                    slip_url: "/images/slip1.jpg",
                    booking_details: {
                        facility_name: "อาคารพลศึกษา 1",
                        court_name: "คอร์ท 3",
                        play_date: "2024-01-17",
                        time_slot: "13:00-14:00"
                    }
                },
                {
                    payment_id: "2",
                    reservation_id: "R002",
                    user_name: "วิชัย เรียนดี",
                    user_email: "wichai@ku.th",
                    amount_cents: 15000,
                    currency: "THB",
                    uploaded_at: "2024-01-16T15:45:00Z",
                    slip_url: "/images/slip2.jpg",
                    booking_details: {
                        facility_name: "อาคารพลศึกษา 3",
                        court_name: "คอร์ท 5",
                        play_date: "2024-01-18",
                        time_slot: "16:00-18:00"
                    }
                }
            ];

            setPayments(mockPayments);
        } catch (error) {
            toast.showError("ไม่สามารถโหลดข้อมูลได้", "กรุณาลองใหม่อีกครั้ง");
        } finally {
            setLoading(false);
        }
    };

    const handleApprovePayment = async (paymentId: string) => {
        try {
            // Mock API call
            await new Promise(resolve => setTimeout(resolve, 500));

            setPayments(prev => prev.filter(payment => payment.payment_id !== paymentId));

            toast.showSuccess("อนุมัติการชำระเงินสำเร็จ", "การจองได้รับการยืนยันแล้ว");
        } catch (error) {
            toast.showError("เกิดข้อผิดพลาด", "ไม่สามารถอนุมัติการชำระเงินได้");
        }
    };

    const handleRejectPayment = async (paymentId: string, reason: string) => {
        try {
            // Mock API call
            await new Promise(resolve => setTimeout(resolve, 500));

            setPayments(prev => prev.filter(payment => payment.payment_id !== paymentId));

            toast.showSuccess("ปฏิเสธการชำระเงินสำเร็จ", "ได้ส่งแจ้งเตือนไปยังผู้ใช้แล้ว");
        } catch (error) {
            toast.showError("เกิดข้อผิดพลาด", "ไม่สามารถปฏิเสธการชำระเงินได้");
        }
    };

    const viewSlip = (payment: PendingPayment) => {
        setSelectedPayment(payment);
        setShowSlipModal(true);
    };

    const filteredPayments = payments.filter(payment =>
        payment.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.user_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.reservation_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.booking_details.facility_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const formatAmount = (cents: number, currency: string) => {
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

    if (!session || (session.user as any)?.role !== "admin") {
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
                        className="tw-px-4 tw-py-2 tw-font-medium tw-rounded-xl tw-transition-all tw-duration-200 tw-bg-gray-100 tw-text-gray-700 tw-border tw-border-transparent tw-flex tw-items-center tw-justify-center hover:tw-bg-gray-200 hover:tw-text-gray-900 active:tw-bg-gray-300 focus:tw-ring-0 focus:tw-outline-none"
                    >
                        <ArrowLeft className="tw-w-4 tw-h-4 tw-mr-2 tw-text-gray-600" />
                        กลับ
                    </Button>

                    <div>
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

            {/* Search */}
            <div className="tw-bg-white tw-rounded-2xl tw-shadow-lg tw-p-6 tw-mb-8 tw-border tw-border-gray-100">
                <div className="tw-relative">
                    <Search className="tw-absolute tw-left-3 tw-top-1/2 tw-transform tw--translate-y-1/2 tw-text-gray-400 tw-w-5 tw-h-5" />
                    <input
                        type="text"
                        placeholder="ค้นหาการชำระเงิน..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="tw-w-full tw-pl-10 tw-pr-4 tw-py-3 tw-border tw-border-gray-300 tw-rounded-xl focus:tw-ring-2 focus:tw-ring-emerald-500 focus:tw-border-transparent tw-transition-all"
                    />
                </div>
            </div>

            {/* Payments List */}
            <div className="tw-bg-white tw-rounded-2xl tw-shadow-lg tw-border tw-border-gray-100 tw-overflow-hidden">
                <div className="tw-px-6 tw-py-4 tw-border-b tw-border-gray-100">
                    <h2 className="tw-text-xl tw-font-bold tw-text-gray-800">
                        รายการรอตรวจสอบ ({filteredPayments.length} รายการ)
                    </h2>
                </div>

                {filteredPayments.length === 0 ? (
                    <div className="tw-text-center tw-py-12">
                        <CreditCard className="tw-w-16 tw-h-16 tw-text-gray-300 tw-mx-auto tw-mb-4" />
                        <p className="tw-text-gray-500 tw-text-lg">ไม่มีการชำระเงินรอตรวจสอบ</p>
                    </div>
                ) : (
                    <div className="tw-space-y-4 tw-p-6">
                        {filteredPayments.map((payment) => (
                            <div key={payment.payment_id} className="tw-bg-gray-50 tw-rounded-xl tw-p-6 tw-border tw-border-gray-200">
                                <div className="tw-grid tw-grid-cols-1 lg:tw-grid-cols-3 tw-gap-6">
                                    {/* Payment Info */}
                                    <div className="lg:tw-col-span-2">
                                        <div className="tw-flex tw-items-start tw-justify-between tw-mb-4">
                                            <div>
                                                <h3 className="tw-text-lg tw-font-bold tw-text-gray-800">
                                                    {payment.user_name}
                                                </h3>
                                                <p className="tw-text-sm tw-text-gray-600">{payment.user_email}</p>
                                                <p className="tw-text-xs tw-text-gray-500">
                                                    รหัสการจอง: {payment.reservation_id}
                                                </p>
                                            </div>
                                            <div className="tw-text-right">
                                                <p className="tw-text-2xl tw-font-bold tw-text-emerald-600">
                                                    {formatAmount(payment.amount_cents, payment.currency)}
                                                </p>
                                                <p className="tw-text-xs tw-text-gray-500 tw-flex tw-items-center tw-justify-end">
                                                    <Clock className="tw-w-3 tw-h-3 tw-mr-1" />
                                                    {new Date(payment.uploaded_at).toLocaleString('th-TH')}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="tw-bg-white tw-rounded-lg tw-p-4 tw-border tw-border-gray-200">
                                            <h4 className="tw-font-medium tw-text-gray-800 tw-mb-2 tw-flex tw-items-center">
                                                <Calendar className="tw-w-4 tw-h-4 tw-mr-2" />
                                                รายละเอียดการจอง
                                            </h4>
                                            <div className="tw-grid tw-grid-cols-2 tw-gap-4 tw-text-sm">
                                                <div>
                                                    <span className="tw-text-gray-500">สนาม:</span>
                                                    <span className="tw-ml-2 tw-font-medium">{payment.booking_details.facility_name}</span>
                                                </div>
                                                <div>
                                                    <span className="tw-text-gray-500">คอร์ท:</span>
                                                    <span className="tw-ml-2 tw-font-medium">{payment.booking_details.court_name}</span>
                                                </div>
                                                <div>
                                                    <span className="tw-text-gray-500">วันที่:</span>
                                                    <span className="tw-ml-2 tw-font-medium">
                                                        {new Date(payment.booking_details.play_date).toLocaleDateString('th-TH')}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="tw-text-gray-500">เวลา:</span>
                                                    <span className="tw-ml-2 tw-font-medium">{payment.booking_details.time_slot}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="tw-flex tw-flex-col tw-space-y-3">
                                        <Button
                                            onClick={() => viewSlip(payment)}
                                            variant="secondary"
                                            className="tw-w-full tw-h-12 tw-text-lg tw-font-medium tw-rounded-xl tw-transition-all tw-duration-200 tw-bg-gray-200 tw-text-gray-700 tw-border-0 tw-outline-none tw-flex tw-items-center tw-justify-center hover:tw-bg-gray-100 active:tw-bg-gray-200 disabled:tw-opacity-50 disabled:tw-cursor-not-allowed disabled:hover:tw-bg-white focus:tw-ring-0 focus:tw-outline-none"
                                        >
                                            <Eye className="tw-w-5 tw-h-5 tw-mr-2 tw-text-gray-600" />
                                            ดูสลิป
                                        </Button>

                                        <Button
                                            onClick={() => router.push("/admin/audit")}
                                            className="tw-w-full tw-h-12 tw-text-lg tw-font-semibold tw-shadow-lg tw-rounded-xl tw-transition-all tw-duration-300 hover:tw-shadow-xl hover:tw-scale-105 active:tw-scale-95 tw-relative tw-overflow-hidden tw-border-0 tw-outline-none focus:tw-outline-none disabled:tw-opacity-50 disabled:tw-cursor-not-allowed disabled:hover:tw-scale-100"
                                            colorClass="tw-bg-gradient-to-r tw-from-emerald-500 tw-to-emerald-600 hover:tw-from-emerald-600 hover:tw-to-emerald-700 tw-text-white focus:tw-ring-4 focus:tw-ring-emerald-300"
                                        >
                                            <span className="tw-relative tw-flex tw-items-center tw-justify-center tw-gap-2">
                                                อนุมัติ
                                            </span>
                                        </Button>

                                        <Button onClick={() => handleRejectPayment(payment.payment_id, "สลิปไม่ชัดเจน")} className="tw-w-auto tw-px-4 tw-h-10 tw-flex tw-items-center tw-justify-center tw-gap-2 tw-text-base tw-font-medium tw-shadow-md tw-rounded-lg tw-transition-all tw-duration-300 hover:tw-shadow-lg hover:tw-scale-105 active:tw-scale-95 tw-border-0 tw-outline-none focus:tw-outline-none disabled:tw-opacity-50 disabled:tw-cursor-not-allowed disabled:hover:tw-scale-100" colorClass="tw-bg-gradient-to-r tw-from-rose-500 tw-to-pink-600 hover:tw-from-pink-600 hover:tw-to-rose-700 tw-text-white focus:tw-ring-2 focus:tw-ring-rose-300 tw-shadow-lg hover:tw-shadow-xl" >
                                            <XCircle className="tw-w-4 tw-h-4 tw-mr-2" />
                                            ปฏิเสธ
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Slip Modal */}
            {showSlipModal && selectedPayment && (
                <div className="tw-fixed tw-inset-0 tw-bg-black tw-bg-opacity-50 tw-flex tw-items-center tw-justify-center tw-z-50 tw-p-4">
                    <div className="tw-bg-white tw-rounded-2xl tw-max-w-2xl tw-w-full tw-max-h-[90vh] tw-overflow-y-auto">
                        <div className="tw-p-6 tw-border-b tw-border-gray-200">
                            <div className="tw-flex tw-items-center tw-justify-between">
                                <h3 className="tw-text-xl tw-font-bold tw-text-gray-800">
                                    สลิปการโอนเงิน
                                </h3>
                                <Button
                                    onClick={() => setShowSlipModal(false)}
                                    variant="secondary"
                                    className="tw-px-3 tw-py-2 tw-font-medium tw-rounded-xl tw-transition-all tw-duration-200 tw-bg-gray-100 tw-text-gray-600 tw-border tw-border-transparent tw-outline-none tw-flex tw-items-center tw-justify-center hover:tw-bg-gray-200 hover:tw-text-gray-800 active:tw-bg-gray-300 focus:tw-ring-0 focus:tw-outline-none"
                                >
                                    ✕
                                </Button>
                            </div>
                        </div>

                        <div className="tw-p-6">
                            <div className="tw-mb-4">
                                <p className="tw-font-medium tw-text-gray-800">{selectedPayment.user_name}</p>
                                <p className="tw-text-sm tw-text-gray-600">
                                    จำนวนเงิน: {formatAmount(selectedPayment.amount_cents, selectedPayment.currency)}
                                </p>
                            </div>

                            <div className="tw-bg-gray-100 tw-rounded-lg tw-p-4 tw-text-center">
                                <p className="tw-text-gray-600 tw-mb-4">รูปภาพสลิป</p>
                                <div className="tw-bg-white tw-rounded-lg tw-p-8 tw-border-2 tw-border-dashed tw-border-gray-300">
                                    <CreditCard className="tw-w-16 tw-h-16 tw-text-gray-400 tw-mx-auto tw-mb-4" />
                                    <p className="tw-text-gray-500">
                                        ในระบบจริงจะแสดงรูปภาพสลิปที่นี่
                                    </p>
                                    <p className="tw-text-xs tw-text-gray-400 tw-mt-2">
                                        URL: {selectedPayment.slip_url}
                                    </p>
                                </div>
                            </div>

                            <div className="tw-flex tw-space-x-4 tw-mt-6">
                                <Button
                                    onClick={() => {
                                        handleApprovePayment(selectedPayment.payment_id);
                                        setShowSlipModal(false);
                                    }}
                                    className="tw-w-full tw-h-10  tw-text-lg tw-font-semibold tw-shadow-lg tw-rounded-xl tw-transition-all tw-duration-300 hover:tw-shadow-xl hover:tw-scale-105 active:tw-scale-95 tw-relative tw-overflow-hidden tw-border-0 tw-outline-none focus:tw-outline-none disabled:tw-opacity-50 disabled:tw-cursor-not-allowed disabled:hover:tw-scale-100"
                                    colorClass="tw-bg-gradient-to-r tw-from-emerald-500 tw-to-emerald-600 hover:tw-from-emerald-600 hover:tw-to-emerald-700 tw-text-white focus:tw-ring-4 focus:tw-ring-emerald-300"
                                >
                                    <span className="tw-relative tw-flex tw-items-center tw-justify-center tw-gap-2">
                                        <CheckCircle className="tw-w-4 tw-h-4 tw-mr-2" />
                                        อนุมัติ
                                    </span>
                                </Button>
                                <Button
                                    onClick={() => {
                                        handleRejectPayment(selectedPayment.payment_id, "สลิปไม่ชัดเจน");
                                        setShowSlipModal(false);
                                    }}
                                    className="tw-w-full tw-px-4 tw-h-10 tw-flex tw-items-center tw-justify-center tw-gap-2 tw-text-base tw-font-medium tw-shadow-md tw-rounded-lg tw-transition-all tw-duration-300 hover:tw-shadow-lg hover:tw-scale-105 active:tw-scale-95 tw-border-0 tw-outline-none focus:tw-outline-none disabled:tw-opacity-50 disabled:tw-cursor-not-allowed disabled:hover:tw-scale-100" colorClass="tw-bg-gradient-to-r tw-from-rose-500 tw-to-pink-600 hover:tw-from-pink-600 hover:tw-to-rose-700 tw-text-white focus:tw-ring-2 focus:tw-ring-rose-300 tw-shadow-lg hover:tw-shadow-xl" >
                                    <XCircle className="tw-w-4 tw-h-4 tw-mr-2" />
                                    ปฏิเสธ
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}