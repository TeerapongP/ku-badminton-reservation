export interface Booking {
    reservation_id: string;
    user_id: string;
    user_name: string;
    user_email: string;
    user_phone: string;
    user_role: 'student' | 'staff' | 'guest' | 'admin';
    facility_name: string;
    court_name: string;
    court_code: string;
    play_date: string;
    time_slots: string[];
    total_amount: number;
    currency: string;
    status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
    payment_status: 'unpaid' | 'partial' | 'paid' | 'refunded';
    created_at: string;
    confirmed_at?: string;
    cancelled_at?: string;
    notes?: string;
}
