import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Button } from "@/components/Button";

/** Util เล็ก ๆ สำหรับฟอร์แมตค่าเงินบาท */
function formatBaht(v: number | string) {
    const n = Number(v ?? 0);
    try {
        return new Intl.NumberFormat("th-TH").format(n);
    } catch {
        return `${n}`;
    }
}

type BookingData = {
    name: string;
    phone: string;
    email: string;
    date: string;
    time: string;
    price: string | number;
};

type ModalProps = {
    visible: boolean;
    onHide?: () => void;
    bookingData: BookingData;
    onCancel?: () => void;
    onEdit?: () => void;
    onConfirm?: () => Promise<void> | void;
    isProcessing?: boolean;
};

export function BookingConfirmationModal({
    visible,
    onHide,
    bookingData,
    onCancel,
    onEdit,
    onConfirm,
    isProcessing = false,
}: ModalProps) {
    const dialogRef = useRef<HTMLDivElement | null>(null);
    const firstFocusableRef = useRef<HTMLButtonElement | null>(null);
    const lastFocusableRef = useRef<HTMLButtonElement | null>(null);

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

    const handleEdit = () => onEdit?.();

    const handleConfirm = async () => {
        await onConfirm?.();
        onHide?.();
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
                        <div className="tw-pb-4 tw-border-b tw-border-gray-200">
                            <div className="tw-text-sm tw-text-gray-500 tw-mb-1">ชื่อ-นามสกุล :</div>
                            <div className="tw-text-base tw-text-gray-800 tw-font-medium">{bookingData.name}</div>
                        </div>

                        <div className="tw-pb-4 tw-border-b tw-border-gray-200">
                            <div className="tw-text-sm tw-text-gray-500 tw-mb-1">เบอร์โทรศัพท์ :</div>
                            <div className="tw-text-base tw-text-gray-800 tw-font-medium">{bookingData.phone}</div>
                        </div>

                        <div className="tw-pb-4 tw-border-b tw-border-gray-200">
                            <div className="tw-text-sm tw-text-gray-500 tw-mb-1">อีเมล :</div>
                            <div className="tw-text-base tw-text-gray-800 tw-font-medium">{bookingData.email}</div>
                        </div>

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
                    <div className="tw-bg-gradient-to-r tw-from-gray-50 tw-to-gray-100 tw-p-5 tw-rounded-xl tw-mb-2">
                        <div className="tw-flex tw-justify-between tw-items-center">
                            <div className="tw-text-lg tw-text-gray-700 tw-font-semibold">อัตราค่าบริการ:</div>
                            <div className="tw-text-2xl tw-font-bold tw-text-purple-600">
                                {formatBaht(bookingData.price)} บาท
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
        </div>
    );
}
