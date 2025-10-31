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

async function reportsHandler(request: NextRequest) {
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
        const days = parseInt(searchParams.get('days') || '30'); // Default 30 days
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        // Calculate date range
        let dateFilter: any = {};
        if (startDate && endDate) {
            dateFilter = {
                gte: new Date(startDate),
                lte: new Date(endDate)
            };
        } else {
            const start = new Date();
            start.setDate(start.getDate() - days);
            dateFilter = {
                gte: start,
                lte: new Date()
            };
        }

        // 1. Booking Statistics
        const totalBookings = await prisma.reservations.count({
            where: {
                created_at: dateFilter
            }
        });

        const bookingsByStatus = await prisma.reservations.groupBy({
            by: ['status'],
            where: {
                created_at: dateFilter
            },
            _count: {
                status: true
            }
        });

        const bookingsByPaymentStatus = await prisma.reservations.groupBy({
            by: ['payment_status'],
            where: {
                created_at: dateFilter
            },
            _count: {
                payment_status: true
            }
        });

        // 2. Revenue Statistics
        const revenueStats = await prisma.reservations.aggregate({
            where: {
                created_at: dateFilter,
                payment_status: 'paid'
            },
            _sum: {
                total_cents: true
            },
            _avg: {
                total_cents: true
            },
            _count: {
                reservation_id: true
            }
        });

        // 3. Daily Booking Trends
        const dailyBookings = await prisma.$queryRaw`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as bookings,
        SUM(CASE WHEN payment_status = 'paid' THEN total_cents ELSE 0 END) as revenue_cents
      FROM reservations 
      WHERE created_at >= ${dateFilter.gte} AND created_at <= ${dateFilter.lte}
      GROUP BY DATE(created_at)
      ORDER BY date DESC
      LIMIT 30
    ` as Array<{
            date: Date;
            bookings: bigint;
            revenue_cents: bigint;
        }>;

        // 4. Popular Facilities
        const facilityStats = await prisma.reservations.groupBy({
            by: ['facility_id'],
            where: {
                created_at: dateFilter
            },
            _count: {
                facility_id: true
            },
            _sum: {
                total_cents: true
            },
            orderBy: {
                _count: {
                    facility_id: 'desc'
                }
            },
            take: 10
        });

        // Get facility names
        const facilityIds = facilityStats.map(stat => stat.facility_id);
        const facilities = await prisma.facilities.findMany({
            where: {
                facility_id: {
                    in: facilityIds
                }
            },
            select: {
                facility_id: true,
                name_th: true,
                name_en: true
            }
        });

        // 5. User Statistics
        const userStats = await prisma.users.groupBy({
            by: ['role'],
            _count: {
                role: true
            }
        });

        const activeUsers = await prisma.users.count({
            where: {
                status: 'active',
                last_login_at: {
                    gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
                }
            }
        });

        // 6. Top Users by Bookings
        const topUsers = await prisma.reservations.groupBy({
            by: ['user_id'],
            where: {
                created_at: dateFilter
            },
            _count: {
                user_id: true
            },
            _sum: {
                total_cents: true
            },
            orderBy: {
                _count: {
                    user_id: 'desc'
                }
            },
            take: 10
        });

        // Get user details
        const userIds = topUsers.map(stat => stat.user_id);
        const users = await prisma.users.findMany({
            where: {
                user_id: {
                    in: userIds
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

        // 7. Peak Hours Analysis
        const peakHours = await prisma.$queryRaw`
      SELECT 
        HOUR(ri.created_at) as hour,
        COUNT(*) as bookings
      FROM reservation_items ri
      JOIN reservations r ON ri.reservation_id = r.reservation_id
      WHERE r.created_at >= ${dateFilter.gte} AND r.created_at <= ${dateFilter.lte}
      GROUP BY HOUR(ri.created_at)
      ORDER BY bookings DESC
    ` as Array<{
            hour: number;
            bookings: bigint;
        }>;

        // Format response
        const formattedFacilityStats = facilityStats.map(stat => {
            const facility = facilities.find(f => f.facility_id === stat.facility_id);
            return {
                facilityId: stat.facility_id.toString(),
                facilityName: facility?.name_th || 'ไม่ระบุ',
                bookings: stat._count.facility_id,
                revenue: Number(stat._sum.total_cents || 0) / 100
            };
        });

        const formattedTopUsers = topUsers.map(stat => {
            const user = users.find(u => u.user_id === stat.user_id);
            return {
                userId: stat.user_id.toString(),
                username: user?.username || 'ไม่ระบุ',
                name: user ? `${user.first_name} ${user.last_name}`.trim() : 'ไม่ระบุ',
                role: user?.role || 'ไม่ระบุ',
                bookings: stat._count.user_id,
                totalSpent: Number(stat._sum.total_cents || 0) / 100
            };
        });

        const formattedDailyBookings = dailyBookings.map(day => ({
            date: day.date.toISOString().split('T')[0],
            bookings: Number(day.bookings),
            revenue: Number(day.revenue_cents) / 100
        }));

        const formattedPeakHours = peakHours.map(hour => ({
            hour: hour.hour,
            bookings: Number(hour.bookings),
            timeLabel: `${hour.hour.toString().padStart(2, '0')}:00`
        }));

        return successResponse({
            period: {
                days,
                startDate: dateFilter.gte.toISOString(),
                endDate: dateFilter.lte.toISOString()
            },
            bookingStats: {
                total: totalBookings,
                byStatus: bookingsByStatus.reduce((acc, item) => {
                    acc[item.status] = item._count.status;
                    return acc;
                }, {} as Record<string, number>),
                byPaymentStatus: bookingsByPaymentStatus.reduce((acc, item) => {
                    acc[item.payment_status] = item._count.payment_status;
                    return acc;
                }, {} as Record<string, number>)
            },
            revenueStats: {
                total: Number(revenueStats._sum.total_cents || 0) / 100,
                average: Number(revenueStats._avg.total_cents || 0) / 100,
                paidBookings: revenueStats._count.reservation_id
            },
            dailyTrends: formattedDailyBookings,
            facilityStats: formattedFacilityStats,
            userStats: {
                byRole: userStats.reduce((acc, item) => {
                    acc[item.role] = item._count.role;
                    return acc;
                }, {} as Record<string, number>),
                activeUsers,
                topUsers: formattedTopUsers
            },
            peakHours: formattedPeakHours
        }, 'ดึงข้อมูลรายงานสำเร็จ');

    } catch (error) {
        if (error instanceof CustomApiError) {
            throw error;
        }

        console.error('Reports error:', error);
        throw new CustomApiError(
            ERROR_CODES.INTERNAL_SERVER_ERROR,
            'เกิดข้อผิดพลาดในการดึงข้อมูลรายงาน',
            HTTP_STATUS.INTERNAL_SERVER_ERROR
        );
    }
}

export const GET = withErrorHandler(reportsHandler);