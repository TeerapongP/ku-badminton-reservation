import { PrismaClient } from '@/generated/prisma';
import { NextResponse } from 'next/server';
const prisma = new PrismaClient();
export async function GET(req: Request) {
    try {
        const facilities = await prisma.facilities.findMany({
            select: {
                facility_id: true,
                facility_code: true,
                name_th: true,
                name_en: true,
                active: true,
            },
            orderBy: { facility_code: 'asc' },
        });
        const data = facilities.map((f) => ({
            facility_id: f.facility_id.toString(),
            facility_code: f.facility_code,
            name_th: f.name_th,
            name_en: f.name_en,
            active: f.active,
            label: f.name_th,
            value: f.facility_id.toString(),
        }));

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error('Facilities API error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch facilities' },
            { status: 500 }
        );
    }
}
