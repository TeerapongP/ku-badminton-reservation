import { NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { withMiddleware } from '@/lib/api-middleware';
import { CustomApiError, ERROR_CODES, HTTP_STATUS, successResponse, withErrorHandler } from '@/lib/error-handler';


const prisma = new PrismaClient();

async function courtsHandler(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const facilityIdParam = searchParams.get('facilityId');
    const checkDate = searchParams.get('date'); // วันที่ที่ต้องการเช็ค (YYYY-MM-DD)
    const startTime = searchParams.get('startTime'); // เวลาเริ่มต้น (HH:MM)
    const endTime = searchParams.get('endTime'); // เวลาสิ้นสุด (HH:MM)

    if (!facilityIdParam) {
        throw new CustomApiError(
            ERROR_CODES.MISSING_REQUIRED_FIELDS,
            'กรุณาระบุรหัสสิ่งอำนวยความสะดวก (facilityId)',
            HTTP_STATUS.BAD_REQUEST
        );
    }

    const facilityId = Number.parseInt(facilityIdParam, 10);

    if (!Number.isInteger(facilityId) || facilityId <= 0) {
        throw new CustomApiError(
            ERROR_CODES.INVALID_PARAMETERS,
            'รหัสสิ่งอำนวยความสะดวกไม่ถูกต้อง',
            HTTP_STATUS.BAD_REQUEST
        );
    }
    
    const courts = await prisma.courts.findMany({
        where: { facility_id: facilityId },
        select: {
            court_id: true,
            court_code: true,
            name: true,
            is_active: true,
            image_path: true,
            blackouts: {
                where: {
                    active: true,
                    end_datetime: { gte: new Date() } // แสดง blackout ที่ยังไม่หมดอายุ
                },
                select: {
                    blackout_id: true,
                    start_datetime: true,
                    end_datetime: true,
                    reason: true
                }
            }
        },
        orderBy: [{ court_id: 'asc' }],
    });

    // เช็คสถานะการจอง
    let bookingStatus: Record<string, boolean> = {};
    
    if (checkDate && startTime && endTime) {
        // ถ้ามีการระบุวันที่และเวลา ให้เช็คสถานะการจองในช่วงเวลาที่ระบุ
        const bookingDate = new Date(checkDate);
        const [startHour, startMinute] = startTime.split(':').map(Number);
        const [endHour, endMinute] = endTime.split(':').map(Number);
        const startMinutes = startHour * 60 + startMinute;
        const endMinutes = endHour * 60 + endMinute;

        // หา time slots ที่อยู่ในช่วงเวลาที่ระบุ
        const timeSlots = await prisma.time_slots.findMany({
            where: {
                facility_id: BigInt(facilityId),
                weekday: bookingDate.getDay(),
                start_minute: { gte: startMinutes },
                end_minute: { lte: endMinutes },
                is_active: true
            }
        });

        if (timeSlots.length > 0) {
            // เช็คการจองที่มีอยู่
            const existingBookings = await prisma.reservation_items.findMany({
                where: {
                    court_id: { in: courts.map(c => c.court_id) },
                    play_date: bookingDate,
                    slot_id: { in: timeSlots.map(slot => slot.slot_id) },
                    status: { not: 'cancelled' }
                },
                select: {
                    court_id: true
                }
            });

            // สร้าง mapping ของสนามที่ถูกจองแล้ว
            existingBookings.forEach(booking => {
                bookingStatus[booking.court_id.toString()] = true;
            });
        }
    } else {
        // ถ้าไม่ระบุวันที่และเวลา ให้เช็คว่ามีการจองทั้งหมด (ไม่จำกัดวันที่)
        console.log('Checking all bookings for courts:', courts.map(c => c.court_id.toString()));
        
        const allBookings = await prisma.reservation_items.findMany({
            where: {
                court_id: { in: courts.map(c => c.court_id) },
                status: { not: 'cancelled' },
                play_date: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } // จากวันนี้เป็นต้นไป
            },
            select: {
                court_id: true,
                play_date: true,
                status: true
            }
        });

        console.log('Found bookings:', allBookings.length);
        console.log('Bookings:', allBookings.map(b => ({
            court_id: b.court_id.toString(),
            play_date: b.play_date.toISOString(),
            status: b.status
        })));

        // สร้าง mapping ของสนามที่มีการจอง
        allBookings.forEach(booking => {
            bookingStatus[booking.court_id.toString()] = true;
        });
        
        console.log('Booking status map:', bookingStatus);
    }

    const data = courts.map((c) => {
        const courtId = typeof c.court_id === 'bigint' ? c.court_id.toString() : c.court_id;
        const isBooked = bookingStatus[courtId] || false;
        
        return {
            court_id: courtId,
            court_code: c.court_code,
            name: c.name,
            is_active: c.is_active && c.blackouts.length === 0, // สนามจะ active เมื่อไม่มี blackout ที่กำลังใช้งาน
            image_path: c.image_path,
            is_blackout: c.blackouts.length > 0,
            is_booked: isBooked, // เพิ่มสถานะการจอง
            blackout_info: c.blackouts.length > 0 ? {
                blackout_id: c.blackouts[0].blackout_id.toString(),
                start_datetime: c.blackouts[0].start_datetime.toISOString(),
                end_datetime: c.blackouts[0].end_datetime.toISOString(),
                reason: c.blackouts[0].reason
            } : null
        };
    });

    return successResponse(data);
}

export const GET = withMiddleware(
    withErrorHandler(courtsHandler),
    {
        methods: ['GET'],
        rateLimit: 'default',
    }
);
