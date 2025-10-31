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

async function bookingActionHandler(request: NextRequest, { params }: { params: { id: string } }) {
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

        const reservationId = params.id;
        const body = await request.json();
        const { action, notes } = body;

        if (!action || !['confirm', 'cancel'].includes(action)) {
            throw new CustomApiError(
                ERROR_CODES.VALIDATION_ERROR,
                'กรุณาระบุการดำเนินการที่ถูกต้อง (confirm หรือ cancel)',
                HTTP_STATUS.BAD_REQUEST
            );
        }

        // ตรวจสอบว่า reservation มีอยู่จริง
        const reservation = await prisma.reservations.findUnique({
            where: {
                reservation_id: BigInt(reservationId)
            },
            include: {
                users: {
                    select: {
                        user_id: true,
                        first_name: true,
                        last_name: true,
                        email: true
                    }
                }
            }
        });

        if (!reservation) {
            throw new CustomApiError(
                ERROR_CODES.NOT_FOUND,
                'ไม่พบข้อมูลการจอง',
                HTTP_STATUS.NOT_FOUND
            );
        }

        if (reservation.status !== 'pending') {
            throw new CustomApiError(
                ERROR_CODES.VALIDATION_ERROR,
                'การจองนี้ได้รับการดำเนินการแล้ว',
                HTTP_STATUS.BAD_REQUEST
            );
        }

        // เริ่ม transaction
        const result = await prisma.$transaction(async (tx) => {
            let updatedReservation;

            if (action === 'confirm') {
                // ยืนยันการจอง
                updatedReservation = await tx.reservations.update({
                    where: {
                        reservation_id: BigInt(reservationId)
                    },
                    data: {
                        status: 'confirmed',
                        confirmed_at: new Date(),
                        note: notes || reservation.note,
                        updated_at: new Date()
                    }
                });

                // ส่งการแจ้งเตือนให้ผู้ใช้ (ถ้ามี notification system)
                console.log(`Booking ${reservationId} confirmed by admin ${session.user.id}`);

            } else if (action === 'cancel') {
                // ยกเลิกการจอง
                updatedReservation = await tx.reservations.update({
                    where: {
                        reservation_id: BigInt(reservationId)
                    },
                    data: {
                        status: 'cancelled',
                        cancelled_at: new Date(),
                        note: notes || reservation.note,
                        updated_at: new Date()
                    }
                });

                // ส่งการแจ้งเตือนให้ผู้ใช้ (ถ้ามี notification system)
                console.log(`Booking ${reservationId} cancelled by admin ${session.user.id}`);
            }

            return updatedReservation;
        });

        const actionText = action === 'confirm' ? 'ยืนยัน' : 'ยกเลิก';

        return successResponse({
            reservation_id: result?.reservation_id.toString(),
            status: result?.status,
            action: action,
            updated_at: result?.updated_at
        }, `${actionText}การจองสำเร็จ`);

    } catch (error) {
        if (error instanceof CustomApiError) {
            throw error;
        }

        console.error('Booking action error:', error);
        throw new CustomApiError(
            ERROR_CODES.INTERNAL_SERVER_ERROR,
            'เกิดข้อผิดพลาดในการดำเนินการ',
            HTTP_STATUS.INTERNAL_SERVER_ERROR
        );
    }
}

export const PATCH = withErrorHandler(bookingActionHandler);