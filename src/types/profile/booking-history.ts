export interface BookingHistoryItem {
    id: number;
    booking_date: string; // YYYY-MM-DD format
    court: {
        id: number;
        name: string;
        number: number;
        facility_name: string;
    };
    time_slot: {
        id: number;
        start_time: string; // HH:MM format
        end_time: string; // HH:MM format
        display: string; // "HH:MM - HH:MM"
    };
    status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
    total_price: number;
    created_at: string;
    updated_at: string;
}

export interface BookingHistoryPagination {
    current_page: number;
    total_pages: number;
    total_count: number;
    per_page: number;
    has_next: boolean;
    has_prev: boolean;
}

export interface BookingHistoryResponse {
    success: boolean;
    data: {
        bookings: BookingHistoryItem[];
        pagination: BookingHistoryPagination;
    };
    error?: string;
}

export interface BookingHistoryFilters {
    status?: 'all' | 'pending' | 'confirmed' | 'cancelled' | 'completed';
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
}

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';