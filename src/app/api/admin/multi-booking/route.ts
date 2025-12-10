import { NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { withMiddleware } from '@/lib/api-middleware';
import { authOptions } from '@/lib/Auth';
import { CustomApiError, ERROR_CODES, HTTP_STATUS, successResponse, withErrorHandler } from '@/lib/error-handler';


const prisma = new PrismaClient();

// POST - สร้างการจองหลายสนาม
async function createMultiBookingHandler(req: NextRequest) {
    const session = await getServerSession(authOptions);
    
    if (!session || (session.user.role !== "admin" && session.user.role !== "super_admin")) {
        throw new CustomApiError(
            ERROR_CODES.UNAUTHORIZED,
            'ไม่มีสิทธิ์เข้าถึง',
            HTTP_STATUS.UNAUTHORIZED
        );
    }

    const body = await req.json();
    const { 
        facility_id, 
        court_ids, 
        booking_date, 
        start_time, 
        end_time, 
        note,
        user_id // ระบุผู้ใช้ที่จะจอง (optional, ถ้าไม่ระบุจะใช้ admin ที่ทำการจอง)
    } = body;

    // Validation
    if (!facility_id || !court_ids || !Array.isArray(court_ids) || court_ids.length === 0 || !booking_date || !start_time || !end_time) {
        throw new CustomApiError(
            ERROR_CODES.MISSING_REQUIRED_FIELDS,
            'กรุณากรอกข้อมูลที่จำเป็น',
            HTTP_STATUS.BAD_REQUEST
        );
    }

    // ตรวจสอบวันที่และเวลา
    const bookingDateObj = new Date(booking_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (bookingDateObj < today) {
        throw new CustomApiError(
            ERROR_CODES.INVALID_PARAMETERS,
            'ไม่สามารถจองย้อนหลังได้',
            HTTP_STATUS.BAD_REQUEST
        );
    }

    // แปลงเวลาเป็นนาที
    const [startHour, startMinute] = start_time.split(':').map(Number);
    const [endHour, endMinute] = end_time.split(':').map(Number);
    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;

    if (startMinutes >= endMinutes) {
        throw new CustomApiError(
            ERROR_CODES.INVALID_PARAMETERS,
            'เวลาเริ่มต้นต้องน้อยกว่าเวลาสิ้นสุด',
            HTTP_STATUS.BAD_REQUEST
        );
    }

    // ตรวจสอบว่า facility มีอยู่จริง
    const facility = await prisma.facilities.findUnique({
        where: { facility_id: BigInt(facility_id) }
    });

    if (!facility) {
        throw new CustomApiError(
            ERROR_CODES.NOT_FOUND,
            'ไม่พบอาคารที่ระบุ',
            HTTP_STATUS.NOT_FOUND
        );
    }

    // ตรวจสอบว่าสนามทั้งหมดมีอยู่จริงและอยู่ในอาคารที่ระบุ
    const courts = await prisma.courts.findMany({
        where: {
            court_id: { in: court_ids.map((id: string) => BigInt(id)) },
            facility_id: BigInt(facility_id),
            is_active: true
        }
    });

    if (courts.length !== court_ids.length) {
        throw new CustomApiError(
            ERROR_CODES.NOT_FOUND,
            'พบสนามที่ไม่ถูกต้องหรือไม่เปิดใช้งาน',
            HTTP_STATUS.NOT_FOUND
        );
    }

    // หา time slots ที่ตรงกับเวลาที่ระบุ
    const weekday = bookingDateObj.getDay(); // 0 = Sunday, 1 = Monday, ...
    const timeSlots = await prisma.time_slots.findMany({
        where: {
            facility_id: BigInt(facility_id),
            weekday: weekday,
            start_minute: { gte: startMinutes },
            end_minute: { lte: endMinutes },
            is_active: true
        },
        orderBy: { start_minute: 'asc' }
    });

    if (timeSlots.length === 0) {
        throw new CustomApiError(
            ERROR_CODES.NOT_FOUND,
            'ไม่พบช่วงเวลาที่ตรงกับที่ระบุ',
            HTTP_STATUS.NOT_FOUND
        );
    }

    // ตรวจสอบว่ามีการจองซ้อนทับหรือไม่
    const existingBookings = await prisma.reservation_items.findMany({
        where: {
            court_id: { in: court_ids.map((id: string) => BigInt(id)) },
            play_date: bookingDateObj,
            slot_id: { in: timeSlots.map(slot => slot.slot_id) },
            status: { not: 'cancelled' }
        },
        include: {
            courts: { select: { court_code: true, name: true } },
            time_slots: { select: { label: true, start_minute: true, end_minute: true } }
        }
    });

    if (existingBookings.length > 0) {
        const conflictDetails = existingBookings.map(booking => 
            `สนาม ${booking.courts.name || booking.courts.court_code} เวลา ${booking.time_slots.label || 
            `${Math.floor(booking.time_slots.start_minute / 60).toString().padStart(2, '0')}:${(booking.time_slots.start_minute % 60).toString().padStart(2, '0')}-${Math.floor(booking.time_slots.end_minute / 60).toString().padStart(2, '0')}:${(booking.time_slots.end_minute % 60).toString().padStart(2, '0')}`}`
        ).join(', ');

        throw new CustomApiError(
            ERROR_CODES.RESOURCE_CONFLICT,
            `มีการจองซ้อนทับ: ${conflictDetails}`,
            HTTP_STATUS.CONFLICT
        );
    }

    // ตรวจสอบ blackouts
    const blackouts = await prisma.blackouts.findMany({
        where: {
            active: true,
            OR: [
                { facility_id: BigInt(facility_id), court_id: null }, // ปิดทั้งอาคาร
                { court_id: { in: court_ids.map((id: string) => BigInt(id)) } } // ปิดสนามเฉพาะ
            ],
            start_datetime: { lte: new Date(`${booking_date}T${end_time}:00`) },
            end_datetime: { gte: new Date(`${booking_date}T${start_time}:00`) }
        },
        include: {
            courts: { select: { court_code: true, name: true } }
        }
    });

    if (blackouts.length > 0) {
        const blackoutDetails = blackouts.map(blackout => 
            blackout.court_id 
                ? `สนาม ${blackout.courts?.name || blackout.courts?.court_code}` 
                : 'ทั้งอาคาร'
        ).join(', ');

        throw new CustomApiError(
            ERROR_CODES.RESOURCE_CONFLICT,
            `ช่วงเวลานี้มีการปิดสนาม: ${blackoutDetails}`,
            HTTP_STATUS.CONFLICT
        );
    }

    // คำนวณราคา (ใช้ราคาเริ่มต้นจากสนามแรก)
    const pricingRule = await prisma.pricing_rules.findFirst({
        where: {
            active: true,
            effective_from: { lte: bookingDateObj },
            AND: [
                {
                    OR: [
                        { effective_to: null },
                        { effective_to: { gte: bookingDateObj } }
                    ]
                },
                {
                    OR: [
                        { court_id: BigInt(court_ids[0]) },
                        { court_id: null, facility_id: BigInt(facility_id) }
                    ]
                }
            ]
        },
        orderBy: [
            { court_id: { sort: 'desc', nulls: 'last' } },
            { effective_from: 'desc' }
        ]
    });

    const pricePerSlot = pricingRule?.price_cents || 0;
    const totalSlots = timeSlots.length * court_ids.length;
    const totalPrice = pricePerSlot * totalSlots;

    const bookingUserId = user_id ? BigInt(user_id) : BigInt(session.user.id);

    // สร้างการจอง
    const reservation = await prisma.reservations.create({
        data: {
            user_id: bookingUserId,
            facility_id: BigInt(facility_id),
            status: 'confirmed', // Admin booking จะ confirmed ทันที
            payment_status: 'paid', // Admin booking จะ paid ทันที
            reserved_date: bookingDateObj,
            note: note || `จองโดยแอดมิน: ${session.user.username}`,
            subtotal_cents: totalPrice,
            discount_cents: 0,
            total_cents: totalPrice,
            confirmed_at: new Date(),
            completed_at: new Date()
        }
    });

    // สร้าง reservation items
    const reservationItems = [];
    for (const courtId of court_ids) {
        for (const timeSlot of timeSlots) {
            const item = await prisma.reservation_items.create({
                data: {
                    reservation_id: reservation.reservation_id,
                    court_id: BigInt(courtId),
                    slot_id: timeSlot.slot_id,
                    play_date: bookingDateObj,
                    price_cents: pricePerSlot,
                    status: 'reserved'
                }
            });
            reservationItems.push(item);
        }
    }

    const data = {
        reservation_id: reservation.reservation_id.toString(),
        facility_id: reservation.facility_id.toString(),
        facility_name: facility.name_th,
        booking_date: booking_date,
        start_time: start_time,
        end_time: end_time,
        courts_count: court_ids.length,
        time_slots_count: timeSlots.length,
        total_items: reservationItems.length,
        total_price: totalPrice / 100, // แปลงเป็นบาท
        note: reservation.note,
        status: reservation.status,
        payment_status: reservation.payment_status
    };

    return successResponse(data, 'จองสนามหลายสนามสำเร็จ');
}

export const POST = withMiddleware(
    withErrorHandler(createMultiBookingHandler),
    {
        methods: ['POST'],
        rateLimit: 'default',
    }
);