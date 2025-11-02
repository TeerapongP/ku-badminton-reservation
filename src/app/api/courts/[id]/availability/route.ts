import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Helper function to convert minutes to HH:MM format
const minutesToTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

// Helper function to format time slot label
const formatTimeSlotLabel = (startMinute: number, endMinute: number): string => {
    const startTime = minutesToTime(startMinute);
    const endTime = minutesToTime(endMinute);
    return `${startTime} - ${endTime} น.`;
};

export async function GET(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { searchParams } = new URL(request.url);
        const date = searchParams.get('date');
        const resolvedParams = await context.params;
        const courtId = parseInt(resolvedParams.id);

        if (!date) {
            return NextResponse.json(
                { success: false, message: 'Date parameter is required' },
                { status: 400 }
            );
        }

        // Parse the date
        const selectedDate = new Date(date);
        const weekday = selectedDate.getDay(); // 0 = Sunday, 1 = Monday, etc.

        // Get all time slots for this weekday (excluding 6:00-8:00)
        const allTimeSlots = await prisma.time_slots.findMany({
            where: {
                is_active: true,
                weekday: weekday,
                start_minute: {
                    not: {
                        in: [6 * 60, 7 * 60] // Exclude 6:00 (360 minutes) and 7:00 (420 minutes)
                    }
                }
            },
            orderBy: { start_minute: 'asc' }
        });

        // Remove duplicates based on start_minute and end_minute
        const timeSlots = allTimeSlots.filter((slot, index, self) =>
            index === self.findIndex(s =>
                s.start_minute === slot.start_minute && s.end_minute === slot.end_minute
            )
        );

        // Get existing reservations for this court and date
        const reservations = await prisma.reservation_items.findMany({
            include: {
                reservations: {
                    include: {
                        users: true
                    }
                },
                time_slots: true
            },
            where: {
                court_id: BigInt(courtId), // Convert to BigInt for database query
                play_date: {
                    gte: new Date(date),
                    lt: new Date(new Date(date).getTime() + 24 * 60 * 60 * 1000)
                }
            }
        });

        // Create slots array with availability status
        const slots = timeSlots.map((slot, index) => {
            // Check if this slot is reserved
            const reservation = reservations.find(r => r.slot_id === slot.slot_id);

            let status: 'available' | 'reserved' | 'pending' | 'break' = 'available';
            let bookedBy = '';

            if (reservation) {
                const reservationStatus = reservation.reservations.status;
                const itemStatus = reservation.status;

                if (itemStatus === 'cancelled') {
                    status = 'available';
                } else if (reservationStatus === 'confirmed') {
                    status = 'reserved';
                    bookedBy = `${reservation.reservations.users.first_name} ${reservation.reservations.users.last_name}`;
                } else if (reservationStatus === 'pending') {
                    status = 'pending';
                    bookedBy = 'รอตรวจสอบ';
                }
            }

            // Check for lunch break (12:00)
            if (slot.start_minute === 12 * 60) {
                status = 'break';
                bookedBy = '';
            }

            return {
                id: Number(slot.slot_id), // Convert BigInt to number
                label: slot.label || formatTimeSlotLabel(slot.start_minute, slot.end_minute),
                status,
                bookedBy,
                start_minute: slot.start_minute,
                end_minute: slot.end_minute
            };
        });

        return NextResponse.json({
            success: true,
            data: slots,
            message: 'Court availability fetched successfully'
        });

    } catch (error) {
        console.error('Court availability API error:', error);
        return NextResponse.json(
            {
                success: false,
                data: [],
                message: 'Failed to fetch court availability'
            },
            { status: 500 }
        );
    }
}