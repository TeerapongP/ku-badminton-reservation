import { NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';

const prisma = new PrismaClient();

interface FacultyRow {
    id: bigint;
    faculty_name_th: string;
    faculty_name_en: string | null;
}

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const q = (searchParams.get('q') || '').trim();
        const take = Number(searchParams.get('take') || 100);

        const faculties = await prisma.faculties.findMany({
            where: {
                status: 'active',
                ...(q ? {
                    OR: [
                        { faculty_name_th: { contains: q } },
                        { faculty_name_en: { contains: q } }
                    ]
                } : {})
            },
            select: {
                id: true,
                faculty_name_th: true,
                faculty_name_en: true,
            },
            orderBy: { faculty_name_th: 'asc' },
            take,
        });

        const data = faculties.map((f) => ({
            id: f.id.toString(),
            faculty_name_th: f.faculty_name_th,
            faculty_name_en: f.faculty_name_en,
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
    }
}