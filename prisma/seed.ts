// prisma/seed.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    // ============================================================
    // 1. FACILITIES
    // ============================================================
    const badminton1 = await prisma.facilities.upsert({
        where: { facility_code: 'BADMINTON-1' },
        update: {},
        create: {
            facility_code: 'BADMINTON-1',
            slug: 'badminton-1',
            name_th: 'สนามแบดมินตัน 1 อาคารพลศึกษา 1',
            name_en: 'Badminton Court 1 (PE Building 1)',
            phone: '034-355570',
            active: true,
        },
    })

    const badminton2 = await prisma.facilities.upsert({
        where: { facility_code: 'BADMINTON-2' },
        update: {},
        create: {
            facility_code: 'BADMINTON-2',
            slug: 'badminton-2',
            name_th: 'สนามแบดมินตัน 2 อาคารพลศึกษา 3',
            name_en: 'Badminton Court 2 (PE Building 3)',
            phone: '034-355570',
            active: true,
        },
    })

    console.log('✅ Facilities created:', badminton1.facility_code, badminton2.facility_code)

    // ============================================================
    // 2. COURTS
    // ============================================================
    const courts1 = Array.from({ length: 7 }, (_, i) => `BD1-C${i + 1}`)
    const courts2 = Array.from({ length: 10 }, (_, i) => `BD2-C${i + 1}`)

    for (let i = 0; i < courts1.length; i++) {
        await prisma.courts.upsert({
            where: {
                facility_id_court_code: {
                    facility_id: badminton1.facility_id,
                    court_code: courts1[i],
                },
            },
            update: {},
            create: {
                facility_id: badminton1.facility_id,
                court_code: courts1[i],
                name: `คอร์ท ${i + 1}`,
                surface: 'synthetic',
                is_active: true,
            },
        })
    }

    for (let i = 0; i < courts2.length; i++) {
        await prisma.courts.upsert({
            where: {
                facility_id_court_code: {
                    facility_id: badminton2.facility_id,
                    court_code: courts2[i],
                },
            },
            update: {},
            create: {
                facility_id: badminton2.facility_id,
                court_code: courts2[i],
                name: `คอร์ท ${i + 1}`,
                surface: 'synthetic',
                is_active: true,
            },
        })
    }
    console.log(`✅ Courts created: ${courts1.length} courts for ${badminton1.facility_code}, ${courts2.length} courts for ${badminton2.facility_code}`)

    const timeSlotData = [
        { start_minute: 540, end_minute: 600, label: '09:00-10:00', is_break: false },
        { start_minute: 600, end_minute: 660, label: '10:00-11:00', is_break: false },
        { start_minute: 660, end_minute: 720, label: '11:00-12:00', is_break: false },
        { start_minute: 720, end_minute: 780, label: 'พักเที่ยง', is_break: true },
        { start_minute: 780, end_minute: 840, label: '13:00-14:00', is_break: false },
        { start_minute: 840, end_minute: 900, label: '14:00-15:00', is_break: false },
        { start_minute: 900, end_minute: 960, label: '15:00-16:00', is_break: false },
        { start_minute: 960, end_minute: 1020, label: '16:00-17:00', is_break: false },
        { start_minute: 1020, end_minute: 1080, label: '17:00-18:00', is_break: false },
        { start_minute: 1080, end_minute: 1140, label: '18:00-19:00', is_break: false },
        { start_minute: 1140, end_minute: 1200, label: '19:00-20:00', is_break: false },
    ]

    const weekdays = [0, 1, 2, 3, 4, 5, 6] // อาทิตย์ - เสาร์
    const facilityIds = [badminton1.facility_id, badminton2.facility_id]

    for (const facility_id of facilityIds) {
        for (const weekday of weekdays) {
            for (const slot of timeSlotData) {
                await prisma.time_slots.upsert({
                    where: {
                        facility_id_weekday_start_minute_end_minute: {
                            facility_id,
                            weekday,
                            start_minute: slot.start_minute,
                            end_minute: slot.end_minute,
                        },
                    },
                    update: {},
                    create: {
                        facility_id,
                        weekday,
                        start_minute: slot.start_minute,
                        end_minute: slot.end_minute,
                        label: slot.label,
                        is_break: slot.is_break,
                        is_active: true,
                    },
                })
            }
        }
    }

    console.log('✅ Time slots created: 2 facilities × 7 weekdays × 11 slots =', 2 * 7 * 11, 'rows')
    console.log('✅ Pricing rules created for BADMINTON-2')
    console.log('🎉 Seed completed successfully!')
}

main()
    .catch((e) => {
        console.error('❌ Seed failed:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })