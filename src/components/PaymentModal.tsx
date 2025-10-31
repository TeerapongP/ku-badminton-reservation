import React, { useState, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/Button";
import { useToast } from "@/components/ToastProvider";
import { PaymentModalProps } from "@/lib/PaymentModalProps";
import { Upload } from "lucide-react";

/** Util สำหรับฟอร์แมตค่าเงินบาท */
function formatBaht(v: number | string) {
    const n = Number(v ?? 0);
    try {
        return new Intl.NumberFormat("th-TH").format(n);
    } catch {
        return `${n}`;
    }
}

export function PaymentModal({
    visible,
    onHide,
    paymentData,
    onCancel,
    onConfirm,
    isProcessing = false,
}: PaymentModalProps) {
    const { data: session } = useSession();
    const toast = useToast();
    const dialogRef = useRef<HTMLDivElement | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string>("");
    const [isUploading, setIsUploading] = useState(false);

    // QR Code path (served by nginx)
    const qrCodeUrl = "/uploads/payments/IMG_2178.JPG";

    // Handle file selection
    const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            toast?.showError("ไฟล์ไม่ถูกต้อง", "กรุณาเลือกไฟล์รูปภาพ (JPG, PNG, WebP)");
            return;
        }

        // Validate file size (max 10MB)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
            toast?.showError("ไฟล์ใหญ่เกินไป", "กรุณาเลือกไฟล์ที่มีขนาดไม่เกิน 10MB");
            return;
        }

        setSelectedFile(file);

        // Create preview URL
        const reader = new FileReader();
        reader.onloadend = () => {
            setPreviewUrl(reader.result as string);
        };
        reader.readAsDataURL(file);

        toast?.showSuccess("เลือกไฟล์สำเร็จ", "กรุณากดยืนยันการชำระเงิน");
    }, [toast]);

    // Handle payment confirmation
    const handleConfirm = async () => {
        if (!selectedFile) {
            toast?.showError("กรุณาอัปโหลดสลิป", "กรุณาเลือกไฟล์สลิปการโอนเงิน");
            return;
        }

        try {
            setIsUploading(true);
            await onConfirm?.(selectedFile);
        } catch (error) {
            console.error("Payment confirmation error:", error);
            toast?.showError("เกิดข้อผิดพลาด", "ไม่สามารถยืนยันการชำระเงินได้");
        } finally {
            setIsUploading(false);
        }
    };

    // Handle cancel
    const handleCancel = () => {
        setSelectedFile(null);
        setPreviewUrl("");
        onCancel?.();
        onHide?.();
    };

    // Handle close
    const handleClose = () => {
        if (isProcessing || isUploading) return;
        setSelectedFile(null);
        setPreviewUrl("");
        onHide?.();
    };

    if (!visible) return null;

    return (
        <div className="tw-fixed tw-inset-0 tw-z-50 tw-flex tw-items-center tw-justify-center tw-p-4">
            {/* Backdrop */}
            <div
                className="tw-absolute tw-inset-0 tw-bg-black tw-bg-opacity-50 tw-transition-opacity"
                onClick={handleClose}
            />

            {/* Modal */}
            <div
                ref={dialogRef}
                className="tw-relative tw-bg-white tw-rounded-2xl tw-shadow-2xl tw-w-full tw-max-w-4xl tw-max-h-[90vh] tw-overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="tw-px-6 tw-py-4 tw-border-b tw-border-gray-200 tw-bg-gradient-to-r tw-from-blue-50 tw-to-indigo-50">
                    <div className="tw-flex tw-items-center tw-justify-between">
                        <div>
                            <h2 className="tw-text-2xl tw-font-bold tw-text-gray-900">ชำระเงิน</h2>
                            <p className="tw-text-sm tw-text-gray-600 tw-mt-1">
                                กรุณาโอนเงินและอัปโหลดสลิปการโอนเงิน
                            </p>
                        </div>

                        <button
                            onClick={handleClose}
                            disabled={isProcessing || isUploading}
                            className="tw-w-10 tw-h-10 tw-rounded-full tw-flex tw-items-center tw-justify-center tw-text-gray-400 hover:tw-text-gray-600 hover:tw-bg-gray-100 tw-transition-colors disabled:tw-opacity-50"
                        >
                            <svg className="tw-w-6 tw-h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="tw-p-6">
                    <div className="tw-grid tw-grid-cols-1 lg:tw-grid-cols-2 tw-gap-8">
                        {/* Left Column - Payment Info & QR */}
                        <div className="tw-space-y-6">
                            {/* Payment Summary */}
                            <div className="tw-bg-gradient-to-r tw-from-emerald-50 tw-to-green-50 tw-p-6 tw-rounded-xl tw-border tw-border-emerald-200">
                                <h3 className="tw-text-lg tw-font-semibold tw-text-gray-900 tw-mb-4">รายละเอียดการจอง</h3>

                                <div className="tw-space-y-3 tw-text-sm">
                                    {paymentData.facilityName && (
                                        <div className="tw-flex tw-justify-between">
                                            <span className="tw-text-gray-600">สถานที่:</span>
                                            <span className="tw-font-medium">{paymentData.facilityName}</span>
                                        </div>
                                    )}

                                    {paymentData.courtName && (
                                        <div className="tw-flex tw-justify-between">
                                            <span className="tw-text-gray-600">สนาม:</span>
                                            <span className="tw-font-medium">{paymentData.courtName}</span>
                                        </div>
                                    )}

                                    <div className="tw-flex tw-justify-between">
                                        <span className="tw-text-gray-600">วันที่:</span>
                                        <span className="tw-font-medium">{paymentData.date}</span>
                                    </div>

                                    <div className="tw-flex tw-justify-between">
                                        <span className="tw-text-gray-600">เวลา:</span>
                                        <span className="tw-font-medium">{paymentData.time}</span>
                                    </div>

                                    <div className="tw-border-t tw-border-emerald-200 tw-pt-3 tw-mt-4">
                                        <div className="tw-flex tw-justify-between tw-items-center">
                                            <span className="tw-text-lg tw-font-semibold tw-text-gray-900">ยอดชำระ:</span>
                                            <span className="tw-text-2xl tw-font-bold tw-text-emerald-600">
                                                ฿{formatBaht(paymentData.amount)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* QR Code */}
                            <div className="tw-bg-white tw-p-6 tw-rounded-xl tw-border-2 tw-border-dashed tw-border-gray-300 tw-text-center">
                                <h3 className="tw-text-lg tw-font-semibold tw-text-gray-900 tw-mb-4">
                                    สแกน QR Code เพื่อชำระเงิน
                                </h3>

                                <div className="tw-flex tw-justify-center tw-mb-4">
                                    <img
                                        src={qrCodeUrl}
                                        alt="QR Code สำหรับชำระเงิน"
                                        className="tw-w-64 tw-h-64 tw-object-contain tw-border tw-border-gray-200 tw-rounded-lg tw-shadow-md"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjU2IiBoZWlnaHQ9IjI1NiIgdmlld0JveD0iMCAwIDI1NiAyNTYiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyNTYiIGhlaWdodD0iMjU2IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMjggODBDMTAxLjQ5IDgwIDgwIDEwMS40OSA4MCAxMjhTMTAxLjQ5IDE3NiAxMjggMTc2UzE3NiAxNTQuNTEgMTc2IDEyOFMxNTQuNTEgODAgMTI4IDgwWk0xMjggMTUyQzExNC43NSAxNTIgMTA0IDEzNy4yNSAxMDQgMTI4UzExNC43NSAxMDQgMTI4IDEwNFMxNTIgMTE4Ljc1IDE1MiAxMjhTMTM3LjI1IDE1MiAxMjggMTUyWiIgZmlsbD0iIzlDQTNBRiIvPgo8L3N2Zz4K';
                                        }}
                                    />
                                </div>

                                <p className="tw-text-sm tw-text-gray-600">
                                    สแกน QR Code ด้วยแอปธนาคารของคุณ
                                </p>
                            </div>
                        </div>

                        {/* Right Column - Upload Slip */}
                        <div className="tw-space-y-6">
                            <div className="tw-bg-yellow-50 tw-border tw-border-yellow-200 tw-rounded-lg tw-p-4">
                                <div className="tw-flex tw-items-start tw-gap-3">
                                    <svg className="tw-w-5 tw-h-5 tw-text-yellow-600 tw-mt-0.5 tw-flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                    <div className="tw-text-sm tw-text-yellow-800">
                                        <p className="tw-font-medium tw-mb-1">ขั้นตอนการชำระเงิน</p>
                                        <ol className="tw-list-decimal tw-list-inside tw-space-y-1">
                                            <li>สแกน QR Code ด้วยแอปธนาคาร</li>
                                            <li>โอนเงินตามจำนวนที่ระบุ</li>
                                            <li>ถ่ายภาพหรือบันทึกสลิปการโอนเงิน</li>
                                            <li>อัปโหลดสลิปในช่องด้านล่าง</li>
                                        </ol>
                                    </div>
                                </div>
                            </div>

                            {/* Upload Area */}
                            <div className="tw-border-2 tw-border-dashed tw-border-gray-300 tw-rounded-xl tw-p-8 tw-text-center tw-bg-gray-50 hover:tw-bg-gray-100 tw-transition-colors">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/jpeg,image/jpg,image/png,image/webp"
                                    onChange={handleFileSelect}
                                    className="tw-hidden"
                                />

                                {previewUrl ? (
                                    <div className="tw-space-y-4">
                                        <img
                                            src={previewUrl}
                                            alt="ตัวอย่างสลิป"
                                            className="tw-max-w-full tw-max-h-64 tw-mx-auto tw-rounded-lg tw-shadow-md"
                                        />
                                        <div className="tw-text-sm tw-text-gray-600">
                                            <p className="tw-font-medium tw-text-green-600 tw-mb-2">✓ อัปโหลดสลิปเรียบร้อย</p>
                                            <p>ไฟล์: {selectedFile?.name}</p>
                                            <p>ขนาด: {selectedFile ? (selectedFile.size / 1024 / 1024).toFixed(2) : 0} MB</p>
                                        </div>
                                        <Button
                                            onClick={() => fileInputRef.current?.click()}
                                            className="tw-px-4 tw-py-2 tw-bg-gray-500 hover:tw-bg-gray-600 tw-text-white tw-rounded-lg tw-transition-colors"
                                        >
                                            เปลี่ยนไฟล์
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="tw-space-y-4">
                                        <div className="tw-w-16 tw-h-16 tw-mx-auto tw-bg-gray-200 tw-rounded-full tw-flex tw-items-center tw-justify-center">
                                            <svg className="tw-w-8 tw-h-8 tw-text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                            </svg>
                                        </div>
                                        <div className="tw-flex tw-flex-col tw-items-center tw-text-center">
                                            <h3 className="tw-text-lg tw-font-semibold tw-text-gray-900 tw-mb-2">
                                                อัปโหลดสลิปการโอนเงิน
                                            </h3>
                                            <p className="tw-text-sm tw-text-gray-600 tw-mb-4">
                                                รองรับไฟล์ JPG, PNG, WebP (ไม่เกิน 10MB)
                                            </p>

                                            <Button
                                                onClick={() => fileInputRef.current?.click()}
                                                className="
      tw-px-6 tw-py-3 
      tw-font-semibold tw-text-base
      tw-rounded-xl 
      tw-shadow-md hover:tw-shadow-lg
      hover:tw-scale-[1.03] active:tw-scale-[0.97]
      tw-transition-all tw-duration-300 tw-ease-out
      tw-flex tw-items-center tw-justify-center tw-gap-2
      tw-border-0 tw-outline-none focus:tw-outline-none focus:tw-ring-0
    "
                                                colorClass="
      tw-bg-gradient-to-r 
      tw-from-sky-500 tw-to-blue-600
      hover:tw-from-sky-600 hover:tw-to-blue-700
      tw-text-white
      focus:tw-ring-4 focus:tw-ring-sky-300/50
    "
                                            >
                                                <Upload className="tw-w-5 tw-h-5" />
                                                เลือกไฟล์
                                            </Button>
                                        </div>

                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="tw-px-6 tw-py-4 tw-border-t tw-border-gray-200 tw-bg-gray-50">
                    <div className="tw-flex tw-gap-4 tw-justify-end">
                        <Button
                            onClick={handleCancel}
                            disabled={isProcessing || isUploading}
                            className="tw-px-6 tw-py-3 tw-bg-gray-500 hover:tw-bg-gray-600 tw-text-white tw-rounded-lg tw-transition-colors tw-font-medium disabled:tw-opacity-50"
                        >
                            ยกเลิก
                        </Button>

                        <Button
                            onClick={handleConfirm}
                            disabled={!selectedFile || isProcessing || isUploading}
                            className="tw-px-6 tw-py-3 tw-bg-emerald-600 hover:tw-bg-emerald-700 tw-text-white tw-rounded-lg tw-transition-colors tw-font-medium disabled:tw-opacity-50 disabled:tw-cursor-not-allowed tw-flex tw-items-center tw-gap-2"
                        >
                            {isUploading || isProcessing ? (
                                <>
                                    <div className="tw-animate-spin tw-w-4 tw-h-4 tw-border-2 tw-border-white tw-border-t-transparent tw-rounded-full"></div>
                                    กำลังดำเนินการ...
                                </>
                            ) : (
                                <>
                                    <svg className="tw-w-4 tw-h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    ยืนยันการชำระเงิน
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}