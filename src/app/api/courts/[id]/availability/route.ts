import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/Auth';
import { prisma } from '@/lib/prisma';

// แปลง minutes เป็น HH:MM
const minutesToTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins  = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

const formatTimeSlotLabel = (startMinute: number, endMinute: number): string =>
    `${minutesToTime(startMinute)} - ${minutesToTime(endMinute)} น.`;

//  ดึง weekday ของวันที่ใน timezone ไทย
function getWeekdayThailand(dateStr: string): number {
    const day = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Bangkok',
        weekday:  'short',
    }).format(new Date(`${dateStr}T12:00:00Z`)); // ใช้ noon UTC ป้องกัน date shift

    return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(day);
}

export async function GET(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    //  ตรวจ session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json(
            { success: false, message: 'กรุณาเข้าสู่ระบบ' },
            { status: 401 }
        );
    }

    try {
        const { searchParams } = new URL(request.url);
        const date             = searchParams.get('date');
        const resolvedParams   = await context.params;
        const courtId          = parseInt(resolvedParams.id, 10);

        if (!date) {
            return NextResponse.json(
                { success: false, message: 'Date parameter is required' },
                { status: 400 }
            );
        }

        if (!Number.isFinite(courtId) || courtId <= 0) {
            return NextResponse.json(
                { success: false, message: 'Court ID ไม่ถูกต้อง' },
                { status: 400 }
            );
        }

        //  คำนวณ weekday ใน timezone ไทย ไม่ใช่ UTC
        const weekday = getWeekdayThailand(date);

        //  distinct ที่ DB เลย ไม่ต้อง filter ใน memory
        //  ไม่ hard-code exclude 6:00-7:00 — ให้ DB จัดการผ่าน is_active
        const timeSlots = await prisma.time_slots.findMany({
            where: {
                is_active: true,
                weekday,
            },
            select: {
                slot_id:      true,
                start_minute: true,
                end_minute:   true,
                label:        true,
                is_break:     true,
            },
            orderBy:  { start_minute: 'asc' },
            distinct: ['start_minute', 'end_minute'],
        });

        const startOfDay = new Date(`${date}T00:00:00+07:00`);
        const endOfDay   = new Date(`${date}T23:59:59+07:00`);

        const reservations = await prisma.reservation_items.findMany({
            where: {
                court_id:  BigInt(courtId),
                play_date: { gte: startOfDay, lt: endOfDay },
            },
            select: {
                slot_id: true,
                status:  true,
                reservations: {
                    select: {
                        status: true,
                        users: {
                            //  select เฉพาะที่ใช้ ไม่ดึง password_hash, national_id ฯลฯ
                            select: {
                                first_name: true,
                                last_name:  true,
                            }
                        }
                    }
                }
            }
        });

        // สร้าง map slot_id → reservation เพื่อ lookup O(1)
        const reservationMap = new Map(
            reservations.map((r) => [r.slot_id.toString(), r])
        );

        const isAdmin = ['admin', 'super_admin'].includes(session.user.role);

        const slots = timeSlots.map((slot) => {
            //  break จาก DB flag ไม่ hard-code
            if (slot.is_break) {
                return {
                    id:           Number(slot.slot_id),
                    label:        slot.label || formatTimeSlotLabel(slot.start_minute, slot.end_minute),
                    status:       'break' as const,
                    bookedBy:     '',
                    start_minute: slot.start_minute,
                    end_minute:   slot.end_minute,
                };
            }

            const reservation = reservationMap.get(slot.slot_id.toString());

            let status:   'available' | 'reserved' | 'pending' | 'break' = 'available';
            let bookedBy = '';

            if (reservation) {
                const reservationStatus = reservation.reservations.status;
                const itemStatus        = reservation.status;

                if (itemStatus === 'cancelled') {
                    status = 'available';
                } else if (reservationStatus === 'confirmed') {
                    status = 'reserved';
                    //  แสดงชื่อเฉพาะ admin — user ทั่วไปเห็นแค่ว่าถูกจองแล้ว
                    bookedBy = isAdmin
                        ? `${reservation.reservations.users.first_name} ${reservation.reservations.users.last_name}`
                        : 'ถูกจองแล้ว';
                } else if (reservationStatus === 'pending') {
                    status   = 'pending';
                    bookedBy = 'รอตรวจสอบ';
                }
            }

            return {
                id:           Number(slot.slot_id),
                label:        slot.label || formatTimeSlotLabel(slot.start_minute, slot.end_minute),
                status,
                bookedBy,
                start_minute: slot.start_minute,
                end_minute:   slot.end_minute,
            };
        });

        return NextResponse.json({
            success: true,
            data:    slots,
            message: 'Court availability fetched successfully',
        });

    } catch (error) {
        console.error('Court availability API error:', error);
        return NextResponse.json(
            { success: false, data: [], message: 'Failed to fetch court availability' },
            { status: 500 }
        );
    }
}