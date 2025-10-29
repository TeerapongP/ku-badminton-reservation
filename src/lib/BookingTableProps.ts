import { DashboardBooking } from "@/types/booking";

export interface BookingTableProps {
    bookings?: Array<{
        id: number;
        court_number: number;
        time_slot: string;
        status: string;
        user_name: string;
    }>;
    loading?: boolean;
}
