import { NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';

const prisma = new PrismaClient();

interface PostcodeRow {
    postcode_id: bigint;
    postcode: string;
}

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const tambonId = searchParams.get('tambonId');

        if (!tambonId) {
            return NextResponse.json(
                { success: false, error: 'tambonId is required' },
                { status: 400 }
            );
        }

        const rows = await prisma.$queryRaw<PostcodeRow[]>`
            SELECT p.postcode_id, p.postcode 
            FROM postcodes p 
            WHERE p.tambon_id = ${BigInt(tambonId)}
        `;

        const data = rows.map((r) => ({
            label: r.postcode,
            value: r.postcode_id.toLocaleString(),
        }));

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error('Postcodes API error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch postcodes' },
            { status: 500 }
        );
    }
}