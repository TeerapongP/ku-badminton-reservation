import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/Auth';
import { CustomApiError, ERROR_CODES, HTTP_STATUS, successResponse, withErrorHandler } from '@/lib/error-handler';

// GET - ดึงข้อมูลการชำระเงินรายการเดียว
async function getPaymentHandler(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions);

        // ตรวจสอบสิทธิ์ admin
        if (!session?.user || !['admin', 'super_admin'].includes(session.user.role ?? "")) {
            throw new CustomApiError(
                ERROR_CODES.UNAUTHORIZED,
                'ไม่มีสิทธิ์เข้าถึง',
                HTTP_STATUS.FORBIDDEN
            );
        }

        const paymentId = params.id;

        // ดึงข้อมูล payment พร้อม relations
        const payment = await prisma.payments.findUnique({
            where: {
                payment_id: BigInt(paymentId)
            },
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
                                phone: true,
                                role: true
                            }
                        },
                        reservation_items: {
                            include: {
                                courts: {
                                    select: {
                                        court_id: true,
                                        name: true,
                                        court_code: true,
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
            }
        });

        if (!payment) {
            throw new CustomApiError(
                ERROR_CODES.NOT_FOUND,
                'ไม่พบข้อมูลการชำระเงิน',
                HTTP_STATUS.NOT_FOUND
            );
        }

        const reservation = payment.reservations;
        const user = reservation?.users;
        const reservationItems = reservation?.reservation_items || [];

        // จัดรูปแบบข้อมูลสนามและเวลา
        const bookingDetails = reservationItems.map((item: any) => {
            const startTime = item.time_slots?.start_minute ?
                `${Math.floor(item.time_slots.start_minute / 60).toString().padStart(2, '0')}:${(item.time_slots.start_minute % 60).toString().padStart(2, '0')}` : '';
            const endTime = item.time_slots?.end_minute ?
                `${Math.floor(item.time_slots.end_minute / 60).toString().padStart(2, '0')}:${(item.time_slots.end_minute % 60).toString().padStart(2, '0')}` : '';

            return {
                item_id: item.item_id?.toString(),
                facility_id: item.courts?.facilities?.facility_id?.toString(),
                facility_name: item.courts?.facilities?.name_th || 'ไม่ระบุ',
                court_id: item.courts?.court_id?.toString(),
                court_name: item.courts?.name || item.courts?.court_code || 'ไม่ระบุ',
                slot_id: item.time_slots?.slot_id?.toString(),
                play_date: item.play_date?.toISOString().split('T')[0],
                start_time: startTime,
                end_time: endTime,
                time_label: item.time_slots?.label || `${startTime} - ${endTime}`,
                price_cents: item.price_cents,
                status: item.status
            };
        });

        const formattedPayment = {
            payment_id: payment.payment_id.toString(),
            reservation_id: reservation?.reservation_id?.toString(),
            amount_cents: payment.amount_cents,
            currency: payment.currency,
            status: payment.status,
            method: payment.method,
            ref_code: payment.ref_code,
            paid_at: payment.paid_at?.toISOString(),
            created_at: payment.created_at.toISOString(),
            updated_at: payment.updated_at.toISOString(),
            slip_url: payment.meta_json ? (payment.meta_json as any)?.slip_url : null,
            slip_filename: payment.meta_json ? (payment.meta_json as any)?.filename : null,
            user: {
                user_id: user?.user_id?.toString(),
                username: user?.username,
                full_name: user ? `${user.first_name} ${user.last_name}`.trim() : 'ไม่ระบุ',
                first_name: user?.first_name,
                last_name: user?.last_name,
                email: user?.email,
                phone: user?.phone,
                role: user?.role
            },
            reservation: {
                reservation_id: reservation?.reservation_id?.toString(),
                status: reservation?.status,
                payment_status: reservation?.payment_status,
                reserved_date: reservation?.reserved_date?.toISOString().split('T')[0],
                subtotal_cents: reservation?.subtotal_cents,
                discount_cents: reservation?.discount_cents,
                total_cents: reservation?.total_cents,
                note: reservation?.note,
                created_at: reservation?.created_at?.toISOString(),
                confirmed_at: reservation?.confirmed_at?.toISOString(),
                cancelled_at: reservation?.cancelled_at?.toISOString()
            },
            booking_details: bookingDetails
        };

        return successResponse(formattedPayment, 'ดึงข้อมูลการชำระเงินสำเร็จ');

    } catch (error) {
        if (error instanceof CustomApiError) {
            throw error;
        }

        console.error('Get payment error:', error);
        throw new CustomApiError(
            ERROR_CODES.INTERNAL_SERVER_ERROR,
            'เกิดข้อผิดพลาดในการดึงข้อมูลการชำระเงิน',
            HTTP_STATUS.INTERNAL_SERVER_ERROR
        );
    }
}

// PUT - อัปเดตสถานะการชำระเงิน
async function updatePaymentHandler(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions);

        // ตรวจสอบสิทธิ์ admin
        if (!session?.user || !['admin', 'super_admin'].includes(session.user.role ?? "")) {
            throw new CustomApiError(
                ERROR_CODES.UNAUTHORIZED,
                'ไม่มีสิทธิ์เข้าถึง',
                HTTP_STATUS.FORBIDDEN
            );
        }

        const paymentId = params.id;
        const body = await request.json();
        const { status, note } = body;

        // ตรวจสอบ status ที่ส่งมา
        if (!['pending', 'succeeded', 'failed'].includes(status)) {
            throw new CustomApiError(
                ERROR_CODES.VALIDATION_ERROR,
                'สถานะการชำระเงินไม่ถูกต้อง',
                HTTP_STATUS.BAD_REQUEST
            );
        }

        // ตรวจสอบว่า payment มีอยู่จริง
        const existingPayment = await prisma.payments.findUnique({
            where: {
                payment_id: BigInt(paymentId)
            },
            include: {
                reservations: true
            }
        });

        if (!existingPayment) {
            throw new CustomApiError(
                ERROR_CODES.NOT_FOUND,
                'ไม่พบข้อมูลการชำระเงิน',
                HTTP_STATUS.NOT_FOUND
            );
        }

        // อัปเดต payment status
        const updatedPayment = await prisma.payments.update({
            where: {
                payment_id: BigInt(paymentId)
            },
            data: {
                status: status,
                paid_at: status === 'succeeded' ? new Date() : null,
                updated_at: new Date(),
                ...(note && {
                    meta_json: {
                        ...(existingPayment.meta_json as any || {}),
                        admin_note: note,
                        updated_by: session.user.username || session.user.id,
                        updated_at: new Date().toISOString()
                    }
                })
            }
        });

        // อัปเดต reservation status ตาม payment status
        if (existingPayment.reservations) {
            let reservationStatus = existingPayment.reservations.status;
            let paymentStatus = existingPayment.reservations.payment_status;

            if (status === 'succeeded') {
                paymentStatus = 'paid';
                if (reservationStatus === 'pending') {
                    reservationStatus = 'confirmed';
                }
            } else if (status === 'failed') {
                paymentStatus = 'unpaid';
                if (reservationStatus === 'confirmed') {
                    reservationStatus = 'cancelled';
                }
            }

            await prisma.reservations.update({
                where: {
                    reservation_id: existingPayment.reservations.reservation_id
                },
                data: {
                    status: reservationStatus,
                    payment_status: paymentStatus,
                    updated_at: new Date(),
                    ...(status === 'succeeded' && { confirmed_at: new Date() }),
                    ...(status === 'failed' && { cancelled_at: new Date() })
                }
            });
        }

        return successResponse({
            payment_id: updatedPayment.payment_id.toString(),
            status: updatedPayment.status,
            updated_at: updatedPayment.updated_at.toISOString()
        }, `${status === 'succeeded' ? 'อนุมัติ' : status === 'failed' ? 'ปฏิเสธ' : 'อัปเดต'}การชำระเงินสำเร็จ`);

    } catch (error) {
        if (error instanceof CustomApiError) {
            throw error;
        }

        console.error('Update payment error:', error);
        throw new CustomApiError(
            ERROR_CODES.INTERNAL_SERVER_ERROR,
            'เกิดข้อผิดพลาดในการอัปเดตการชำระเงิน',
            HTTP_STATUS.INTERNAL_SERVER_ERROR
        );
    }
}

export const GET = withErrorHandler(getPaymentHandler);
export const PUT = withErrorHandler(updatePaymentHandler);