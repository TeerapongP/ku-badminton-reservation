export interface ReportData {
    period: {
        days: number;
        startDate: string;
        endDate: string;
    };
    bookingStats: {
        total: number;
        byStatus: Record<string, number>;
        byPaymentStatus: Record<string, number>;
    };
    revenueStats: {
        total: number;
        average: number;
        paidBookings: number;
    };
    dailyTrends: {
        date: string;
        bookings: number;
        revenue: number;
    }[];
    facilityStats: {
        facilityId: string;
        facilityName: string;
        bookings: number;
        revenue: number;
    }[];
    userStats: {
        byRole: Record<string, number>;
        activeUsers: number;
        topUsers: {
            userId: string;
            username: string;
            name: string;
            role: string;
            bookings: number;
            totalSpent: number;
        }[];
    };
    peakHours: {
        hour: number;
        bookings: number;
        timeLabel: string;
    }[];
}

// Legacy interface for backward compatibility
export interface LegacyReportData {
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