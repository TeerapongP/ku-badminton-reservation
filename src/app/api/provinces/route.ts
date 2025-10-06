import { NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';

const prisma = new PrismaClient();

interface ProvinceRow {
    province_id: bigint;
    province_name: string;
}

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const districtId = searchParams.get('districtId');
        const q = (searchParams.get('q') || '').trim();
        
        let rows: ProvinceRow[];

        if (districtId) {
            // Get province by district ID
            rows = await prisma.$queryRaw<ProvinceRow[]>`
                SELECT p.province_id, p.name_th AS province_name
                FROM provinces AS p
                INNER JOIN districts AS d ON d.province_id = p.province_id
                WHERE d.district_id = ${BigInt(districtId)}
            `;
        } else {
            // Search provinces by name
            const take = Number(searchParams.get('take') || 100);
            rows = await prisma.$queryRaw<ProvinceRow[]>`
                SELECT province_id, name_th AS province_name
                FROM provinces
                WHERE name_th LIKE CONCAT('%', ${q}, '%')
                ORDER BY name_th ASC
                LIMIT ${take}
            `;
        }

        const data = rows.map((r) => ({
            label: r.province_name,
            value: r.province_id.toString(),
        }));

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error('Provinces API error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch provinces' },
            { status: 500 }
        );
    }
}