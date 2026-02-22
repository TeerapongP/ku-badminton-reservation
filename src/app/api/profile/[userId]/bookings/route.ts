import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/Auth";
import { prisma } from "@/lib/prisma"; // A05 — singleton แทน new PrismaClient()
import { decryptData } from "@/lib/encryption";
import { Prisma } from "@prisma/client";

// A03 — ค่า limit สูงสุดที่ยอมรับได้ ป้องกัน DoS จาก limit=99999
const MAX_LIMIT = 100;

// A01 — roles ที่อนุญาตให้ดูข้อมูลของ user อื่นได้
const ADMIN_ROLES = ['admin', 'super_admin'];

// A03 — status ที่ยอมรับได้ (whitelist)
const ALLOWED_STATUSES = ['pending', 'confirmed', 'cancelled', 'completed', 'all'] as const;
type AllowedStatus = typeof ALLOWED_STATUSES[number];

function isAllowedStatus(value: string): value is AllowedStatus {
    return ALLOWED_STATUSES.includes(value as AllowedStatus);
}

// GET - ดึงประวัติการจองของผู้ใช้
export async function GET(
    req: Request,
    context: { params: Promise<{ userId: string }> }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json(
                { success: false, error: "ไม่ได้รับอนุญาต" },
                { status: 401 }
            );
        }

        const { userId: encryptedUserId } = await context.params;

        // ถอดรหัส userId
        let userId: string;
        try {
            userId = decryptData(decodeURIComponent(encryptedUserId));
        } catch {
            // A09 — ไม่ log decryption error (อาจมี sensitive data)
            return NextResponse.json(
                { success: false, error: "ข้อมูล userId ไม่ถูกต้อง" },
                { status: 400 }
            );
        }

        // A03 — ตรวจสอบว่า userId เป็นตัวเลขก่อน BigInt()
        if (!/^\d+$/.test(userId)) {
            return NextResponse.json(
                { success: false, error: "ข้อมูล userId ไม่ถูกต้อง" },
                { status: 400 }
            );
        }

        // A01 — ตรวจสอบ ownership หรือ admin role (รวม super_admin)
        if (session.user.id !== userId && !ADMIN_ROLES.includes(session.user.role)) {
            return NextResponse.json(
                { success: false, error: "ไม่ได้รับอนุญาต" },
                { status: 403 }
            );
        }

        const { searchParams } = new URL(req.url);

        // A03 — validate และ clamp page / limit
        const rawPage  = parseInt(searchParams.get('page')  || '1');
        const rawLimit = parseInt(searchParams.get('limit') || '10');

        const page  = Number.isFinite(rawPage)  && rawPage  > 0 ? rawPage  : 1;
        const limit = Number.isFinite(rawLimit) && rawLimit > 0
            ? Math.min(rawLimit, MAX_LIMIT)
            : 10;

        const skip = (page - 1) * limit;

        // A03 — validate status ด้วย whitelist
        const rawStatus = searchParams.get('status');
        const status = rawStatus && isAllowedStatus(rawStatus) ? rawStatus : null;

        // A03 — validate date format (YYYY-MM-DD)
        const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
        const rawStartDate = searchParams.get('startDate');
        const rawEndDate   = searchParams.get('endDate');

        const startDate = rawStartDate && DATE_REGEX.test(rawStartDate) ? new Date(rawStartDate) : null;
        const endDate   = rawEndDate   && DATE_REGEX.test(rawEndDate)   ? new Date(rawEndDate)   : null;

        // ตรวจสอบว่า date ที่แปลงแล้วถูกต้อง (ป้องกัน "2024-13-99" ผ่าน regex แต่ Invalid Date)
        if (startDate && isNaN(startDate.getTime())) {
            return NextResponse.json({ success: false, error: "startDate ไม่ถูกต้อง" }, { status: 400 });
        }
        if (endDate && isNaN(endDate.getTime())) {
            return NextResponse.json({ success: false, error: "endDate ไม่ถูกต้อง" }, { status: 400 });
        }

        // A03 — ใช้ Prisma type แทน any
        const whereCondition: Prisma.reservationsWhereInput = {
            user_id: BigInt(userId),
        };

        if (status && status !== 'all') {
            whereCondition.status = status;
        }

        if (startDate || endDate) {
            whereCondition.reserved_date = {
                ...(startDate && { gte: startDate }),
                ...(endDate   && { lte: endDate   }),
            };
        }

        const [reservations, totalCount] = await Promise.all([
            prisma.reservations.findMany({
                where: whereCondition,
                include: {
                    reservation_items: {
                        include: {
                            courts: {
                                select: {
                                    court_id:    true,
                                    name:        true,
                                    court_code:  true,
                                    facility_id: true,
                                },
                            },
                            time_slots: {
                                select: {
                                    slot_id:      true,
                                    start_minute: true,
                                    end_minute:   true,
                                    label:        true,
                                },
                            },
                        },
                    },
                    facilities: {
                        select: {
                            name_th: true,
                            name_en: true,
                        },
                    },
                },
                orderBy: { created_at: 'desc' },
                skip,
                take: limit,
            }),
            prisma.reservations.count({ where: whereCondition }),
        ]);

        const formattedBookings = reservations.flatMap((reservation) => {
            if (!reservation.reservation_items || reservation.reservation_items.length === 0) {
                return [];
            }

            return reservation.reservation_items
                .map((item) => {
                    if (!item.courts || !item.time_slots) {
                        // A09 — log item_id เท่านั้น ไม่ log full object
                        console.warn(`[GET /bookings] Missing court or time_slot for item_id: ${item.item_id}`);
                        return null;
                    }

                    const formatMinute = (m: number) =>
                        `${Math.floor(m / 60).toString().padStart(2, '0')}:${(m % 60).toString().padStart(2, '0')}`;

                    const startTime = formatMinute(item.time_slots.start_minute);
                    const endTime   = formatMinute(item.time_slots.end_minute);

                    return {
                        id:           Number(reservation.reservation_id),
                        item_id:      Number(item.item_id),
                        booking_date: item.play_date.toISOString().split('T')[0],
                        court: {
                            id:            Number(item.courts.court_id),
                            name:          item.courts.name || item.courts.court_code,
                            number:        item.courts.court_code,
                            facility_name: reservation.facilities?.name_th
                                        || reservation.facilities?.name_en
                                        || 'ไม่ระบุ',
                        },
                        time_slot: {
                            id:         Number(item.time_slots.slot_id),
                            start_time: startTime,
                            end_time:   endTime,
                            display:    item.time_slots.label || `${startTime} - ${endTime}`,
                        },
                        status:      reservation.status,
                        total_price: Number(reservation.total_cents) / 100,
                        created_at:  reservation.created_at.toISOString(),
                        updated_at:  reservation.updated_at.toISOString(),
                    };
                })
                .filter(Boolean);
        });

        const totalPages = Math.ceil(totalCount / limit);

        return NextResponse.json({
            success: true,
            data: {
                bookings: formattedBookings,
                pagination: {
                    current_page: page,
                    total_pages:  totalPages,
                    total_count:  totalCount,
                    per_page:     limit,
                    has_next:     page < totalPages,
                    has_prev:     page > 1,
                },
            },
        });

    } catch (error) {
        // A09 — log เฉพาะ message ไม่ expose stack trace ออก response
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[GET /bookings][${new Date().toISOString()}]`, message);

        return NextResponse.json(
            { success: false, error: "เกิดข้อผิดพลาดในการดึงข้อมูลการจอง" },
            { status: 500 }
        );
    }
}