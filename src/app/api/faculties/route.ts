import { PrismaClient } from '@/generated/prisma';

import { NextResponse } from 'next/server';

export async function GET() {
    const prisma = new PrismaClient();
    try {
        const faculties = await prisma.faculties.findMany({
            select: {
                id: true,
                faculty_name_th: true
            },
        });

        const data = faculties.map((f: { faculty_name_th: any; id: { toString: () => any; }; }) => ({
            label: f.faculty_name_th,
            value: f.id.toString(),
        }));

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error('Faculties API error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch faculties' },
            { status: 500 }
        );
    } finally {
        await prisma.$disconnect();
    }
}