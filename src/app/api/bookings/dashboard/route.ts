import { NextResponse } from 'next/server';
import { DashboardBooking } from '@/types/booking';
import { prisma } from '@/lib/prisma';

// Helper function to convert minutes to HH:MM format
const minutesToTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

// Helper function to map reservation status to dashboard status
const mapReservationStatus = (reservationStatus: string, itemStatus: string): 'confirmed' | 'pending' | 'cancelled' | 'available' => {
    if (itemStatus === 'cancelled') return 'cancelled';
    if (reservationStatus === 'confirmed') return 'confirmed';
    if (reservationStatus === 'pending') return 'pending';
    return 'available';
};

export async function GET() {
    try {
        // Get today's date in Thailand timezone
        const today = new Date();
        const thailandDate = new Date(today.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
        const todayString = thailandDate.toISOString().split('T')[0];

        // Fetch actual bookings from database
        const reservationItems = await prisma.reservation_items.findMany({
            include: {
                reservations: {
                    include: {
                        users: true
                    }
                },
                courts: true,
                time_slots: true
            },
            where: {
                play_date: {
                    gte: new Date(todayString),
                    lt: new Date(new Date(todayString).getTime() + 24 * 60 * 60 * 1000)
                }
            },
            orderBy: [
                { courts: { court_code: 'asc' } },
                { time_slots: { start_minute: 'asc' } }
            ]
        });

        // Transform database data to dashboard format
        const bookings: DashboardBooking[] = reservationItems.map(item => {
            const user = item.reservations.users;
            const court = item.courts;
            const timeSlot = item.time_slots;

            // Extract court number from court_code (assuming format like "COURT-01", "COURT-02", etc.)
            const courtNumber = parseInt(court.court_code.replace(/\D/g, '')) || 1;

            return {
                id: item.item_id.toString(),
                court_number: courtNumber,
                court_name: court.name || `สนามแบดมินตัน ${courtNumber}`,
                date: item.play_date.toISOString().split('T')[0],
                time_slot: minutesToTime(timeSlot.start_minute),
                user_name: `${user.first_name} ${user.last_name}`,
                status: mapReservationStatus(item.reservations.status, item.status),
                created_at: item.created_at.toISOString()
            };
        });

        // Generate available slots for courts that don't have bookings
        const allBookings: DashboardBooking[] = [...bookings];

        // Get all courts and time slots to fill in available slots
        const courts = await prisma.courts.findMany({
            where: { is_active: true },
            orderBy: { court_code: 'asc' }
        });

        const timeSlots = await prisma.time_slots.findMany({
            where: {
                is_active: true,
                weekday: thailandDate.getDay() // 0 = Sunday, 1 = Monday, etc.
            },
            orderBy: { start_minute: 'asc' }
        });

        // Fill in available slots
        courts.forEach(court => {
            const courtNumber = parseInt(court.court_code.replace(/\D/g, '')) || 1;

            timeSlots.forEach(slot => {
                const timeSlotString = minutesToTime(slot.start_minute);

                // Check if this court-time combination already exists in bookings
                const existingBooking = bookings.find(b =>
                    b.court_number === courtNumber && b.time_slot === timeSlotString
                );

                if (!existingBooking) {
                    allBookings.push({
                        id: `available-${court.court_id}-${slot.slot_id}`,
                        court_number: courtNumber,
                        court_name: court.name || `สนามแบดมินตัน ${courtNumber}`,
                        date: todayString,
                        time_slot: timeSlotString,
                        user_name: '',
                        status: 'available',
                        created_at: new Date().toISOString()
                    });
                }
            });
        });

        // Sort by court number and time slot
        allBookings.sort((a, b) => {
            if (a.court_number !== b.court_number) {
                return a.court_number - b.court_number;
            }
            return a.time_slot.localeCompare(b.time_slot);
        });

        return NextResponse.json({
            success: true,
            data: allBookings,
            message: 'Bookings fetched successfully from database'
        });

    } catch (error) {
        console.error('Dashboard API error:', error);
        return NextResponse.json(
            {
                success: false,
                data: [],
                message: 'Failed to fetch booking data from database'
            },
            { status: 500 }
        );
    }
}