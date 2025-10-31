export interface AuditLog {
    id: string;
    userId: string | null;
    usernameInput: string;
    action: 'login_success' | 'login_fail' | 'logout';
    ip: string | null;
    userAgent: string | null;
    createdAt: string;
    user: {
        id: string;
        username: string;
        name: string;
        role: string;
        email: string;
    } | null;
}

export interface AuditStats {
    period: {
        days: number;
        startDate: string;
        endDate: string;
    };
    loginStats: {
        total: number;
        successful: number;
        failed: number;
        logout: number;
    };
    dailyTrends: Array<{
        date: string;
        action: string;
        count: number;
    }>;
    topFailedIPs: Array<{
        ip: string;
        failedAttempts: number;
    }>;
    suspiciousActivities: Array<{
        username: string;
        ip: string;
        failedAttempts: number;
        lastAttempt: string;
    }>;
    topUsers: Array<{
        userId: string;
        loginCount: number;
        user: {
            username: string;
            name: string;
            role: string;
        } | null;
    }>;
}