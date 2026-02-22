import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { checkBookingSystemStatus } from '@/middleware/bookingSystemCheck';
import { prisma } from '@/lib/prisma';

// ── helpers ──────────────────────────────────────────────────────────────────

/**
 * A03 — ตรวจสอบ positive integer string ก่อน BigInt()
 */
function parseBigIntId(value: unknown, fieldName: string): bigint {
    const str = String(value ?? '').trim();
    if (!/^\d+$/.test(str) || str === '0') {
        throw new Error(`VALIDATION:${fieldName} ไม่ถูกต้อง`);
    }
    return BigInt(str);
}

/**
 * A03 — ตรวจสอบ bookingDate เป็น YYYY-MM-DD และไม่ใช่วันในอดีต
 */
function validateBookingDate(value: unknown): Date {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        throw new Error('VALIDATION:รูปแบบวันที่ไม่ถูกต้อง (YYYY-MM-DD)');
    }
    const date = new Date(`${value}T00:00:00.000Z`);
    if (isNaN(date.getTime())) {
        throw new Error('VALIDATION:วันที่ไม่ถูกต้อง');
    }
    // ไม่อนุญาตจองวันในอดีต
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    if (date < today) {
        throw new Error('VALIDATION:ไม่สามารถจองวันที่ผ่านมาแล้วได้');
    }
    return date;
}

/**
 * A08 — ตรวจสอบ slipUrl ต้องเป็น HTTPS จาก domain ที่อนุญาต
 */
const ALLOWED_SLIP_HOSTS = (process.env.ALLOWED_SLIP_HOSTS ?? '')
    .split(',')
    .map((h) => h.trim())
    .filter(Boolean);

function validateSlipUrl(url: unknown): string | null {
    if (!url) return null;
    if (typeof url !== 'string') throw new Error('VALIDATION:slipUrl ไม่ถูกต้อง');

    let parsed: URL;
    try {
        parsed = new URL(url);
    } catch {
        throw new Error('VALIDATION:slipUrl รูปแบบไม่ถูกต้อง');
    }
    if (parsed.protocol !== 'https:') {
        throw new Error('VALIDATION:slipUrl ต้องเป็น HTTPS');
    }
    if (ALLOWED_SLIP_HOSTS.length > 0 && !ALLOWED_SLIP_HOSTS.includes(parsed.hostname)) {
        throw new Error('VALIDATION:slipUrl ไม่ได้รับอนุญาต');
    }
    return url;
}

// ── POST — สร้างการจอง ───────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
    try {
        // A01 — ตรวจสอบ auth ก่อนเสมอ ก่อน business logic อื่นๆ
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json(
                { success: false, error: 'กรุณาเข้าสู่ระบบ' },
                { status: 401 }
            );
        }

        // A01 — ตรวจสอบสถานะระบบหลังจาก auth ผ่านแล้ว
        const isSystemOpen = await checkBookingSystemStatus();
        if (!isSystemOpen) {
            return NextResponse.json(
                {
                    success: false,
                    error:   'ระบบการจองปิดอยู่ในขณะนี้',
                    message: 'ระบบเปิดให้บริการเวลา 8:00-20:00 น. กรุณาติดต่อแอดมินหากต้องการใช้งานนอกเวลา',
                },
                { status: 403 }
            );
        }

        const body = await request.json();
        const { courtId, slotId, bookingDate, slipUrl } = body;

        // A03 — Validate required fields มีครบก่อน
        if (!courtId || !slotId || !bookingDate) {
            return NextResponse.json(
                { success: false, error: 'ข้อมูลไม่ครบถ้วน' },
                { status: 400 }
            );
        }

        // A03 — Validate และ parse ทุก input ก่อนใช้งาน
        let courtBigId: bigint;
        let slotBigId: bigint;
        let parsedDate: Date;
        let safeSlipUrl: string | null;

        try {
            courtBigId   = parseBigIntId(courtId, 'courtId');
            slotBigId    = parseBigIntId(slotId, 'slotId');
            parsedDate   = validateBookingDate(bookingDate);
            safeSlipUrl  = validateSlipUrl(slipUrl);
        } catch (error) {
            const message = error instanceof Error ? error.message.replace('VALIDATION:', '') : 'ข้อมูลไม่ถูกต้อง';
            return NextResponse.json(
                { success: false, error: message },
                { status: 400 }
            );
        }

        // ดึงข้อมูลสนาม
        const court = await prisma.courts.findUnique({
            where: { court_id: courtBigId },
            include: {
                facilities: {
                    select: { facility_id: true, name_th: true },
                },
            },
        });

        if (!court) {
            return NextResponse.json(
                { success: false, error: 'ไม่พบข้อมูลสนาม' },
                { status: 404 }
            );
        }

        // ดึงข้อมูล time slot
        const timeSlot = await prisma.time_slots.findUnique({
            where: { slot_id: slotBigId },
        });

        if (!timeSlot) {
            return NextResponse.json(
                { success: false, error: 'ไม่พบข้อมูลช่วงเวลา' },
                { status: 404 }
            );
        }

        const pricePerHour = 100; // TODO: ดึงจาก pricing rules
        const priceCents   = pricePerHour * 100;

        // A04 — ย้าย availability check เข้าใน transaction เดียวกัน
        // ป้องกัน race condition จอง slot เดียวกันพร้อมกัน
        const result = await prisma.$transaction(async (tx) => {
            // check + create อยู่ใน transaction เดียว
            const existingReservation = await tx.reservation_items.findFirst({
                where: {
                    court_id:  courtBigId,
                    slot_id:   slotBigId,
                    play_date: parsedDate,
                    status:    { in: ['reserved'] },
                },
            });

            if (existingReservation) {
                throw new Error('CONFLICT:ช่วงเวลานี้ถูกจองแล้ว');
            }

            // สร้าง reservation
            const reservation = await tx.reservations.create({
                data: {
                    user_id:        BigInt(session.user.id),
                    facility_id:    court.facilities.facility_id,
                    status:         'pending',
                    payment_status: 'unpaid',
                    reserved_date:  parsedDate,
                    subtotal_cents: priceCents,
                    total_cents:    priceCents,
                    currency:       'THB',
                },
            });

            // สร้าง reservation item
            const reservationItem = await tx.reservation_items.create({
                data: {
                    reservation_id: reservation.reservation_id,
                    court_id:       courtBigId,
                    slot_id:        slotBigId,
                    play_date:      parsedDate,
                    price_cents:    priceCents,
                    currency:       'THB',
                    status:         'reserved',
                },
            });

            // สร้าง payment record (ถ้ามี slip)
            let payment = null;
            if (safeSlipUrl) {
                payment = await tx.payments.create({
                    data: {
                        reservation_id: reservation.reservation_id,
                        amount_cents:   priceCents,
                        currency:       'THB',
                        method:         'bank_transfer',
                        status:         'pending',
                        meta_json: {
                            slip_url:    safeSlipUrl,
                            uploaded_by: session.user.id,
                            uploaded_at: new Date().toISOString(),
                        },
                    },
                });
            }

            return { reservation, reservationItem, payment };
        });

        return NextResponse.json({
            success: true,
            message: 'สร้างการจองสำเร็จ',
            data: {
                reservation_id: result.reservation.reservation_id.toString(),
                payment_id:     result.payment?.payment_id.toString() ?? null,
                status:         'pending',
                amount:         pricePerHour,
                booking_date:   bookingDate,
                court_name:     court.name || `Court ${court.court_code}`,
                facility_name:  court.facilities.name_th,
            },
        });

    } catch (error) {
        // ดักจับ CONFLICT error จาก transaction
        if (error instanceof Error && error.message.startsWith('CONFLICT:')) {
            return NextResponse.json(
                { success: false, error: error.message.replace('CONFLICT:', '') },
                { status: 409 }
            );
        }

        // A09 — log เฉพาะ message ไม่ expose stack trace ออก response
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[POST /reservations][${new Date().toISOString()}]`, message);

        return NextResponse.json(
            { success: false, error: 'เกิดข้อผิดพลาดในการสร้างการจอง' },
            { status: 500 }
        );
    }
}