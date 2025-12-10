import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { PrismaClient } from "@prisma/client";
import { authOptions } from "@/lib/Auth";
import { decryptData } from "@/lib/encryption";

const prisma = new PrismaClient();

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
        } catch (error) {
            return NextResponse.json(
                { success: false, error: "ข้อมูล userId ไม่ถูกต้อง" },
                { status: 400 }
            );
        }

        // ตรวจสอบว่าผู้ใช้เข้าถึงประวัติการจองของตัวเองหรือไม่ (หรือเป็น admin)
        if (session.user.id !== userId && session.user.role !== 'admin') {
            return NextResponse.json(
                { success: false, error: "ไม่ได้รับอนุญาต" },
                { status: 403 }
            );
        }

        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const status = searchParams.get('status');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        const skip = (page - 1) * limit;

        // สร้าง where condition
        const whereCondition: any = {
            user_id: BigInt(userId)
        };

        if (status && status !== 'all') {
            whereCondition.status = status;
        }

        if (startDate || endDate) {
            whereCondition.reserved_date = {};
            if (startDate) {
                whereCondition.reserved_date.gte = new Date(startDate);
            }
            if (endDate) {
                whereCondition.reserved_date.lte = new Date(endDate);
            }
        }

        // ดึงข้อมูลการจอง
        const [reservations, totalCount] = await Promise.all([
            prisma.reservations.findMany({
                where: whereCondition,
                include: {
                    reservation_items: {
                        include: {
                            courts: {
                                select: {
                                    court_id: true,
                                    name: true,
                                    court_code: true,
                                    facility_id: true
                                }
                            },
                            time_slots: {
                                select: {
                                    slot_id: true,
                                    start_minute: true,
                                    end_minute: true,
                                    label: true
                                }
                            }
                        }
                    },
                    facilities: {
                        select: {
                            name_th: true,
                            name_en: true
                        }
                    }
                },
                orderBy: {
                    created_at: 'desc'
                },
                skip,
                take: limit
            }),
            prisma.reservations.count({
                where: whereCondition
            })
        ]);

        // แปลงข้อมูลสำหรับ response
        const formattedBookings = reservations.flatMap((reservation: { reservation_items: any[]; reservation_id: any; facilities: { name_th: any; name_en: any; }; status: any; total_cents: any; created_at: { toISOString: () => any; }; updated_at: { toISOString: () => any; }; }) => {
            // ตรวจสอบว่ามี reservation_items หรือไม่
            if (!reservation.reservation_items || reservation.reservation_items.length === 0) {
                return [];
            }

            return reservation.reservation_items.map(item => {
                // ตรวจสอบข้อมูลที่จำเป็น
                if (!item.courts || !item.time_slots) {
                    console.warn('Missing court or time slot data for item:', item.item_id);
                    return null;
                }

                return {
                    id: Number(reservation.reservation_id),
                    item_id: Number(item.item_id),
                    booking_date: item.play_date.toISOString().split('T')[0],
                    court: {
                        id: Number(item.courts.court_id),
                        name: item.courts.name || item.courts.court_code,
                        number: item.courts.court_code,
                        facility_name: reservation.facilities?.name_th || reservation.facilities?.name_en || 'ไม่ระบุ'
                    },
                    time_slot: {
                        id: Number(item.time_slots.slot_id),
                        start_time: `${Math.floor(item.time_slots.start_minute / 60).toString().padStart(2, '0')}:${(item.time_slots.start_minute % 60).toString().padStart(2, '0')}`,
                        end_time: `${Math.floor(item.time_slots.end_minute / 60).toString().padStart(2, '0')}:${(item.time_slots.end_minute % 60).toString().padStart(2, '0')}`,
                        display: item.time_slots.label || `${Math.floor(item.time_slots.start_minute / 60).toString().padStart(2, '0')}:${(item.time_slots.start_minute % 60).toString().padStart(2, '0')} - ${Math.floor(item.time_slots.end_minute / 60).toString().padStart(2, '0')}:${(item.time_slots.end_minute % 60).toString().padStart(2, '0')}`
                    },
                    status: reservation.status,
                    total_price: Number(reservation.total_cents) / 100, // แปลงจาก cents เป็น baht
                    created_at: reservation.created_at.toISOString(),
                    updated_at: reservation.updated_at.toISOString()
                };
            }).filter(Boolean); // กรองค่า null ออก
        });

        const totalPages = Math.ceil(totalCount / limit);

        return NextResponse.json({
            success: true,
            data: {
                bookings: formattedBookings,
                pagination: {
                    current_page: page,
                    total_pages: totalPages,
                    total_count: totalCount,
                    per_page: limit,
                    has_next: page < totalPages,
                    has_prev: page > 1
                }
            }
        });

    } catch (error) {
        console.error("Bookings fetch error:", error);
        return NextResponse.json(
            { success: false, error: "เกิดข้อผิดพลาดในการดึงข้อมูลการจอง" },
            { status: 500 }
        );
    }
}