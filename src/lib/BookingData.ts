type BookingData = {
    date: string;
    time: string;
    price: string | number;
    courtName?: string;
    facilityName?: string;
    courtId?: string | number;
    slotId?: string | number;
};

export type ModalProps = {
    visible: boolean;
    onHide?: () => void;
    bookingData: BookingData;
    onCancel?: () => void;
    onConfirm?: (reservationData?: any) => Promise<void> | void;
    isProcessing?: boolean;
    useSessionData?: boolean; // เพิ่ม option ให้เลือกใช้ session data หรือไม่
};