import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/Auth';
import { CustomApiError, ERROR_CODES, HTTP_STATUS, successResponse, withErrorHandler } from '@/lib/error-handler';


async function bookingsHandler(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        // ตรวจสอบสิทธิ์ admin
        const ADMIN_ROLES = ['admin', 'super_admin'] as const;
        if (!session?.user || !ADMIN_ROLES.includes(session.user.role as any)) {
            throw new CustomApiError(
                ERROR_CODES.UNAUTHORIZED,
                'ไม่มีสิทธิ์เข้าถึง',
                HTTP_STATUS.FORBIDDEN
            );
        }

        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const search = searchParams.get('search') || '';
        const status = searchParams.get('status') || '';
        const paymentStatus = searchParams.get('paymentStatus') || '';
        const userRole = searchParams.get('userRole') || '';
        const startDate = searchParams.get('startDate') || '';
        const endDate = searchParams.get('endDate') || '';

        const skip = (page - 1) * limit;

        // สร้าง where condition
        const whereCondition: any = {};

        // เพิ่มเงื่อนไขการค้นหา
        if (search) {
            whereCondition.OR = [
                {
                    reservation_id: { contains: search, mode: 'insensitive' }
                },
                {
                    users: {
                        OR: [
                            { first_name: { contains: search, mode: 'insensitive' } },
                            { last_name: { contains: search, mode: 'insensitive' } },
                            { username: { contains: search, mode: 'insensitive' } },
                            { email: { contains: search, mode: 'insensitive' } }
                        ]
                    }
                },
                {
                    facilities: {
                        OR: [
                            { name_th: { contains: search, mode: 'insensitive' } },
                            { name_en: { contains: search, mode: 'insensitive' } }
                        ]
                    }
                }
            ];
        }

        // กรองตามสถานะ
        if (status && status !== 'all') {
            whereCondition.status = status;
        }

        // กรองตามสถานะการชำระเงิน
        if (paymentStatus && paymentStatus !== 'all') {
            whereCondition.payment_status = paymentStatus;
        }

        // กรองตามบทบาทผู้ใช้
        if (userRole && userRole !== 'all') {
            whereCondition.users = {
                ...whereCondition.users,
                role: userRole
            };
        }

        // กรองตามช่วงวันที่
        if (startDate || endDate) {
            whereCondition.reserved_date = {};
            if (startDate) {
                whereCondition.reserved_date.gte = new Date(startDate);
            }
            if (endDate) {
                whereCondition.reserved_date.lte = new Date(endDate);
            }
        }

        // ดึงข้อมูล reservations พร้อม relations
        const reservations = await prisma.reservations.findMany({
            where: whereCondition,
            include: {
                users: {
                    select: {
                        user_id: true,
                        username: true,
                        first_name: true,
                        last_name: true,
                        email: true,
                        phone: true,
                        role: true
                    }
                },
                facilities: {
                    select: {
                        facility_id: true,
                        name_th: true,
                        name_en: true
                    }
                },
                reservation_items: {
                    include: {
                        courts: {
                            select: {
                                court_id: true,
                                name: true,
                                court_code: true
                            }
                        },
                        time_slots: {
                            select: {
                                slot_id: true,
                                start_minute: true,
                                end_minute: true,
                                label: true
                            }
                        }
                    }
                }
            },
            orderBy: {
                created_at: 'desc'
            },
            skip,
            take: limit
        });

        // นับจำนวนทั้งหมด
        const totalCount = await prisma.reservations.count({
            where: whereCondition
        });

        // จัดรูปแบบข้อมูล
        const formattedBookings = reservations.map((reservation: any) => {
            const user = reservation.users;
            const facility = reservation.facilities;
            const reservationItems = reservation.reservation_items || [];

            // รวมข้อมูลคอร์ทและเวลา
            const courts = reservationItems.map((item: any) => ({
                court_name: item.courts?.name || 'ไม่ระบุ',
                court_code: item.courts?.court_code || 'ไม่ระบุ',
                time_slot: item.time_slots?.label ||
                    `${Math.floor((item.time_slots?.start_minute || 0) / 60).toString().padStart(2, '0')}:${((item.time_slots?.start_minute || 0) % 60).toString().padStart(2, '0')}-${Math.floor((item.time_slots?.end_minute || 0) / 60).toString().padStart(2, '0')}:${((item.time_slots?.end_minute || 0) % 60).toString().padStart(2, '0')}`
            }));

            // เอาคอร์ทแรกเป็นหลัก (ในกรณีที่มีหลายคอร์ท)
            const primaryCourt = courts[0] || { court_name: 'ไม่ระบุ', court_code: 'ไม่ระบุ', time_slot: 'ไม่ระบุ' };
            const timeSlots = courts.map((court: { time_slot: any; }) => court.time_slot);

            return {
                reservation_id: reservation.reservation_id.toString(),
                user_id: user?.user_id.toString() || '',
                user_name: user ? `${user.first_name} ${user.last_name}`.trim() : 'ไม่ระบุ',
                user_email: user?.email || '',
                user_phone: user?.phone || '',
                user_role: user?.role || 'guest',
                facility_name: facility?.name_th || 'ไม่ระบุ',
                court_name: primaryCourt.court_name,
                court_code: primaryCourt.court_code,
                play_date: reservation.reserved_date.toISOString().split('T')[0],
                time_slots: timeSlots,
                total_amount: reservation.total_cents / 100,
                currency: reservation.currency,
                status: reservation.status,
                payment_status: reservation.payment_status,
                created_at: reservation.created_at.toISOString(),
                confirmed_at: reservation.confirmed_at?.toISOString(),
                cancelled_at: reservation.cancelled_at?.toISOString(),
                notes: reservation.note
            };
        });

        // สถิติสำหรับ summary
        const summary = {
            total: totalCount,
            pending: await prisma.reservations.count({ where: { ...whereCondition, status: 'pending' } }),
            confirmed: await prisma.reservations.count({ where: { ...whereCondition, status: 'confirmed' } }),
            cancelled: await prisma.reservations.count({ where: { ...whereCondition, status: 'cancelled' } }),
            completed: await prisma.reservations.count({ where: { ...whereCondition, status: 'completed' } }),
            no_show: await prisma.reservations.count({ where: { ...whereCondition, status: 'no_show' } })
        };

        return successResponse({
            bookings: formattedBookings,
            pagination: {
                page,
                limit,
                total: totalCount,
                totalPages: Math.ceil(totalCount / limit),
                hasNext: page * limit < totalCount,
                hasPrev: page > 1
            },
            summary
        }, 'ดึงข้อมูลการจองสำเร็จ');

    } catch (error) {
        if (error instanceof CustomApiError) {
            throw error;
        }

        console.error('Bookings error:', error);
        throw new CustomApiError(
            ERROR_CODES.INTERNAL_SERVER_ERROR,
            'เกิดข้อผิดพลาดในการดึงข้อมูลการจอง',
            HTTP_STATUS.INTERNAL_SERVER_ERROR
        );
    }
}

export const GET = withErrorHandler(bookingsHandler);