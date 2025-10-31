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

async function activitiesHandler(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        // ตรวจสอบสิทธิ์ admin
        if (!session?.user || (session.user.role !== 'admin' && session.user.role !== 'super_admin' && session.user.role !== 'super-admin')) {
            throw new CustomApiError(
                ERROR_CODES.UNAUTHORIZED,
                'ไม่มีสิทธิ์เข้าถึง',
                HTTP_STATUS.FORBIDDEN
            );
        }

        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '10');

        // ดึงกิจกรรมล่าสุดจากหลายแหล่ง
        const activities: { type: string; message: string; time: any; icon: string; color: string; relatedId: string; }[] = [];

        // 1. การชำระเงินล่าสุด (อนุมัติ/ปฏิเสธ)
        const recentPayments = await prisma.payments.findMany({
            where: {
                OR: [
                    { status: 'succeeded' },
                    { status: 'failed' }
                ],
                updated_at: {
                    gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 ชั่วโมงที่ผ่านมา
                }
            },
            include: {
                reservations: {
                    include: {
                        users: {
                            select: {
                                first_name: true,
                                last_name: true,
                                username: true
                            }
                        }
                    }
                }
            },
            orderBy: {
                updated_at: 'desc'
            },
            take: 5
        });

        // แปลงข้อมูล payments เป็น activities
        recentPayments.forEach(payment => {
            const user = payment.reservations?.users;
            const userName = user ? `${user.first_name} ${user.last_name}`.trim() : 'ไม่ระบุ';

            if (payment.status === 'succeeded') {
                activities.push({
                    type: 'payment_approval',
                    message: `อนุมัติการชำระเงิน: ${userName} (฿${(payment.amount_cents / 100).toLocaleString()})`,
                    time: payment.updated_at,
                    icon: 'CheckCircle',
                    color: 'tw-text-green-600',
                    relatedId: payment.payment_id.toString()
                });
            } else if (payment.status === 'failed') {
                const rejectionReason = payment.meta_json ? (payment.meta_json as any)?.rejection_reason : null;
                activities.push({
                    type: 'payment_rejection',
                    message: `ปฏิเสธการชำระเงิน: ${userName}${rejectionReason ? ` - ${rejectionReason}` : ''}`,
                    time: payment.updated_at,
                    icon: 'XCircle',
                    color: 'tw-text-red-600',
                    relatedId: payment.payment_id.toString()
                });
            }
        });

        // 2. การจองใหม่ล่าสุด
        const recentBookings = await prisma.reservations.findMany({
            where: {
                created_at: {
                    gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 ชั่วโมงที่ผ่านมา
                }
            },
            include: {
                users: {
                    select: {
                        first_name: true,
                        last_name: true,
                        username: true
                    }
                },
                reservation_items: {
                    include: {
                        courts: {
                            select: {
                                name: true,
                                facilities: {
                                    select: {
                                        name_th: true
                                    }
                                }
                            }
                        }
                    },
                    take: 1 // เอาแค่รายการแรก
                }
            },
            orderBy: {
                created_at: 'desc'
            },
            take: 5
        });

        // แปลงข้อมูล bookings เป็น activities
        recentBookings.forEach(booking => {
            const user = booking.users;
            const userName = user ? `${user.first_name} ${user.last_name}`.trim() : 'ไม่ระบุ';
            const court = booking.reservation_items[0]?.courts;
            const facility = court?.facilities?.name_th || 'ไม่ระบุ';
            const courtName = court?.name || 'ไม่ระบุ';

            activities.push({
                type: 'booking_created',
                message: `การจองใหม่: ${userName} - ${facility} ${courtName}`,
                time: booking.created_at,
                icon: 'Calendar',
                color: 'tw-text-blue-600',
                relatedId: booking.reservation_id.toString()
            });
        });

        // 3. การยกเลิกการจอง
        const cancelledBookings = await prisma.reservations.findMany({
            where: {
                status: 'cancelled',
                updated_at: {
                    gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 ชั่วโมงที่ผ่านมา
                }
            },
            include: {
                users: {
                    select: {
                        first_name: true,
                        last_name: true,
                        username: true
                    }
                }
            },
            orderBy: {
                updated_at: 'desc'
            },
            take: 3
        });

        // แปลงข้อมูล cancelled bookings เป็น activities
        cancelledBookings.forEach(booking => {
            const user = booking.users;
            const userName = user ? `${user.first_name} ${user.last_name}`.trim() : 'ไม่ระบุ';

            activities.push({
                type: 'booking_cancelled',
                message: `ยกเลิกการจอง: ${userName}`,
                time: booking.updated_at,
                icon: 'XCircle',
                color: 'tw-text-orange-600',
                relatedId: booking.reservation_id.toString()
            });
        });

        // 4. ผู้ใช้ใหม่ที่สมัครล่าสุด
        const newUsers = await prisma.users.findMany({
            where: {
                registered_at: {
                    gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 ชั่วโมงที่ผ่านมา
                }
            },
            orderBy: {
                registered_at: 'desc'
            },
            take: 3
        });

        // แปลงข้อมูล new users เป็น activities
        newUsers.forEach(user => {
            const userName = `${user.first_name} ${user.last_name}`.trim();
            const roleText = user.role === 'student' ? 'นิสิต' :
                user.role === 'staff' ? 'บุคลากร' :
                    user.role === 'admin' ? 'ผู้ดูแลระบบ' : 'บุคคลภายนอก';

            activities.push({
                type: 'user_registered',
                message: `สมาชิกใหม่: ${userName} (${roleText})`,
                time: user.registered_at,
                icon: 'Users',
                color: 'tw-text-purple-600',
                relatedId: user.user_id.toString()
            });
        });

        // เรียงลำดับตามเวลาและจำกัดจำนวน
        const sortedActivities = activities
            .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
            .slice(0, limit)
            .map(activity => ({
                ...activity,
                timeAgo: getTimeAgo(activity.time)
            }));

        return successResponse({
            activities: sortedActivities,
            total: sortedActivities.length,
            lastUpdated: new Date().toISOString()
        }, 'ดึงข้อมูลกิจกรรมล่าสุดสำเร็จ');

    } catch (error) {
        if (error instanceof CustomApiError) {
            throw error;
        }

        console.error('Activities error:', error);
        throw new CustomApiError(
            ERROR_CODES.INTERNAL_SERVER_ERROR,
            'เกิดข้อผิดพลาดในการดึงข้อมูลกิจกรรม',
            HTTP_STATUS.INTERNAL_SERVER_ERROR
        );
    }
}

// Helper function สำหรับคำนวณเวลาที่ผ่านมา
function getTimeAgo(date: Date): string {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - new Date(date).getTime()) / 1000);

    if (diffInSeconds < 60) {
        return 'เมื่อสักครู่';
    } else if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        return `${minutes} นาทีที่แล้ว`;
    } else if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        return `${hours} ชั่วโมงที่แล้ว`;
    } else {
        const days = Math.floor(diffInSeconds / 86400);
        return `${days} วันที่แล้ว`;
    }
}

export const GET = withErrorHandler(activitiesHandler);