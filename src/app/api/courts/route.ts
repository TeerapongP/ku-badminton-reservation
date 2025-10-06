import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const facilityIdParam = searchParams.get('facilityId');
    const facilityId = parseInt(facilityIdParam ?? "", 10);

    try {
        const courts = await prisma.courts.findMany({
            where: { facility_id: facilityId },
            select: {
                court_id: true,
                court_code: true,
                name: true,
                is_active: true,
            },
            orderBy: [{ court_code: 'asc' }, { court_id: 'asc' }],
        });

        const data = courts.map((c) => ({
            court_id: typeof c.court_id === 'bigint' ? c.court_id.toString() : c.court_id,
            court_code: c.court_code,
            name: c.name,
            is_active: c.is_active,
        }));

        return NextResponse.json({ success: true, data });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: 'Failed to fetch courts' },
            { status: 500 }
        );
    } finally {
        await prisma.$disconnect();
    }
}
