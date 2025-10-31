export interface Activity {
    type: 'payment_approval' | 'payment_rejection' | 'booking_created' | 'booking_cancelled' | 'user_registered' | 'system_alert';
    message: string;
    time: Date | string;
    timeAgo: string;
    icon: string;
    color: string;
    relatedId?: string;
}

export interface ActivitiesResponse {
    activities: Activity[];
    total: number;
    lastUpdated: string;
}