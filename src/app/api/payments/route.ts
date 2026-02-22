import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/Auth';
import { prisma } from '@/lib/prisma';
import {
    CustomApiError,
    ERROR_CODES,
    HTTP_STATUS,
    successResponse,
    withErrorHandler,
} from '@/lib/error-handler';
import { Prisma } from '@prisma/client';

// ── helpers ──────────────────────────────────────────────────────────────────

function parseBigIntId(value: unknown, fieldName: string): bigint {
    if (typeof value !== 'string' && typeof value !== 'number') {
        throw new CustomApiError(
            ERROR_CODES.VALIDATION_ERROR,
            `${fieldName} ต้องเป็นตัวเลข`,
            HTTP_STATUS.BAD_REQUEST
        );
    }
    const str = String(value).trim();
    if (!/^\d+$/.test(str)) {
        throw new CustomApiError(
            ERROR_CODES.VALIDATION_ERROR,
            `${fieldName} ไม่ถูกต้อง`,
            HTTP_STATUS.BAD_REQUEST
        );
    }
    return BigInt(str);
}

const ALLOWED_SLIP_HOSTS = (process.env.ALLOWED_SLIP_HOSTS ?? '').split(',').map(h => h.trim()).filter(Boolean);

function validateSlipUrl(url: unknown): string {
    if (typeof url !== 'string' || !url) {
        throw new CustomApiError(
            ERROR_CODES.VALIDATION_ERROR,
            'slip URL ไม่ถูกต้อง',
            HTTP_STATUS.BAD_REQUEST
        );
    }
    let parsed: URL;
    try {
        parsed = new URL(url);
    } catch {
        throw new CustomApiError(
            ERROR_CODES.VALIDATION_ERROR,
            'slip URL รูปแบบไม่ถูกต้อง',
            HTTP_STATUS.BAD_REQUEST
        );
    }
    // A08 — อนุญาตเฉพาะ https
    if (parsed.protocol !== 'https:') {
        throw new CustomApiError(
            ERROR_CODES.VALIDATION_ERROR,
            'slip URL ต้องเป็น HTTPS',
            HTTP_STATUS.BAD_REQUEST
        );
    }
    // A08 — ตรวจ domain whitelist (ถ้ากำหนดไว้)
    if (ALLOWED_SLIP_HOSTS.length > 0 && !ALLOWED_SLIP_HOSTS.includes(parsed.hostname)) {
        throw new CustomApiError(
            ERROR_CODES.VALIDATION_ERROR,
            'slip URL ไม่ได้รับอนุญาต',
            HTTP_STATUS.BAD_REQUEST
        );
    }
    return url;
}

/**
 * A03 — ตรวจสอบ amount เป็นตัวเลขบวก และไม่เกิน limit ที่สมเหตุสมผล
 */
function validateAmount(amount: unknown): number {
    const num = Number(amount);
    if (!Number.isFinite(num) || num <= 0) {
        throw new CustomApiError(
            ERROR_CODES.VALIDATION_ERROR,
            'จำนวนเงินต้องมากกว่า 0',
            HTTP_STATUS.BAD_REQUEST
        );
    }
    // กำหนด max ตามความเหมาะสมของระบบ (ตัวอย่าง: 1,000,000 บาท)
    if (num > 1_000_000) {
        throw new CustomApiError(
            ERROR_CODES.VALIDATION_ERROR,
            'จำนวนเงินเกินขีดจำกัด',
            HTTP_STATUS.BAD_REQUEST
        );
    }
    return num;
}

// ── POST — สร้าง / อัปเดต payment record หลังอัปโหลดสลิป ───────────────────

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

        // A03 — Validate ทุก field ก่อนใช้งาน
        if (!reservationId || !amount || !slipUrl) {
            throw new CustomApiError(
                ERROR_CODES.VALIDATION_ERROR,
                'ข้อมูลไม่ครบถ้วน',
                HTTP_STATUS.BAD_REQUEST
            );
        }

        const reservationBigId = parseBigIntId(reservationId, 'reservationId');
        const validatedAmount  = validateAmount(amount);
        const validatedSlipUrl = validateSlipUrl(slipUrl);
        const safeFilename     = typeof filename === 'string' ? filename.slice(0, 255) : undefined;

        // A01 — ตรวจสอบ ownership ของ reservation
        const reservation = await prisma.reservations.findFirst({
            where: {
                reservation_id: reservationBigId,
                user_id: BigInt(session.user.id),
            },
        });

        if (!reservation) {
            throw new CustomApiError(
                ERROR_CODES.NOT_FOUND,
                'ไม่พบข้อมูลการจอง',
                HTTP_STATUS.NOT_FOUND
            );
        }

        // ตรวจสอบว่ามี payment record อยู่แล้วหรือไม่ (with ownership check)
        const existingPayment = await prisma.payments.findFirst({
            where: {
                reservation_id: reservationBigId,
                reservations: {
                    user_id: BigInt(session.user.id),
                },
            },
        });

        const metaJson = {
            slip_url:    validatedSlipUrl,
            filename:    safeFilename,
            uploaded_at: new Date().toISOString(),
            user_id:     session.user.id,
        };

        // A04 — ใช้ transaction กัน data inconsistency
        const payment = await prisma.$transaction(async (tx) => {
            let p;

            if (existingPayment) {
                p = await tx.payments.update({
                    where: { payment_id: existingPayment.payment_id },
                    data: {
                        status:     'pending',
                        meta_json:  metaJson,
                        updated_at: new Date(),
                    },
                });
            } else {
                p = await tx.payments.create({
                    data: {
                        reservation_id: reservationBigId,
                        amount_cents:   Math.round(validatedAmount * 100),
                        currency:       'THB',
                        method:         'bank_transfer',
                        status:         'pending',
                        meta_json:      metaJson,
                    },
                });
            }

            // A01 — อัปเดต reservation ด้วย user_id filter ป้องกัน IDOR
            await tx.reservations.update({
                where: {
                    reservation_id: reservationBigId,
                    user_id:        BigInt(session.user.id), // ownership check
                },
                data: {
                    payment_status: 'partial',
                    updated_at:     new Date(),
                },
            });

            return p;
        });

        return successResponse(
            {
                payment_id:   payment.payment_id.toString(),
                status:       payment.status,
                amount_cents: payment.amount_cents,
                created_at:   payment.created_at.toISOString(),
            },
            'บันทึกข้อมูลการชำระเงินสำเร็จ'
        );

    } catch (error) {
        if (error instanceof CustomApiError) throw error;

        // A09 — log เฉพาะ message ไม่ expose stack trace ออก response
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[POST /payments][${new Date().toISOString()}]`, message);

        throw new CustomApiError(
            ERROR_CODES.INTERNAL_SERVER_ERROR,
            'เกิดข้อผิดพลาดในการบันทึกข้อมูลการชำระเงิน',
            HTTP_STATUS.INTERNAL_SERVER_ERROR
        );
    }
}

// ── GET — ดึงข้อมูล payment ของ user ────────────────────────────────────────

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
        const reservationIdParam = searchParams.get('reservationId');

        // A01 — user_id filter เสมอ ป้องกัน IDOR
        const whereCondition: Prisma.paymentsFindManyArgs['where'] = {
            reservations: {
                user_id: BigInt(session.user.id),
            },
        };

        // A03 — validate query param ก่อน BigInt()
        if (reservationIdParam !== null) {
            whereCondition.reservation_id = parseBigIntId(reservationIdParam, 'reservationId');
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
                                            select: { name_th: true },
                                        },
                                    },
                                },
                                time_slots: {
                                    select: {
                                        start_minute: true,
                                        end_minute:   true,
                                        label:        true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
            orderBy: { created_at: 'desc' },
        });

        const formattedPayments = payments.map((payment) => ({
            payment_id:     payment.payment_id.toString(),
            reservation_id: payment.reservation_id.toString(),
            amount_cents:   payment.amount_cents,
            currency:       payment.currency,
            status:         payment.status,
            method:         payment.method,
            slip_url:       payment.meta_json ? (payment.meta_json as Record<string, unknown>)?.slip_url as string ?? null : null,
            created_at:     payment.created_at.toISOString(),
            updated_at:     payment.updated_at.toISOString(),
            reservation: {
                status:         payment.reservations?.status,
                payment_status: payment.reservations?.payment_status,
                reserved_date:  payment.reservations?.reserved_date?.toISOString().split('T')[0],
                total_cents:    payment.reservations?.total_cents,
            },
        }));

        return successResponse(formattedPayments, 'ดึงข้อมูลการชำระเงินสำเร็จ');

    } catch (error) {
        if (error instanceof CustomApiError) throw error;

        // A09 — log เฉพาะ message ไม่ expose stack trace ออก response
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[GET /payments][${new Date().toISOString()}]`, message);

        throw new CustomApiError(
            ERROR_CODES.INTERNAL_SERVER_ERROR,
            'เกิดข้อผิดพลาดในการดึงข้อมูลการชำระเงิน',
            HTTP_STATUS.INTERNAL_SERVER_ERROR
        );
    }
}

export const POST = withErrorHandler(createPaymentHandler);
export const GET  = withErrorHandler(getPaymentsHandler);