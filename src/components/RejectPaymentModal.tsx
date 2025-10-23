import React, { useState } from 'react';
import { Dialog } from 'primereact/dialog';
import { InputTextarea } from 'primereact/inputtextarea';
import { XCircle } from 'lucide-react';
import { RejectPaymentModalProps } from '@/lib/PaymentData';
import { Button } from './Button';


export const RejectPaymentModal: React.FC<RejectPaymentModalProps> = ({
    visible,
    onHide,
    selectedPayment = {
        user_name: 'ไม่ระบุ',
        reservation_id: 'ไม่ระบุ',
        amount_cents: 0,
        currency: 'THB'
    },
    onConfirm
}) => {
    const [rejectReason, setRejectReason] = useState('');
    const [rejecting, setRejecting] = useState(false);

    const formatAmount = (amountCents: number, currency: string) => {
        const amount = amountCents / 100;
        return new Intl.NumberFormat('th-TH', {
            style: 'currency',
            currency: currency
        }).format(amount);
    };

    const handleReasonClick = (reason: string) => {
        setRejectReason(reason);
    };

    const handleConfirmReject = async () => {
        if (!rejectReason.trim()) return;

        setRejecting(true);
        try {
            if (onConfirm) {
                await onConfirm(rejectReason);
            }
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1500));
            setRejectReason('');
            onHide();
        } catch (error) {
            console.error('Error rejecting payment:', error);
        } finally {
            setRejecting(false);
        }
    };

    const handleClose = () => {
        if (!rejecting) {
            setRejectReason('');
            onHide();
        }
    };

    const quickReasons = [
        "สลิปไม่ชัดเจน",
        "จำนวนเงินไม่ถูกต้อง",
        "ข้อมูลไม่ครบถ้วน",
        "สลิปปลอม",
        "หมดเวลาชำระเงิน"
    ];

    const headerContent = (
        <div className="tw-flex tw-items-center tw-justify-between tw-w-full">
            <h3 className="tw-text-xl tw-font-bold tw-text-gray-800 tw-flex tw-items-center tw-m-0">
                <XCircle className="tw-w-6 tw-h-6 tw-text-red-500 tw-mr-2" />
                ปฏิเสธการชำระเงิน
            </h3>
        </div>
    );

    const footerContent = (
        <div className="tw-flex tw-space-x-3 tw-pt-4">
            <Button
                onClick={handleClose}
                disabled={rejecting}
                variant="secondary"
                className="tw-flex-1 tw-h-12 tw-text-base tw-font-medium tw-rounded-xl tw-transition-all tw-duration-200 tw-bg-gray-100 tw-text-gray-700 tw-border tw-border-gray-200 hover:tw-bg-gray-200 hover:tw-text-gray-800"
            >
                ยกเลิก
            </Button>
            <Button
                onClick={handleConfirmReject}
                disabled={!rejectReason.trim() || rejecting}
                className="tw-w-auto tw-px-4 tw-h-12 tw-flex tw-items-center tw-justify-center tw-gap-2 tw-text-base tw-font-medium tw-shadow-md tw-rounded-lg tw-transition-all tw-duration-300 hover:tw-shadow-lg hover:tw-scale-105 active:tw-scale-95 tw-border-0 tw-outline-none focus:tw-outline-none disabled:tw-opacity-50 disabled:tw-cursor-not-allowed disabled:hover:tw-scale-100"
                colorClass="tw-bg-gradient-to-r tw-from-rose-500 tw-to-pink-600 hover:tw-from-pink-600 hover:tw-to-rose-700 tw-text-white focus:tw-ring-2 focus:tw-ring-rose-300 tw-shadow-lg hover:tw-shadow-xl"
            >
                {rejecting ? (
                    <div className="tw-flex tw-items-center tw-justify-center">
                        <i className="pi pi-spin pi-spinner tw-mr-2"></i>
                        กำลังปฏิเสธ...
                    </div>
                ) : (
                    <div className="tw-flex tw-items-center tw-justify-center">
                        <XCircle className="tw-w-4 tw-h-4 tw-mr-2" />
                        ยืนยันปฏิเสธ
                    </div>
                )}
            </Button>
        </div>
    );

    return (
        <Dialog
            visible={visible}
            onHide={handleClose}
            header={headerContent}
            footer={footerContent}
            className="tw-max-w-md tw-w-full"
            contentClassName="tw-p-0"
            dismissableMask={!rejecting}
            closable={!rejecting}
            draggable={false}
            resizable={false}
            blockScroll
        >
            <div className="tw-p-6">
                {/* Payment Info */}
                <div className="tw-bg-red-50 tw-border tw-border-red-200 tw-rounded-lg tw-p-4 tw-mb-6">
                    <div className="tw-flex tw-items-center tw-mb-2">
                        <div className="tw-w-2 tw-h-2 tw-bg-red-500 tw-rounded-full tw-mr-2"></div>
                        <p className="tw-font-medium tw-text-gray-800 tw-m-0">{selectedPayment.user_name || 'ไม่ระบุ'}</p>
                    </div>
                    <p className="tw-text-sm tw-text-gray-600 tw-ml-4 tw-mb-1">
                        รหัสการจอง: {selectedPayment.reservation_id || 'ไม่ระบุ'}
                    </p>
                    <p className="tw-text-sm tw-text-gray-600 tw-ml-4 tw-m-0">
                        จำนวนเงิน: {selectedPayment.amount_cents && selectedPayment.currency ?
                            formatAmount(selectedPayment.amount_cents, selectedPayment.currency) :
                            'ไม่ระบุ'}
                    </p>
                </div>

                {/* Reason Input */}
                <div className="tw-mb-6">
                    <label className="tw-block tw-text-sm tw-font-medium tw-text-gray-700 tw-mb-2">
                        เหตุผลในการปฏิเสธ <span className="tw-text-red-500">*</span>
                    </label>
                    <InputTextarea
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="กรุณาระบุเหตุผลในการปฏิเสธการชำระเงิน..."
                        className="tw-w-full tw-px-4 tw-py-3 tw-border tw-border-gray-300 tw-rounded-lg tw-resize-none focus:tw-ring-2 focus:tw-ring-red-500 focus:tw-border-red-500 tw-outline-none tw-transition-colors"
                        rows={4}
                        disabled={rejecting}
                        autoResize={false}
                    />

                    {/* Quick Reason Buttons */}
                    <div className="tw-mt-3">
                        <p className="tw-text-xs tw-text-gray-500 tw-mb-2">เหตุผลที่พบบ่อย:</p>
                        <div className="tw-flex tw-flex-wrap tw-gap-2">
                            {quickReasons.map((reason) => (
                                <button
                                    key={reason}
                                    onClick={() => handleReasonClick(reason)}
                                    disabled={rejecting}
                                    className="tw-px-3 tw-py-1 tw-text-xs tw-bg-gray-100 tw-text-gray-700 tw-rounded-full tw-border tw-border-gray-200 hover:tw-bg-gray-200 tw-transition-colors disabled:tw-opacity-50 disabled:tw-cursor-not-allowed"
                                >
                                    {reason}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Warning */}
                <div className="tw-bg-yellow-50 tw-border tw-border-yellow-200 tw-rounded-lg tw-p-3">
                    <div className="tw-flex tw-items-start">
                        <div className="tw-text-xl tw-mr-2 tw-mt-0.5">⚠️</div>
                        <div>
                            <p className="tw-text-sm tw-font-medium tw-text-yellow-800 tw-m-0">คำเตือน</p>
                            <p className="tw-text-xs tw-text-yellow-700 tw-mt-1 tw-mb-0">
                                การปฏิเสธจะส่งแจ้งเตือนไปยังผู้ใช้พร้อมเหตุผลที่ระบุ และการจองจะถูกยกเลิก
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </Dialog>
    );
};