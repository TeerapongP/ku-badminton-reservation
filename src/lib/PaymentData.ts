interface PaymentData {
  user_name: string;
  reservation_id: string;
  amount_cents: number;
  currency: string;
}

export  interface RejectPaymentModalProps {
  visible: boolean;
  onHide: () => void;
  selectedPayment?: PaymentData;
  onConfirm?: (reason: string) => Promise<void> | void;
}