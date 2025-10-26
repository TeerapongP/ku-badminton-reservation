export interface ReportData {
    totalBookings: number;
    totalRevenue: number;
    totalUsers: number;
    averageBookingValue: number;
    bookingsByStatus: {
        pending: number;
        confirmed: number;
        cancelled: number;
        completed: number;
        no_show: number;
    };
    revenueByMonth: {
        month: string;
        revenue: number;
        bookings: number;
    }[];
    topFacilities: {
        name: string;
        bookings: number;
        revenue: number;
    }[];
    usersByRole: {
        student: number;
        staff: number;
        guest: number;
        admin: number;
    };
}