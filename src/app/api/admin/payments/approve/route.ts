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

async function approvePaymentHandler(request: NextRequest) {
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

        const body = await request.json();
        const { payment_id, notes } = body;

        if (!payment_id) {
            throw new CustomApiError(
                ERROR_CODES.VALIDATION_ERROR,
                'กรุณาระบุ payment_id',
                HTTP_STATUS.BAD_REQUEST
            );
        }

        // ตรวจสอบว่า payment มีอยู่จริงและสถานะเป็น pending
        const payment = await prisma.payments.findUnique({
            where: {
                payment_id: BigInt(payment_id)
            },
            include: {
                reservations: true
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
            // อัปเดตสถานะ payment เป็น approved
            const updatedPayment = await tx.payments.update({
                where: {
                    payment_id: BigInt(payment_id)
                },
                data: {
                    status: 'succeeded',
                    paid_at: new Date(),
                    meta_json: {
                        ...(payment.meta_json as any || {}),
                        approved_by: session.user.id,
                        approved_at: new Date().toISOString(),
                        admin_notes: notes || null
                    },
                    updated_at: new Date()
                }
            });

            // อัปเดตสถานะ reservation เป็น confirmed และ payment_status เป็น paid
            if (payment.reservations) {
                await tx.reservations.update({
                    where: {
                        reservation_id: payment.reservations.reservation_id
                    },
                    data: {
                        status: 'confirmed',
                        payment_status: 'paid',
                        updated_at: new Date()
                    }
                });
            }

            // Log the approval action (simplified)
            console.log(`Payment ${payment_id} approved by user ${session.user.id}`);

            return updatedPayment;
        });

        return successResponse({
            payment_id: result.payment_id.toString(),
            status: result.status,
            paid_at: result.paid_at,
            approved_by: (result.meta_json as any)?.approved_by
        }, 'อนุมัติการชำระเงินสำเร็จ');

    } catch (error) {
        if (error instanceof CustomApiError) {
            throw error;
        }

        console.error('Approve payment error:', error);
        throw new CustomApiError(
            ERROR_CODES.INTERNAL_SERVER_ERROR,
            'เกิดข้อผิดพลาดในการอนุมัติการชำระเงิน',
            HTTP_STATUS.INTERNAL_SERVER_ERROR
        );
    }
}

export const POST = withErrorHandler(approvePaymentHandler);