import React, { useEffect, useRef, useCallback, useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/Button";
import { PaymentModal } from "@/components/PaymentModal";
import { useToast } from "@/components/ToastProvider";
import { ModalProps } from "@/lib/BookingData";

/** Util เล็ก ๆ สำหรับฟอร์แมตค่าเงินบาท */
function formatBaht(v: number | string) {
    const n = Number(v ?? 0);
    try {
        return new Intl.NumberFormat("th-TH").format(n);
    } catch {
        return `${n}`;
    }
}

export function BookingConfirmationModal({
    visible,
    onHide,
    bookingData,
    onCancel,
    onConfirm,
    isProcessing = false,
    useSessionData = true,
}: ModalProps) {
    const { data: session } = useSession();
    const toast = useToast();
    const dialogRef = useRef<HTMLDivElement | null>(null);
    const firstFocusableRef = useRef<HTMLButtonElement | null>(null);

    const [showPaymentModal, setShowPaymentModal] = useState(false);

    // ดึงข้อมูล user จาก session หรือใช้ข้อมูลที่ส่งมา
    const userData = useSessionData && session?.user ? {
        name: `${session.user.first_name || ''} ${session.user.last_name || ''}`.trim() || session.user.username || 'ไม่ระบุ',
        phone: session.user.phone || 'ไม่ระบุ',
        email: session.user.email || 'ไม่ระบุ',
        role: session.user.role || 'guest'
    } : null;

    // ปิดด้วย ESC
    useEffect(() => {
        if (!visible) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                e.stopPropagation();
                onHide?.();
            }
        };
        document.addEventListener("keydown", onKey, true);
        return () => document.removeEventListener("keydown", onKey, true);
    }, [visible, onHide]);

    // ล็อก body scroll ตอนเปิดโมดัล
    useEffect(() => {
        if (!visible) return;
        const original = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = original;
        };
    }, [visible]);

    // โฟกัสเริ่มต้นที่ Close button
    useEffect(() => {
        if (!visible) return;
        const t = setTimeout(() => {
            firstFocusableRef.current?.focus();
        }, 0);
        return () => clearTimeout(t);
    }, [visible]);

    // focus trap
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key !== "Tab") return;
        const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusable || focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
            (last as HTMLElement).focus();
            e.preventDefault();
        } else if (!e.shiftKey && document.activeElement === last) {
            (first as HTMLElement).focus();
            e.preventDefault();
        }
    }, []);

    const handleCancel = () => {
        onCancel?.();
        onHide?.();
    };



    const handleConfirm = async () => {
        // เปิด Payment Modal แทนการเรียก onConfirm ทันที
        setShowPaymentModal(true);
    };

    const handlePaymentConfirm = async (slipFile: File) => {
        try {
            // อัปโหลดสลิปการชำระเงิน
            const formData = new FormData();
            formData.append('file', slipFile);
            formData.append('bookingId', 'temp-booking-id'); // TODO: ใช้ booking ID จริง

            const response = await fetch('/api/upload/payment-slip', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error('Upload failed');
            }

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Upload failed');
            }

            // 2. สร้างการจองพร้อมข้อมูลสลิป
            const reservationData = {
                courtId: bookingData.courtId, // ต้องเพิ่ม courtId ใน bookingData
                slotId: bookingData.slotId,   // ต้องเพิ่ม slotId ใน bookingData
                bookingDate: bookingData.date,
                slipUrl: result.data.filePath
            };

            const reservationResponse = await fetch('/api/reservations', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(reservationData),
            });

            if (!reservationResponse.ok) {
                throw new Error('Reservation creation failed');
            }

            const reservationResult = await reservationResponse.json();

            if (reservationResult.success) {
                toast?.showSuccess("จองสำเร็จ", "สร้างการจองและอัปโหลดสลิปเรียบร้อยแล้ว รอการอนุมัติจากแอดมิน");

                // เรียก onConfirm callback พร้อมข้อมูลการจอง
                await onConfirm?.(reservationResult.data);

                // ปิด modal ทั้งหมด
                setShowPaymentModal(false);
                onHide?.();
            } else {
                throw new Error(reservationResult.error || 'Reservation creation failed');
            }
        } catch (error) {
            console.error('Payment confirmation error:', error);
            toast?.showError("เกิดข้อผิดพลาด", "ไม่สามารถอัปโหลดสลิปการชำระเงินได้");
        }
    };

    if (!visible) return null;

    return (
        <div
            className="tw-fixed tw-inset-0 tw-z-50 tw-flex tw-items-center tw-justify-center tw-p-4"
            aria-hidden={!visible}
        >
            {/* Backdrop */}
            <button
                aria-label="ปิดหน้าต่าง"
                className="tw-absolute tw-inset-0 tw-bg-black tw-bg-opacity-50 tw-transition-opacity"
                onClick={onHide}
            />

            {/* Modal */}
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="booking-confirm-title"
                aria-describedby="booking-confirm-desc"
                className="tw-relative tw-bg-white tw-rounded-2xl tw-shadow-2xl tw-w-full tw-max-w-lg tw-max-h-[90vh] tw-overflow-y-auto tw-animate-in tw-fade-in tw-zoom-in tw-duration-300"
                onKeyDown={handleKeyDown}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="tw-px-8 tw-py-6 tw-border-b-2 tw-border-gray-200">
                    <div className="tw-flex tw-items-center tw-justify-between">
                        <h2 id="booking-confirm-title" className="tw-text-2xl tw-font-bold tw-text-gray-800">
                            ยืนยันการจอง
                        </h2>

                        <button
                            ref={firstFocusableRef}
                            onClick={onHide}
                            aria-label="ปิดหน้าต่างยืนยันการจอง"
                            className="tw-w-10 tw-h-10 tw-rounded-2xl tw-flex tw-items-center tw-justify-center tw-transition-all tw-duration-300 tw-shadow-[5px_5px_15px_#e0e0e0,-5px_-5px_15px_#ffffff] hover:tw-shadow-[inset_3px_3px_6px_#d1d1d1,inset_-3px_-3px_6px_#ffffff] active:tw-scale-95 tw-border tw-border-gray-200/60 tw-bg-white tw-text-gray-500 hover:tw-text-gray-700 focus:tw-ring-2 focus:tw-ring-emerald-300 focus:tw-outline-none"
                        >
                            <svg
                                className="tw-w-5 tw-h-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M6 18L18 6M6 6l12 12"
                                />
                            </svg>
                        </button>

                    </div>
                    <p id="booking-confirm-desc" className="tw-sr-only">
                        ตรวจสอบข้อมูลการจองและยืนยันการชำระเงิน
                    </p>
                </div>

                {/* Content */}
                <div className="tw-px-8 tw-py-6">
                    <div className="tw-space-y-4 tw-mb-6">
                        {/* ข้อมูลผู้จอง */}
                        {userData && (
                            <>
                                <div className="tw-pb-4 tw-border-b tw-border-gray-200">
                                    <div className="tw-text-sm tw-text-gray-500 tw-mb-1">ชื่อ-นามสกุล :</div>
                                    <div className="tw-text-base tw-text-gray-800 tw-font-medium">{userData.name}</div>
                                </div>

                                <div className="tw-pb-4 tw-border-b tw-border-gray-200">
                                    <div className="tw-text-sm tw-text-gray-500 tw-mb-1">เบอร์โทรศัพท์ :</div>
                                    <div className="tw-text-base tw-text-gray-800 tw-font-medium">{userData.phone}</div>
                                </div>

                                <div className="tw-pb-4 tw-border-b tw-border-gray-200">
                                    <div className="tw-text-sm tw-text-gray-500 tw-mb-1">อีเมล :</div>
                                    <div className="tw-text-base tw-text-gray-800 tw-font-medium">{userData.email}</div>
                                </div>

                                <div className="tw-pb-4 tw-border-b tw-border-gray-200">
                                    <div className="tw-text-sm tw-text-gray-500 tw-mb-1">สถานะ :</div>
                                    <div className="tw-text-base tw-text-gray-800 tw-font-medium">
                                        <span className={`tw-px-2 tw-py-1 tw-rounded-full tw-text-xs tw-font-semibold ${userData.role === 'admin' ? 'tw-bg-purple-100 tw-text-purple-800' :
                                            userData.role === 'staff' ? 'tw-bg-blue-100 tw-text-blue-800' :
                                                userData.role === 'student' ? 'tw-bg-green-100 tw-text-green-800' :
                                                    'tw-bg-gray-100 tw-text-gray-800'
                                            }`}>
                                            {userData.role.toUpperCase()}
                                        </span>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* ข้อมูลการจอง */}
                        {bookingData.facilityName && (
                            <div className="tw-pb-4 tw-border-b tw-border-gray-200">
                                <div className="tw-text-sm tw-text-gray-500 tw-mb-1">สถานที่ :</div>
                                <div className="tw-text-base tw-text-gray-800 tw-font-medium">{bookingData.facilityName}</div>
                            </div>
                        )}

                        {bookingData.courtName && (
                            <div className="tw-pb-4 tw-border-b tw-border-gray-200">
                                <div className="tw-text-sm tw-text-gray-500 tw-mb-1">สนาม :</div>
                                <div className="tw-text-base tw-text-gray-800 tw-font-medium">{bookingData.courtName}</div>
                            </div>
                        )}

                        <div className="tw-pb-4 tw-border-b tw-border-gray-200">
                            <div className="tw-text-sm tw-text-gray-500 tw-mb-1">วันที่จอง :</div>
                            <div className="tw-text-base tw-text-gray-800 tw-font-medium">{bookingData.date}</div>
                        </div>

                        <div className="tw-pb-4 tw-border-b-2 tw-border-gray-300">
                            <div className="tw-text-sm tw-text-gray-500 tw-mb-1">เวลาที่จอง :</div>
                            <div className="tw-text-base tw-text-gray-800 tw-font-medium">{bookingData.time}</div>
                        </div>
                    </div>

                    {/* Price */}
                    <div className="tw-bg-gradient-to-r tw-from-emerald-50 tw-to-green-50 tw-p-5 tw-rounded-xl tw-mb-2 tw-border tw-border-emerald-200">
                        <div className="tw-flex tw-justify-between tw-items-center">
                            <div className="tw-text-lg tw-text-gray-700 tw-font-semibold">อัตราค่าบริการ:</div>
                            <div className="tw-text-2xl tw-font-bold tw-text-emerald-600">
                                ฿{formatBaht(bookingData.price)}
                            </div>
                        </div>
                    </div>

                    {/* คำเตือน */}
                    <div className="tw-bg-yellow-50 tw-border tw-border-yellow-200 tw-rounded-lg tw-p-4 tw-mb-4">
                        <div className="tw-flex tw-items-start tw-gap-3">
                            <svg className="tw-w-5 tw-h-5 tw-text-yellow-600 tw-mt-0.5 tw-flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            <div className="tw-text-sm tw-text-yellow-800">
                                <p className="tw-font-medium tw-mb-1">กรุณาตรวจสอบข้อมูลให้ถูกต้อง</p>
                                <p>เมื่อยืนยันการจองแล้ว จะไม่สามารถแก้ไขข้อมูลได้</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer (ใช้ Button ของคุณ) */}
                <div className="tw-px-8 tw-pb-6 tw-flex tw-gap-3">
                    <Button
                        className="tw-flex-1 tw-h-12 tw-text-base tw-font-semibold tw-shadow-lg tw-rounded-xl tw-transition-all tw-duration-300 hover:tw-shadow-xl hover:tw-scale-105 active:tw-scale-95 tw-relative tw-overflow-hidden tw-border-0 tw-outline-none focus:tw-outline-none"
                        colorClass="tw-bg-gradient-to-r tw-from-red-500 tw-to-red-600 hover:tw-from-red-600 hover:tw-to-red-700 tw-text-white focus:tw-ring-4 focus:tw-ring-red-300"
                        onClick={handleCancel}
                    >
                        <span className="tw-relative tw-flex tw-items-center tw-justify-center tw-gap-2">
                            ยกเลิก
                        </span>
                    </Button>

                    <Button
                        // ref={lastFocusableRef as any}
                        className="tw-flex-1 tw-h-12 tw-text-base tw-font-semibold tw-shadow-lg tw-rounded-xl tw-transition-all tw-duration-300 hover:tw-shadow-xl hover:tw-scale-105 active:tw-scale-95 tw-relative tw-overflow-hidden tw-border-0 tw-outline-none focus:tw-outline-none disabled:tw-opacity-60 disabled:tw-cursor-not-allowed"
                        colorClass="tw-bg-gradient-to-r tw-from-emerald-500 tw-to-emerald-600 hover:tw-from-emerald-600 hover:tw-to-emerald-700 tw-text-white focus:tw-ring-4 focus:tw-ring-emerald-300"
                        onClick={handleConfirm}
                        disabled={isProcessing}
                    >
                        <span className="tw-relative tw-flex tw-items-center tw-justify-center tw-gap-2">
                            {isProcessing ? "กำลังชำระเงิน..." : "ชำระเงิน"}
                        </span>
                    </Button>
                </div>
            </div>

            {/* Payment Modal */}
            <PaymentModal
                visible={showPaymentModal}
                onHide={() => setShowPaymentModal(false)}
                paymentData={{
                    amount: bookingData.price,
                    courtName: bookingData.courtName,
                    facilityName: bookingData.facilityName,
                    date: bookingData.date,
                    time: bookingData.time,
                }}
                onCancel={() => setShowPaymentModal(false)}
                onConfirm={handlePaymentConfirm}
                isProcessing={isProcessing}
            />
        </div>
    );
}
