import { NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';

const prisma = new PrismaClient();

interface DistrictRow {
    district_id: bigint;
    district_name: string;
}

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const tambonId = searchParams.get('tambonId');
        const q = (searchParams.get('q') || '').trim();
        
        let rows: DistrictRow[];

        if (tambonId) {
            rows = await prisma.$queryRaw<DistrictRow[]>`
                SELECT d.district_id, d.name_th AS district_name
                FROM districts AS d
                INNER JOIN tambons AS t ON d.district_id = t.district_id
                WHERE t.tambon_id = ${BigInt(tambonId)}
            `;
        } else {
            // Search districts by name
            rows = await prisma.$queryRaw<DistrictRow[]>`
                SELECT district_id, name_th AS district_name
                FROM districts
                WHERE name_th LIKE CONCAT('%', ${q}, '%')
                ORDER BY name_th ASC
            `;
        }

        const data = rows.map((r) => ({
            label: r.district_name,
            value: r.district_id.toString(),
        }));

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error('Districts API error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch districts' },
            { status: 500 }
        );
    }
}