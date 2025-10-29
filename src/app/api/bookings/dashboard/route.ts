import { NextResponse } from 'next/server';
import { DashboardBooking } from '@/types/booking';

// Mock data สำหรับการทดสอบ - ในการใช้งานจริงให้ดึงจากฐานข้อมูล
const generateMockBookings = (): DashboardBooking[] => {
    const bookings: DashboardBooking[] = [];
    const courts = [1, 2, 3, 4, 5, 6];
    const timeSlots: string[] = [];

    // Generate time slots (05:00 - 19:00)
    for (let hour = 5; hour <= 19; hour++) {
        timeSlots.push(`${hour.toString().padStart(2, '0')}:00`);
    }

    const statuses = ['confirmed', 'pending', 'available', 'available', 'available']; // More available slots
    const users = ['นาย ก', 'นาง ข', 'น.ส. ค', 'นาย ง', 'นาง จ', 'น.ส. ฉ'];

    courts.forEach(courtNumber => {
        timeSlots.forEach((timeSlot, index) => {
            // Create some realistic booking patterns
            let status = 'available';
            let user = '';

            // Peak hours (17:00-19:00) more likely to be booked
            if (timeSlot >= '17:00') {
                status = Math.random() > 0.3 ? 'confirmed' : 'available';
            }
            // Morning hours (05:00-08:00) less likely to be booked
            else if (timeSlot <= '08:00') {
                status = Math.random() > 0.7 ? 'confirmed' : 'available';
            }
            // Regular hours
            else {
                status = Math.random() > 0.5 ? 'confirmed' : 'available';
            }

            // Add some pending and cancelled bookings
            if (status === 'confirmed' && Math.random() > 0.8) {
                status = Math.random() > 0.5 ? 'pending' : 'cancelled';
            }

            if (status === 'confirmed' || status === 'pending') {
                user = users[Math.floor(Math.random() * users.length)];
            }

            bookings.push({
                id: `${courtNumber}-${timeSlot}-${Date.now()}`,
                court_number: courtNumber,
                court_name: `สนามแบดมินตัน ${courtNumber}`,
                date: new Date().toISOString().split('T')[0],
                time_slot: timeSlot,
                user_name: user,
                status: status as 'confirmed' | 'pending' | 'cancelled' | 'available',
                created_at: new Date().toISOString()
            });
        });
    });

    return bookings;
};

export async function GET() {
    try {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500));

        // In real implementation, fetch from database:
        // const bookings = await prisma.reservation_items.findMany({
        //   include: {
        //     reservations: {
        //       include: {
        //         users: true
        //       }
        //     },
        //     courts: true,
        //     time_slots: true
        //   },
        //   where: {
        //     play_date: {
        //       gte: new Date(),
        //     },
        //   },
        //   orderBy: [
        //     { play_date: 'asc' },
        //     { time_slots: { start_minute: 'asc' } },
        //   ],
        // });

        const bookings = generateMockBookings();

        return NextResponse.json({
            success: true,
            data: bookings,
            message: 'Bookings fetched successfully'
        });

    } catch (error) {
        console.error('Dashboard API error:', error);
        return NextResponse.json(
            {
                success: false,
                data: [],
                message: 'Failed to fetch booking data'
            },
            { status: 500 }
        );
    }
}