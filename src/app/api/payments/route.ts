import { NextRequest } from 'next/server';
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

// POST - สร้าง payment record หลังจากอัปโหลดสลิป
async function createPaymentHandler(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            throw new CustomApiError(
                ERROR_CODES.UNAUTHORIZED,
                'กรุณาเข้าสู่ระบบ',
                HTTP_STATUS.UNAUTHORIZED
            );
        }

        const body = await request.json();
        const { reservationId, amount, slipUrl, filename } = body;

        // Validate required fields
        if (!reservationId || !amount || !slipUrl) {
            throw new CustomApiError(
                ERROR_CODES.VALIDATION_ERROR,
                'ข้อมูลไม่ครบถ้วน',
                HTTP_STATUS.BAD_REQUEST
            );
        }

        // ตรวจสอบว่า reservation มีอยู่จริงและเป็นของ user นี้
        const reservation = await prisma.reservations.findFirst({
            where: {
                reservation_id: BigInt(reservationId),
                user_id: BigInt(session.user.id)
            }
        });

        if (!reservation) {
            throw new CustomApiError(
                ERROR_CODES.NOT_FOUND,
                'ไม่พบข้อมูลการจอง',
                HTTP_STATUS.NOT_FOUND
            );
        }

        // ตรวจสอบว่ามี payment record อยู่แล้วหรือไม่
        const existingPayment = await prisma.payments.findFirst({
            where: {
                reservation_id: BigInt(reservationId)
            }
        });

        let payment;

        if (existingPayment) {
            // อัปเดต payment record ที่มีอยู่
            payment = await prisma.payments.update({
                where: {
                    payment_id: existingPayment.payment_id
                },
                data: {
                    status: 'pending',
                    meta_json: {
                        slip_url: slipUrl,
                        filename: filename,
                        uploaded_at: new Date().toISOString(),
                        user_id: session.user.id
                    },
                    updated_at: new Date()
                }
            });
        } else {
            // สร้าง payment record ใหม่
            payment = await prisma.payments.create({
                data: {
                    reservation_id: BigInt(reservationId),
                    amount_cents: Math.round(Number(amount) * 100), // แปลงเป็น cents
                    currency: 'THB',
                    method: 'bank_transfer',
                    status: 'pending',
                    meta_json: {
                        slip_url: slipUrl,
                        filename: filename,
                        uploaded_at: new Date().toISOString(),
                        user_id: session.user.id
                    }
                }
            });
        }

        // อัปเดต reservation status
        await prisma.reservations.update({
            where: {
                reservation_id: BigInt(reservationId)
            },
            data: {
                payment_status: 'partial', // รอการตรวจสอบ
                updated_at: new Date()
            }
        });

        return successResponse({
            payment_id: payment.payment_id.toString(),
            status: payment.status,
            amount_cents: payment.amount_cents,
            created_at: payment.created_at.toISOString()
        }, 'บันทึกข้อมูลการชำระเงินสำเร็จ');

    } catch (error) {
        if (error instanceof CustomApiError) {
            throw error;
        }

        console.error('Create payment error:', error);
        throw new CustomApiError(
            ERROR_CODES.INTERNAL_SERVER_ERROR,
            'เกิดข้อผิดพลาดในการบันทึกข้อมูลการชำระเงิน',
            HTTP_STATUS.INTERNAL_SERVER_ERROR
        );
    }
}

// GET - ดึงข้อมูล payment ของ user
async function getPaymentsHandler(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            throw new CustomApiError(
                ERROR_CODES.UNAUTHORIZED,
                'กรุณาเข้าสู่ระบบ',
                HTTP_STATUS.UNAUTHORIZED
            );
        }

        const { searchParams } = new URL(request.url);
        const reservationId = searchParams.get('reservationId');

        let whereCondition: any = {
            reservations: {
                user_id: BigInt(session.user.id)
            }
        };

        if (reservationId) {
            whereCondition.reservation_id = BigInt(reservationId);
        }

        const payments = await prisma.payments.findMany({
            where: whereCondition,
            include: {
                reservations: {
                    include: {
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
                                },
                                time_slots: {
                                    select: {
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
            }
        });

        const formattedPayments = payments.map(payment => ({
            payment_id: payment.payment_id.toString(),
            reservation_id: payment.reservation_id.toString(),
            amount_cents: payment.amount_cents,
            currency: payment.currency,
            status: payment.status,
            method: payment.method,
            slip_url: payment.meta_json ? (payment.meta_json as any)?.slip_url : null,
            created_at: payment.created_at.toISOString(),
            updated_at: payment.updated_at.toISOString(),
            reservation: {
                status: payment.reservations?.status,
                payment_status: payment.reservations?.payment_status,
                reserved_date: payment.reservations?.reserved_date?.toISOString().split('T')[0],
                total_cents: payment.reservations?.total_cents
            }
        }));

        return successResponse(formattedPayments, 'ดึงข้อมูลการชำระเงินสำเร็จ');

    } catch (error) {
        if (error instanceof CustomApiError) {
            throw error;
        }

        console.error('Get payments error:', error);
        throw new CustomApiError(
            ERROR_CODES.INTERNAL_SERVER_ERROR,
            'เกิดข้อผิดพลาดในการดึงข้อมูลการชำระเงิน',
            HTTP_STATUS.INTERNAL_SERVER_ERROR
        );
    }
}

export const POST = withErrorHandler(createPaymentHandler);
export const GET = withErrorHandler(getPaymentsHandler);