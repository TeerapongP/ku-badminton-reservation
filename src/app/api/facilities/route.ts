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
                image_path: true,
            },
            orderBy: { facility_code: 'asc' },
        });
        const data = facilities.map((f) => ({
            facility_id: f.facility_id.toString(),
            facility_code: f.facility_code,
            name_th: f.name_th,
            name_en: f.name_en,
            active: f.active,
            image_path: f.image_path
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
