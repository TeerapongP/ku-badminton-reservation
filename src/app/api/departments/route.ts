import { NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';

const prisma = new PrismaClient();

interface DepartmentRow {
    id: bigint;
    department_name_th: string;
    department_name_en: string | null;
}

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const facultyId = searchParams.get('facultyId');
        const q = (searchParams.get('q') || '').trim();
        const take = Number(searchParams.get('take') || 100);

        if (!facultyId) {
            return NextResponse.json(
                { success: false, error: 'facultyId is required' },
                { status: 400 }
            );
        }

        const departments = await prisma.departments.findMany({
            where: {
                faculty_id: BigInt(facultyId),
                ...(q ? {
                    OR: [
                        { department_name_th: { contains: q } },
                        { department_name_en: { contains: q } }
                    ]
                } : {})
            },
            select: {
                id: true,
                department_name_th: true,
                department_name_en: true,
            },
            orderBy: { department_name_th: 'asc' },
            take,
        });

        const data = departments.map((d) => ({
            id: d.id.toString(),
            department_name_th: d.department_name_th,
            department_name_en: d.department_name_en,
            label: d.department_name_th,
            value: d.id.toString(),
        }));

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error('Departments API error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch departments' },
            { status: 500 }
        );
    }
}