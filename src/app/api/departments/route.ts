import { NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';

export async function GET(req: Request) {
    const prisma = new PrismaClient();

    try {
        const { searchParams } = new URL(req.url);
        const facultyId = searchParams.get('facultyId');

        if (!facultyId) {
            return NextResponse.json(
                { success: false, error: 'facultyId is required' },
                { status: 400 }
            );
        }

        const departments = await prisma.departments.findMany({
            where: {
                faculty_id: parseInt(facultyId)
            },
            select: {
                id: true,
                department_name_th: true
            },
        });

        const data = departments.map((d) => ({
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
    } finally {
        await prisma.$disconnect();
    }
}