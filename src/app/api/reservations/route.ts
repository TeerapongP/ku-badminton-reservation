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
    
    // ตรวจสอบความถูกต้องของวันที่
    const date = new Date(`${value}T00:00:00.000Z`);
    if (isNaN(date.getTime())) {
        throw new Error('VALIDATION:วันที่ไม่ถูกต้อง');
    }

    // Get current date in Thailand (YYYY-MM-DD format)
    const thTodayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
    
    if (value < thTodayStr) {
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

        // A04 — ดึงราคาและนโยบายจาก Database (แทนที่ Hardcoded)
        const result = await prisma.$transaction(async (tx) => {
            // 1. ตรวจสอบนโยบายการจอง (Booking Policy)
            const policy = await tx.booking_policies.findFirst({
                where: { facility_id: court.facility_id, active: true },
                orderBy: { created_at: 'desc' }
            });

            if (policy) {
                const userBookingsToday = await tx.reservation_items.count({
                    where: {
                        reservations: { user_id: BigInt(session.user.id) },
                        play_date: parsedDate,
                        status: 'reserved'
                    }
                });

                if (userBookingsToday >= policy.max_slots_per_user_per_day) {
                    throw new Error(`POLICY:คุณจองเกินโควต้าสูงสุด (${policy.max_slots_per_user_per_day} สนามต่อวัน)`);
                }
            }

            // 2. ดึงราคาจาก Pricing Rules
            const pricing = await tx.pricing_rules.findFirst({
                where: {
                    facility_id: court.facility_id,
                    active: true,
                }
            });
            const priceCents = pricing?.price_cents ?? 10000; // Default 100 THB

            // 3. ป้องกัน Race Condition
            const existingReservation = await tx.reservation_items.findFirst({
                where: {
                    court_id:  courtBigId,
                    slot_id:   slotBigId,
                    play_date: parsedDate,
                    status:    'reserved',
                },
            });

            if (existingReservation) {
                throw new Error('CONFLICT:ช่วงเวลานี้ถูกจองแล้ว');
            }

            // 4. สร้างการจอง
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

            return { reservation, reservationItem };
        });

        return NextResponse.json({
            success: true,
            message: 'สร้างการจองสำเร็จ',
            data: {
                reservation_id: result.reservation.reservation_id.toString(),
                status:         'pending',
                amount:         result.reservation.total_cents / 100,
                booking_date:   bookingDate,
            },
        }, { status: 201 });

    } catch (error: any) {
        // A09 — Sanitized Logging ป้องกัน Log Injection
        const sanitizedMsg = error.message.replace(/[\n\r]/g, "").substring(0, 200);
        console.error(`[POST /reservations][${new Date().toISOString()}] User:${session?.user?.id} Error:${sanitizedMsg}`);

        if (error.message.startsWith('POLICY:') || error.message.startsWith('CONFLICT:')) {
            return NextResponse.json(
                { success: false, error: error.message.split(':')[1] },
                { status: 409 }
            );
        }

        return NextResponse.json(
            { success: false, error: 'เกิดข้อผิดพลาดในการสร้างการจอง' },
            { status: 500 }
        );
    }
}

        