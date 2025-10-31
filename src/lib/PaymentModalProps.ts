export type PaymentModalProps = {
    visible: boolean;
    onHide?: () => void;
    paymentData: PaymentData;
    onCancel?: () => void;
    onConfirm?: (slipFile: File) => Promise<void> | void;
    isProcessing?: boolean;
};

type PaymentData = {
    bookingId?: string;
    amount: number | string;
    courtName?: string;
    facilityName?: string;
    date: string;
    time: string;
};