import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/Auth';
import { prisma } from '@/lib/prisma';
import { CustomApiError, ERROR_CODES, HTTP_STATUS, successResponse, withErrorHandler } from '@/lib/error-handler';

async function paymentsHandler(request: NextRequest) {
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
        const status = searchParams.get('status') || 'pending';
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const search = searchParams.get('search') || '';

        const skip = (page - 1) * limit;

        // สร้าง where condition
        const whereCondition: any = {
            status: status
        };

        // เพิ่มเงื่อนไขการค้นหา
        if (search) {
            whereCondition.OR = [
                {
                    reservations: {
                        users: {
                            OR: [
                                { first_name: { contains: search, mode: 'insensitive' } },
                                { last_name: { contains: search, mode: 'insensitive' } },
                                { username: { contains: search, mode: 'insensitive' } },
                                { email: { contains: search, mode: 'insensitive' } }
                            ]
                        }
                    }
                },
                {
                    ref_code: { contains: search, mode: 'insensitive' }
                }
            ];
        }

        // ดึงข้อมูล payments พร้อม relations
        const payments = await prisma.payments.findMany({
            where: whereCondition,
            include: {
                reservations: {
                    include: {
                        users: {
                            select: {
                                user_id: true,
                                username: true,
                                first_name: true,
                                last_name: true,
                                email: true,
                                role: true
                            }
                        },
                        reservation_items: {
                            include: {
                                courts: {
                                    select: {
                                        court_id: true,
                                        name: true,
                                        facilities: {
                                            select: {
                                                facility_id: true,
                                                name_th: true,
                                                name_en: true
                                            }
                                        }
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
        const totalCount = await prisma.payments.count({
            where: whereCondition
        });

        // จัดรูปแบบข้อมูล
        const formattedPayments = payments.map((payment: any) => {
            const reservation = payment.reservations;
            const user = reservation?.users;
            const reservationItems = reservation?.reservation_items || [];

            // รวมข้อมูลสนามและคอร์ท
            const facilities = reservationItems.map((item: any) => {
                // แปลง minute เป็น time format
                const startTime = item.time_slots?.start_minute ?
                    `${Math.floor(item.time_slots.start_minute / 60).toString().padStart(2, '0')}:${(item.time_slots.start_minute % 60).toString().padStart(2, '0')}` : '';
                const endTime = item.time_slots?.end_minute ?
                    `${Math.floor(item.time_slots.end_minute / 60).toString().padStart(2, '0')}:${(item.time_slots.end_minute % 60).toString().padStart(2, '0')}` : '';

                return {
                    facility_id: item.courts?.facilities?.facility_id?.toString() || '',
                    facility_name: item.courts?.facilities?.name_th || 'ไม่ระบุ',
                    court_id: item.courts?.court_id?.toString() || '',
                    court_name: item.courts?.name || 'ไม่ระบุ',
                    slot_id: item.time_slots?.slot_id?.toString() || '',
                    play_date: item.play_date?.toISOString().split('T')[0] || '',
                    start_time: startTime,
                    end_time: endTime,
                    price_cents: item.price_cents || 0
                };
            });

            return {
                payment_id: payment.payment_id.toString(),
                reservation_id: reservation?.reservation_id?.toString() || '',
                user_id: user?.user_id?.toString() || '',
                user_name: user ? `${user.first_name} ${user.last_name}`.trim() : 'ไม่ระบุ',
                user_email: user?.email || '',
                username: user?.username || '',
                user_role: user?.role || '',
                amount_cents: payment.amount_cents,
                currency: payment.currency,
                status: payment.status,
                payment_method: payment.method,
                slip_url: payment.meta_json ? (payment.meta_json as any)?.slip_url : null,
                uploaded_at: payment.created_at.toISOString(),
                updated_at: payment.updated_at.toISOString(),
                booking_details: {
                    facilities: facilities,
                    total_amount: reservation?.total_cents || 0,
                    booking_date: reservation?.created_at?.toISOString() || '',
                    reservation_status: reservation?.status || ''
                }
            };
        });

        return successResponse({
            payments: formattedPayments,
            pagination: {
                page,
                limit,
                total: totalCount,
                totalPages: Math.ceil(totalCount / limit),
                hasNext: page * limit < totalCount,
                hasPrev: page > 1
            },
            summary: {
                pending: await prisma.payments.count({ where: { status: 'pending' } }),
                approved: await prisma.payments.count({ where: { status: 'succeeded' } }),
                rejected: await prisma.payments.count({ where: { status: 'failed' } }),
                total: await prisma.payments.count()
            }
        }, 'ดึงข้อมูลการชำระเงินสำเร็จ');

    } catch (error) {
        if (error instanceof CustomApiError) {
            throw error;
        }

        console.error('Payments error:', error);
        throw new CustomApiError(
            ERROR_CODES.INTERNAL_SERVER_ERROR,
            'เกิดข้อผิดพลาดในการดึงข้อมูลการชำระเงิน',
            HTTP_STATUS.INTERNAL_SERVER_ERROR
        );
    }
}

export const GET = withErrorHandler(paymentsHandler);