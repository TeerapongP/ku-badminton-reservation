import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/Auth';
import { prisma } from '@/lib/prisma';
import {
    withErrorHandler,
    CustomApiError,
    ERROR_CODES,
    HTTP_STATUS,
    successResponse
} from "@/lib/error-handler";

async function auditStatsHandler(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        // ตรวจสอบสิทธิ์ admin
        if (!session?.user || (session.user.role !== 'admin' && session.user.role !== 'super_admin' && session.user.role !== 'super_admin')) {
            throw new CustomApiError(
                ERROR_CODES.UNAUTHORIZED,
                'ไม่มีสิทธิ์เข้าถึง',
                HTTP_STATUS.FORBIDDEN
            );
        }

        const { searchParams } = new URL(request.url);
        const days = parseInt(searchParams.get('days') || '7'); // Default 7 days

        // Validate days parameter
        if (days < 1 || days > 365) {
            throw new CustomApiError(
                ERROR_CODES.VALIDATION_ERROR,
                'จำนวนวันต้องอยู่ระหว่าง 1-365',
                HTTP_STATUS.BAD_REQUEST
            );
        }

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        // Get login statistics
        const loginStats = await prisma.auth_log.groupBy({
            by: ['action'],
            where: {
                created_at: {
                    gte: startDate
                }
            },
            _count: {
                action: true
            }
        });

        // Get daily login trends
        const dailyTrends = await prisma.$queryRaw`
      SELECT 
        DATE(created_at) as date,
        action,
        COUNT(*) as count
      FROM auth_log 
      WHERE created_at >= ${startDate}
      GROUP BY DATE(created_at), action
      ORDER BY date DESC, action
    ` as Array<{
            date: Date;
            action: string;
            count: bigint;
        }>;

        // Get top failed login attempts by IP
        const topFailedIPs = await prisma.auth_log.groupBy({
            by: ['ip'],
            where: {
                action: 'login_fail' as const,
                created_at: {
                    gte: startDate
                },
                ip: {
                    not: null
                }
            },
            _count: {
                ip: true
            },
            orderBy: {
                _count: {
                    ip: 'desc'
                }
            },
            take: 10
        });

        // Get recent suspicious activities (multiple failed logins)
        const suspiciousActivities = await prisma.$queryRaw`
      SELECT 
        username_input,
        ip,
        COUNT(*) as failed_attempts,
        MAX(created_at) as last_attempt
      FROM auth_log 
      WHERE action = 'login_fail' 
        AND created_at >= ${startDate}
      GROUP BY username_input, ip
      HAVING COUNT(*) >= 3
      ORDER BY failed_attempts DESC, last_attempt DESC
      LIMIT 20
    ` as Array<{
            username_input: string;
            ip: string;
            failed_attempts: bigint;
            last_attempt: Date;
        }>;

        // Get user login frequency
        const userLoginFrequency = await prisma.auth_log.groupBy({
            by: ['user_id'],
            where: {
                action: 'login_success' as const,
                created_at: {
                    gte: startDate
                },
                user_id: {
                    not: null
                }
            },
            _count: {
                user_id: true
            },
            orderBy: {
                _count: {
                    user_id: 'desc'
                }
            },
            take: 10
        });

        // Get user details for top users
        const topUserIds = userLoginFrequency.map(item => item.user_id).filter(Boolean);
        const topUsers = await prisma.users.findMany({
            where: {
                user_id: {
                    in: topUserIds as bigint[]
                }
            },
            select: {
                user_id: true,
                username: true,
                first_name: true,
                last_name: true,
                role: true
            }
        });

        // Format response
        const loginStatsFormatted = loginStats.reduce((acc, stat) => {
            acc[stat.action] = stat._count.action;
            return acc;
        }, {} as Record<string, number>);

        const dailyTrendsFormatted = dailyTrends.map(trend => ({
            date: trend.date.toISOString().split('T')[0],
            action: trend.action,
            count: Number(trend.count)
        }));

        const topFailedIPsFormatted = topFailedIPs.map(item => ({
            ip: item.ip,
            failedAttempts: item._count.ip
        }));

        const suspiciousActivitiesFormatted = suspiciousActivities.map(activity => ({
            username: activity.username_input,
            ip: activity.ip,
            failedAttempts: Number(activity.failed_attempts),
            lastAttempt: activity.last_attempt
        }));

        const topUsersFormatted = userLoginFrequency.map(freq => {
            const user = topUsers.find(u => u.user_id === freq.user_id);
            return {
                userId: freq.user_id?.toString(),
                loginCount: freq._count.user_id,
                user: user ? {
                    username: user.username,
                    name: `${user.first_name} ${user.last_name}`.trim(),
                    role: user.role
                } : null
            };
        });

        return successResponse({
            period: {
                days,
                startDate: startDate.toISOString(),
                endDate: new Date().toISOString()
            },
            loginStats: {
                total: Object.values(loginStatsFormatted).reduce((sum, count) => sum + count, 0),
                successful: loginStatsFormatted.login_success || 0,
                failed: loginStatsFormatted.login_fail || 0,
                logout: loginStatsFormatted.logout || 0
            },
            dailyTrends: dailyTrendsFormatted,
            topFailedIPs: topFailedIPsFormatted,
            suspiciousActivities: suspiciousActivitiesFormatted,
            topUsers: topUsersFormatted
        }, 'ดึงสถิติ audit logs สำเร็จ');

    } catch (error) {
        if (error instanceof CustomApiError) {
            throw error;
        }

        console.error('Audit stats error:', error);
        throw new CustomApiError(
            ERROR_CODES.INTERNAL_SERVER_ERROR,
            'เกิดข้อผิดพลาดในการดึงสถิติ audit logs',
            HTTP_STATUS.INTERNAL_SERVER_ERROR
        );
    }
}

export const GET = withErrorHandler(auditStatsHandler);