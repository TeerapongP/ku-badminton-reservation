export interface PaymentData {
  payment_id: string;
  reservation_id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  username: string;
  user_role: string;
  amount_cents: number;
  currency: string;
  status: 'pending' | 'succeeded' | 'failed' | 'refunded';
  payment_method: string;
  slip_url: string | null;
  uploaded_at: string;
  updated_at: string;
  booking_details: {
    facilities: {
      facility_name: string;
      court_name: string;
      play_date: string;
      start_time: string;
      end_time: string;
    }[];
    total_amount: number;
    booking_date: string;
    reservation_status: string;
  };
}

export interface PaymentResponse {
  payments: PaymentData[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  summary: {
    pending: number;
    approved: number;
    rejected: number;
    total: number;
  };
}

export interface ApprovePaymentRequest {
  payment_id: string;
  notes?: string;
}

export interface RejectPaymentRequest {
  payment_id: string;
  reason: string;
  notes?: string;
}

export interface RejectPaymentModalProps {
  visible: boolean;
  onHide: () => void;
  selectedPayment?: {
    user_name: string;
    reservation_id: string;
    amount_cents: number;
    currency: string;
  };
  onConfirm?: (reason: string) => Promise<void>;
}