import { withMiddleware } from '@/lib/api-middleware';
import { successResponse, withErrorHandler } from '@/lib/error-handler';
import { prisma } from '@/lib/prisma'; // A05 — ใช้ singleton แทน new PrismaClient()
import { authOptions } from '@/lib/Auth';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';

async function facilitiesHandler(req: NextRequest) {
    // A01 — ตรวจสอบ session ก่อนเสมอ
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        return NextResponse.json(
            { success: false, error: 'กรุณาเข้าสู่ระบบ' },
            { status: 401 }
        );
    }

    const facilities = await prisma.facilities.findMany({
        select: {
            facility_id: true,
            facility_code: true,
            name_th: true,
            name_en: true,
            active: true,
            image_path: true,
        },
        orderBy: { facility_code: 'asc' },
    });

    const data = facilities.map((f) => ({
        facility_id:   f.facility_id.toString(),
        facility_code: f.facility_code,
        name_th:       f.name_th,
        name_en:       f.name_en,
        active:        f.active,
        image_path:    f.image_path,
    }));

    return successResponse(data);
}

export const GET = withMiddleware(
    withErrorHandler(facilitiesHandler),
    {
        methods: ['GET'],
        rateLimit: 'default',
    }
);