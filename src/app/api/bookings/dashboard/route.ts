import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/Auth';
import { prisma } from '@/lib/prisma';
import { DashboardBooking } from '@/types/booking';
import { decode } from '@/lib/Cryto';

// แปลง minutes เป็น HH:MM
const minutesToTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins  = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

async function resolveRole(encrypted: string | undefined | null): Promise<string | null> {
    if (!encrypted) {
        console.log('[resolveRole] No encrypted value provided:', { encrypted });
        return null;
    }
    
    // ตรวจสอบว่าเป็น plaintext role หรือไม่ (backward compatibility)
    const plainRoles = ['admin', 'super_admin', 'student', 'staff', 'guest'];
    if (plainRoles.includes(encrypted)) {
        console.log('[resolveRole] Found plaintext role (old session):', { role: encrypted });
        return encrypted;
    }
    
    console.log('[resolveRole] Attempting to decode encrypted role:', { 
        encrypted: encrypted.substring(0, 50) + '...', 
        length: encrypted.length 
    });
    
    try {
        const decoded = await decode(encrypted);
        console.log('[resolveRole] Successfully decoded:', { decoded });
        return decoded;
    } catch (error) {
        console.error('[resolveRole] Failed to decode role:', {
            error: error instanceof Error ? error.message : String(error),
            encryptedPreview: encrypted.substring(0, 50) + '...'
        });
        return null;
    }
}

const mapReservationStatus = (
    reservationStatus: string,
    itemStatus: string
): 'confirmed' | 'pending' | 'cancelled' | 'available' => {
    if (itemStatus       === 'cancelled') return 'cancelled';
    if (reservationStatus === 'confirmed') return 'confirmed';
    if (reservationStatus === 'pending')   return 'pending';
    return 'available';
};

//  ใช้ Intl แทน toLocaleString — reliable บน serverless/edge
function getThailandDateString(): string {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Bangkok',
        year:     'numeric',
        month:    '2-digit',
        day:      '2-digit',
    }).formatToParts(new Date());

    const get = (type: string) => parts.find(p => p.type === type)?.value ?? '00';
    return `${get('year')}-${get('month')}-${get('day')}`;
}

function getThailandDayOfWeek(): number {
    const date = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Bangkok',
        weekday:  'short',
    }).format(new Date());

    return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(date);
}

//  แปลง court_code → courtNumber อย่างปลอดภัย
function parsCourtNumber(courtCode: string, fallback: number): number {
    const digits = courtCode.replace(/\D/g, '');
    if (!digits) return fallback;
    const n = Number.parseInt(digits, 10);
    return Number.isFinite(n) ? n : fallback;
}

export async function GET() {
    //  ตรวจ session — ข้อมูลนี้มี user info ควรจำกัดเฉพาะ admin
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ success: false, message: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
    }

    const ADMIN_ROLES = new Set(['admin', 'super_admin']);
    const role = await resolveRole(session?.user?.role);
    if (!session?.user || !ADMIN_ROLES.has(role ?? '')) {
        return NextResponse.json({ success: false, message: 'ไม่มีสิทธิ์เข้าถึงข้อมูลนี้' }, { status: 403 });
    }

    try {
        const todayString = getThailandDateString();
        const dayOfWeek   = getThailandDayOfWeek();

        const startOfToday = new Date(todayString);
        const endOfToday   = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);

        const [reservationItems, courts, timeSlots] = await Promise.all([
            prisma.reservation_items.findMany({
                include: {
                    reservations: {
                        include: {
                            users: {
                                select: {
                                    user_id:    true,
                                    first_name: true,
                                    last_name:  true,
                                    email:      true,
                                    phone:      true,
                                }
                            }
                        }
                    },
                    courts: {
                        select: {
                            court_id:   true,
                            court_code: true,
                            name:       true,
                        }
                    },
                    time_slots: {
                        select: {
                            slot_id:      true,
                            start_minute: true,
                            end_minute:   true,
                            label:        true,
                        }
                    }
                },
                where: {
                    play_date: { gte: startOfToday, lt: endOfToday }
                },
            }),
            prisma.courts.findMany({
                select:  { court_id: true, court_code: true, name: true },
                where:   { is_active: true },
                orderBy: { court_code: 'asc' },
            }),
            prisma.time_slots.findMany({
                select:  { slot_id: true, start_minute: true, end_minute: true, label: true },
                where:   { is_active: true, weekday: dayOfWeek },
                orderBy: { start_minute: 'asc' },
            }),
        ]);

        const allBookings: DashboardBooking[] = [];
        const occupiedSlots = new Set<string>();

        reservationItems.forEach((item, index) => {
            const user     = item.reservations.users;
            const court    = item.courts;
            const timeSlot = item.time_slots;

            //  ใช้ index+1 เป็น fallback แทน hardcode 1
            const courtNumber    = parsCourtNumber(court.court_code, index + 1);
            const timeSlotString = minutesToTime(timeSlot.start_minute);

            allBookings.push({
                id:           item.item_id.toString(),
                court_number: courtNumber,
                court_name:   court.name || `สนามแบดมินตัน ${courtNumber}`,
                date:         item.play_date.toISOString().split('T')[0],
                time_slot:    timeSlotString,
                user_name:    `${user.first_name} ${user.last_name}`,
                status:       mapReservationStatus(item.reservations.status, item.status),
                created_at:   item.created_at.toISOString(),
            });

            occupiedSlots.add(`${courtNumber}-${timeSlotString}`);
        });

        courts.forEach((court, index) => {
            const courtNumber = parsCourtNumber(court.court_code, index + 1);
            const courtName   = court.name || `สนามแบดมินตัน ${courtNumber}`;

            timeSlots.forEach(slot => {
                const timeSlotString = minutesToTime(slot.start_minute);
                const key            = `${courtNumber}-${timeSlotString}`;

                if (!occupiedSlots.has(key)) {
                    allBookings.push({
                        id:           `available-${court.court_id}-${slot.slot_id}`,
                        court_number: courtNumber,
                        court_name:   courtName,
                        date:         todayString,
                        time_slot:    timeSlotString,
                        user_name:    '',
                        status:       'available',
                        created_at:   '',   //  available slot ไม่มี created_at จริง
                    });
                }
            });
        });

        allBookings.sort((a, b) => {
            if (a.court_number !== b.court_number) return a.court_number - b.court_number;
            return a.time_slot.localeCompare(b.time_slot);
        });

        return NextResponse.json({
            success: true,
            data:    allBookings,
            message: 'Bookings fetched successfully',
        });

    } catch (error) {
        console.error('Dashboard API error:', error);
        return NextResponse.json(
            { success: false, data: [], message: 'Failed to fetch booking data' },
            { status: 500 }
        );
    }
}