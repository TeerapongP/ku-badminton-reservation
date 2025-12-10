export interface DashboardBooking {
    court_id: string;
    court_name: string;
    court_number: number;
    facility_name: string;
    time_slot: string;
    start_time: string;
    end_time: string;
    status: 'confirmed' | 'pending' | 'cancelled' | 'available';
    user_name?: string;
    user_email?: string;
    user_phone?: string;
    reservation_id?: string;
    booking_date: string;
}

export interface DashboardBookingResponse {
    success: boolean;
    data: DashboardBooking[];
    message?: string;
}