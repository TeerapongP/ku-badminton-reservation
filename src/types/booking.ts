export interface DashboardBooking {
    id:           string;                                              // item_id หรือ "available-xxx"
    court_number: number;
    court_name:   string;
    date:         string;                                             // YYYY-MM-DD
    time_slot:    string;                                             // HH:MM
    user_name:    string;                                             // '' ถ้า available
    status:       'confirmed' | 'pending' | 'cancelled' | 'available';
    created_at:   string;                                             // '' ถ้า available
}

export interface DashboardBookingResponse {
    success:  boolean;
    data:     DashboardBooking[];
    message?: string;
}