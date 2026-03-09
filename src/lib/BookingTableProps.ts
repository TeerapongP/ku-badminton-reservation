import { DashboardBooking } from "@/types/booking";

export interface BookingTableProps {
    bookings?: DashboardBooking[];
    courts?: any[];
    loading?: boolean;
}
