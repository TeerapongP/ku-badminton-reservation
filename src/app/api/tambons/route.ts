import { NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';

const prisma = new PrismaClient();

interface TambonRow {
    tambon_id: bigint;
    name_th: string;
}

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const tambon = (searchParams.get('q') || '').trim();
        const take = Number(searchParams.get('take') ?? 20);

        const rows = await prisma.$queryRaw<TambonRow[]>`
            SELECT tambon_id, name_th
            FROM tambons t
            WHERE t.name_th LIKE CONCAT('%', ${tambon}, '%')
            ORDER BY name_th ASC
            LIMIT ${take}
        `;

        const data = rows.map((r) => ({
            label: r.name_th,
            value: r.tambon_id.toString(),
        }));

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error('Tambons API error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch tambons' },
            { status: 500 }
        );
    }
}