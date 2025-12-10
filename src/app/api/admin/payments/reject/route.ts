import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/Auth';
import { CustomApiError, ERROR_CODES, HTTP_STATUS, successResponse, withErrorHandler } from '@/lib/error-handler';

async function rejectPaymentHandler(request: NextRequest) {
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

        const body = await request.json();
        const { payment_id, reason, notes } = body;

        if (!payment_id) {
            throw new CustomApiError(
                ERROR_CODES.VALIDATION_ERROR,
                'กรุณาระบุ payment_id',
                HTTP_STATUS.BAD_REQUEST
            );
        }

        if (!reason) {
            throw new CustomApiError(
                ERROR_CODES.VALIDATION_ERROR,
                'กรุณาระบุเหตุผลในการปฏิเสธ',
                HTTP_STATUS.BAD_REQUEST
            );
        }

        // ตรวจสอบว่า payment มีอยู่จริงและสถานะเป็น pending
        const payment = await prisma.payments.findUnique({
            where: {
                payment_id: BigInt(payment_id)
            },
            include: {
                reservations: {
                    include: {
                        users: {
                            select: {
                                user_id: true,
                                email: true,
                                first_name: true,
                                last_name: true
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

        if (payment.status !== 'pending') {
            throw new CustomApiError(
                ERROR_CODES.VALIDATION_ERROR,
                'การชำระเงินนี้ได้รับการดำเนินการแล้ว',
                HTTP_STATUS.BAD_REQUEST
            );
        }

        // เริ่ม transaction
        const result = await prisma.$transaction(async (tx) => {
            // อัปเดตสถานะ payment เป็น rejected
            const updatedPayment = await tx.payments.update({
                where: {
                    payment_id: BigInt(payment_id)
                },
                data: {
                    status: 'failed',
                    meta_json: {
                        ...(payment.meta_json as any || {}),
                        rejected_by: session.user.id,
                        rejected_at: new Date().toISOString(),
                        rejection_reason: reason,
                        admin_notes: notes || null
                    },
                    updated_at: new Date()
                }
            });

            // อัปเดตสถานะ reservation เป็น cancelled
            if (payment.reservations) {
                await tx.reservations.update({
                    where: {
                        reservation_id: payment.reservations.reservation_id
                    },
                    data: {
                        status: 'cancelled',
                        payment_status: 'unpaid',
                        updated_at: new Date()
                    }
                });

                // TODO: ส่งการแจ้งเตือนให้ผู้ใช้ (เมื่อมี notification system)
                console.log(`Payment ${payment_id} rejected for user ${payment.reservations?.users?.user_id}, reason: ${reason}`);
            }

            // Log the rejection action (simplified)
            console.log(`Payment ${payment_id} rejected by user ${session.user.id}, reason: ${reason}`);

            return updatedPayment;
        });

        return successResponse({
            payment_id: result.payment_id.toString(),
            status: result.status,
            rejected_at: (result.meta_json as any)?.rejected_at,
            rejected_by: (result.meta_json as any)?.rejected_by,
            rejection_reason: (result.meta_json as any)?.rejection_reason
        }, 'ปฏิเสธการชำระเงินสำเร็จ');

    } catch (error) {
        if (error instanceof CustomApiError) {
            throw error;
        }

        console.error('Reject payment error:', error);
        throw new CustomApiError(
            ERROR_CODES.INTERNAL_SERVER_ERROR,
            'เกิดข้อผิดพลาดในการปฏิเสธการชำระเงิน',
            HTTP_STATUS.INTERNAL_SERVER_ERROR
        );
    }
}

export const POST = withErrorHandler(rejectPaymentHandler);