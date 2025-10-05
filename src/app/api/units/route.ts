import { NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';

const prisma = new PrismaClient();

interface UnitRow {
    unit_id: bigint;
    name_th: string;
}

export async function GET(req: Request) {
    const rows = await prisma.$queryRaw<UnitRow[]>`
        SELECT unit_id, name_th
        FROM units 
        ORDER BY name_th ASC 
    `;


    const data = rows.map((r) => ({
        label: r.name_th,
        name: r.name_th,
        value: r.unit_id.toString(),
    }));

    return NextResponse.json({ success: true, data });
}
