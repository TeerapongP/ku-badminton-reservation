import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const unitId = searchParams.get('unitId');
        const q = (searchParams.get('q') || '').trim();
        const take = Math.min(Number(searchParams.get('take') || 100), 500);

        if (!unitId) {
            return NextResponse.json(
                { success: false, error: 'unitId is required' },
                { status: 400 }
            );
        }

        const rows = await prisma.sub_units.findMany({
            where: {
                unit_id: BigInt(unitId),
                ...(q ? { name_th: { contains: q } } : {}),
            },
            select: { sub_unit_id: true, name_th: true },
            orderBy: { name_th: 'asc' },
            take,
        });

        const data = rows.map((r: { sub_unit_id: { toString: () => any; }; name_th: any; }) => ({
            label: r.name_th,
            name: r.name_th,
            value: r.sub_unit_id.toString(),
        }));

        return NextResponse.json({ success: true, data });
    } catch (err: any) {
        return NextResponse.json(
            { success: false, error: err?.message ?? 'Internal error' },
            { status: 500 }
        );
    }
}
