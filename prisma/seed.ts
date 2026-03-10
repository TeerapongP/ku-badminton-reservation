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
    // 2. COURTS  — แก้ where ให้ใช้ compound key ที่ถูกต้อง
    // ============================================================
    const courts1 = ['BD1-C1', 'BD1-C2', 'BD1-C3', 'BD1-C4']
    const courts2 = ['BD2-C1', 'BD2-C2', 'BD2-C3', 'BD2-C4']
    const extraCourts = ['BD2-C5', 'BD2-C6', 'BD2-C7', 'BD2-C8', 'BD2-C9', 'BD2-C10', 'BD2-C11', 'BD2-C12', 'BD2-C13', 'BD2-C14', 'BD2-C15', 'BD2-C16', 'BD2-C17', 'BD2-C18', 'BD2-C19', 'BD2-C20', 'BD2-C21', 'BD2-C22']

    for (let i = 0; i < courts1.length; i++) {
        await prisma.courts.upsert({
            where: {
                facility_id_court_code: {          // ← ชื่อนี้ตาม error message
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
                facility_id_court_code: {          // ← ชื่อนี้ตาม error message
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
    for (let i = 0; i < extraCourts.length; i++) {
        await prisma.courts.upsert({
            where: {
                facility_id_court_code: {
                    facility_id: badminton2.facility_id,
                    court_code: extraCourts[i],
                },
            },
            update: {},
            create: {
                facility_id: badminton2.facility_id,
                court_code: extraCourts[i],
                name: `คอร์ท ${4 + i + 1}`,  // คอร์ท 5 - 10
                surface: 'synthetic',
                is_active: true,
            },
        })
    }
    console.log('✅ Courts created: 4 courts each facility')

    // ============================================================
    // 3. PRICING RULES
    // สนามแบดมินตัน 1 (ไม่มีแอร์)
    // ============================================================
    const pricingBD1 = [
        // student
        { user_role: 'student' as const, membership: 'member' as const, price_cents: 4000 },
        { user_role: 'student' as const, membership: 'non_member' as const, price_cents: 6000 },
        // staff
        { user_role: 'staff' as const, membership: 'member' as const, price_cents: 4000 },
        { user_role: 'staff' as const, membership: 'non_member' as const, price_cents: 6000 },
        // public
        { user_role: 'public' as const, membership: 'member' as const, price_cents: 6000 },
        { user_role: 'public' as const, membership: 'non_member' as const, price_cents: 8000 },
    ]

    for (const rule of pricingBD1) {
        await prisma.pricing_rules.create({
            data: {
                facility_id: badminton1.facility_id,
                user_role: rule.user_role,
                membership: rule.membership,
                price_cents: rule.price_cents,
                currency: 'THB',
                active: true,
            },
        })
    }

    console.log('✅ Pricing rules created for BADMINTON-1')

    // ============================================================
    // 4. PRICING RULES
    // สนามแบดมินตัน 2 (แยกเปิด/ไม่เปิดแอร์ — เก็บใน notes)
    // ใช้ 2 ชุด: weekday = null หมายถึงทุกวัน
    // เนื่องจาก schema ไม่มี field AC ให้ใช้ pricing_rules 2 ชุด
    // แยกด้วย weekday placeholder หรือ court_id ก็ได้
    // แต่ที่สะอาดสุดคือแยก facility เป็น sub-facility หรือรอ schema เพิ่ม
    // → ตอนนี้ seed ราคา "ไม่เปิดแอร์" เป็น default ก่อน
    // ============================================================
    const pricingBD2 = [
        // student
        { user_role: 'student' as const, membership: 'member' as const, price_cents: 5000 },
        { user_role: 'student' as const, membership: 'non_member' as const, price_cents: 8000 },
        // staff
        { user_role: 'staff' as const, membership: 'member' as const, price_cents: 5000 },
        { user_role: 'staff' as const, membership: 'non_member' as const, price_cents: 8000 },
        // public
        { user_role: 'public' as const, membership: 'member' as const, price_cents: 8000 },
        { user_role: 'public' as const, membership: 'non_member' as const, price_cents: 12000 },
    ]

    for (const rule of pricingBD2) {
        await prisma.pricing_rules.create({
            data: {
                facility_id: badminton2.facility_id,
                user_role: rule.user_role,
                membership: rule.membership,
                price_cents: rule.price_cents,
                currency: 'THB',
                active: true,
            },
        })
    }

    // เพิ่มใน prisma/seed.ts หรือรันแยก

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