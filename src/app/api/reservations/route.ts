import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { checkBookingSystemStatus } from '@/middleware/bookingSystemCheck';

export async function POST(request: NextRequest) {
  try {
    // เช็คสถานะระบบการจองก่อน
    const isSystemOpen = await checkBookingSystemStatus();

    if (!isSystemOpen) {
      return NextResponse.json(
        {
          success: false,
          error: 'ระบบการจองปิดอยู่ในขณะนี้',
          message: 'กรุณาติดต่อแอดมิน หรือรอระบบเปิดอัตโนมัติเวลา 9:00 น.'
        },
        { status: 403 }
      );
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'กรุณาเข้าสู่ระบบ' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { courtId, slotId, bookingDate, slipUrl } = body;

    // Validation
    if (!courtId || !slotId || !bookingDate) {
      return NextResponse.json(
        { success: false, error: 'ข้อมูลไม่ครบถ้วน' },
        { status: 400 }
      );
    }

    // Import Prisma
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    try {
      // ตรวจสอบว่าสนามและช่วงเวลายังว่างอยู่หรือไม่
      const existingReservation = await prisma.reservation_items.findFirst({
        where: {
          court_id: BigInt(courtId),
          slot_id: BigInt(slotId),
          play_date: new Date(bookingDate),
          status: {
            in: ['reserved']
          }
        }
      });

      if (existingReservation) {
        return NextResponse.json(
          { success: false, error: 'ช่วงเวลานี้ถูกจองแล้ว' },
          { status: 409 }
        );
      }

      // ดึงข้อมูลสนามและราคา
      const court = await prisma.courts.findUnique({
        where: { court_id: BigInt(courtId) },
        include: {
          facilities: {
            select: {
              facility_id: true,
              name_th: true
            }
          }
        }
      });

      if (!court) {
        return NextResponse.json(
          { success: false, error: 'ไม่พบข้อมูลสนาม' },
          { status: 404 }
        );
      }

      // ดึงข้อมูล time slot
      const timeSlot = await prisma.time_slots.findUnique({
        where: { slot_id: BigInt(slotId) }
      });

      if (!timeSlot) {
        return NextResponse.json(
          { success: false, error: 'ไม่พบข้อมูลช่วงเวลา' },
          { status: 404 }
        );
      }

      // คำนวณราคา (ใช้ราคาเริ่มต้น 100 บาท หากไม่มีข้อมูล)
      const pricePerHour = 100; // TODO: ดึงจาก pricing rules
      const priceCents = pricePerHour * 100; // แปลงเป็น cents

      // สร้างการจองใน transaction
      const result = await prisma.$transaction(async (tx) => {
        // 1. สร้าง reservation
        const reservation = await tx.reservations.create({
          data: {
            user_id: BigInt(session.user.id),
            facility_id: court.facilities.facility_id,
            status: 'pending',
            payment_status: 'unpaid',
            reserved_date: new Date(bookingDate),
            subtotal_cents: priceCents,
            total_cents: priceCents,
            currency: 'THB'
          }
        });

        // 2. สร้าง reservation item
        const reservationItem = await tx.reservation_items.create({
          data: {
            reservation_id: reservation.reservation_id,
            court_id: BigInt(courtId),
            slot_id: BigInt(slotId),
            play_date: new Date(bookingDate),
            price_cents: priceCents,
            currency: 'THB',
            status: 'reserved'
          }
        });

        // 3. สร้าง payment record (ถ้ามี slip)
        let payment = null;
        if (slipUrl) {
          payment = await tx.payments.create({
            data: {
              reservation_id: reservation.reservation_id,
              amount_cents: priceCents,
              currency: 'THB',
              method: 'bank_transfer',
              status: 'pending',
              meta_json: {
                slip_url: slipUrl,
                uploaded_by: session.user.id,
                uploaded_at: new Date().toISOString()
              }
            }
          });
        }

        return { reservation, reservationItem, payment };
      });

      return NextResponse.json({
        success: true,
        message: 'สร้างการจองสำเร็จ',
        data: {
          reservation_id: result.reservation.reservation_id.toString(),
          payment_id: result.payment?.payment_id.toString() || null,
          status: 'pending',
          amount: pricePerHour,
          booking_date: bookingDate,
          court_name: court.name || `Court ${court.court_code}`,
          facility_name: court.facilities.name_th
        }
      });

    } finally {
      await prisma.$disconnect();
    }

  } catch (error) {
    console.error('Error creating reservation:', error);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในการสร้างการจอง' },
      { status: 500 }
    );
  }
}