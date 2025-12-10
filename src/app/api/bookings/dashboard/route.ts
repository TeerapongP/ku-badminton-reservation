import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { DashboardBooking } from '@/types/booking';

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
    // Fallback or default case for safety, though technically 'available' should only be added later
    return 'available';
};

export async function GET() {
    try {
        // 1. Prepare Date and Timezone Info
        const today = new Date();
        const thailandDate = new Date(today.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
        const todayString = thailandDate.toISOString().split('T')[0];
        const dayOfWeek = thailandDate.getDay(); // 0 = Sunday, 1 = Monday, etc.

        const startOfToday = new Date(todayString);
        const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);

        // 2. Fetch all necessary data in parallel (Courts, Time Slots, and Reservations for today)
        const [
            reservationItems,
            courts,
            timeSlots
        ] = await Promise.all([
            // Fetch actual bookings for today
            prisma.reservation_items.findMany({
                include: {
                    reservations: {
                        include: {
                            users: {
                                select: {
                                    user_id: true,
                                    first_name: true,
                                    last_name: true,
                                    email: true,
                                    phone: true
                                }
                            }
                        }
                    },
                    courts: {
                        select: {
                            court_id: true,
                            court_code: true,
                            name: true
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
                },
                where: {
                    play_date: {
                        gte: startOfToday,
                        lt: endOfToday
                    }
                },
                // Removed redundant orderBy here, will sort allBookings at the end
            }),
            // Get all active courts
            prisma.courts.findMany({
                select: { court_id: true, court_code: true, name: true },
                where: { is_active: true },
                orderBy: { court_code: 'asc' }
            }),
            // Get all active time slots for today's weekday
            prisma.time_slots.findMany({
                select: { slot_id: true, start_minute: true, end_minute: true, label: true },
                where: {
                    is_active: true,
                    weekday: dayOfWeek
                },
                orderBy: { start_minute: 'asc' }
            })
        ]);

        // 3. Process Bookings and Create a Set for Occupied Slots
        const allBookings: DashboardBooking[] = [];
        const occupiedSlots = new Set<string>(); // Key: 'courtNumber-timeSlotString'

        reservationItems.forEach(item => {
            const user = item.reservations.users;
            const court = item.courts;
            const timeSlot = item.time_slots;

            const courtNumber = Number.parseInt(court.court_code.replaceAll(/\D/g, '')) || 1;
            const timeSlotString = minutesToTime(timeSlot.start_minute);

            allBookings.push({
                id: item.item_id.toString(),
                court_number: courtNumber,
                court_name: court.name || `สนามแบดมินตัน ${courtNumber}`,
                date: item.play_date.toISOString().split('T')[0],
                time_slot: timeSlotString,
                user_name: `${user.first_name} ${user.last_name}`,
                status: mapReservationStatus(item.reservations.status, item.status),
                created_at: item.created_at.toISOString()
            });

            // Mark this specific court and time slot as occupied
            occupiedSlots.add(`${courtNumber}-${timeSlotString}`);
        });

        // 4. Fill in Available Slots
        courts.forEach(court => {
            const courtNumber = Number.parseInt(court.court_code.replaceAll(/\D/g, '')) || 1;
            const courtName = court.name || `สนามแบดมินตัน ${courtNumber}`;

            timeSlots.forEach(slot => {
                const timeSlotString = minutesToTime(slot.start_minute);
                const key = `${courtNumber}-${timeSlotString}`;

                if (!occupiedSlots.has(key)) {
                    // Only push an 'available' slot if it hasn't been booked
                    allBookings.push({
                        id: `available-${court.court_id}-${slot.slot_id}`,
                        court_number: courtNumber,
                        court_name: courtName,
                        date: todayString,
                        time_slot: timeSlotString,
                        user_name: '',
                        status: 'available',
                        created_at: new Date().toISOString() // Use current time for creation timestamp of "available" slot
                    });
                }
            });
        });

        // 5. Final Sort (By Court Number then Time Slot)
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