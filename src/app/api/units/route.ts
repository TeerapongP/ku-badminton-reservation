import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/Auth';
import { prisma } from '@/lib/prisma'; // A05 — singleton แทน new PrismaClient()
import { withMiddleware } from '@/lib/api-middleware';
import { successResponse, withErrorHandler } from '@/lib/error-handler';

async function unitsHandler(req: NextRequest) {
    // A01 — ตรวจสอบ session ก่อนเสมอ
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        return NextResponse.json(
            { success: false, error: 'กรุณาเข้าสู่ระบบ' },
            { status: 401 }
        );
    }

    const rows = await prisma.units.findMany({
        select: {
            unit_id: true,
            name_th: true,
        },
        orderBy: { unit_id: 'asc' },
    });

    const data = rows.map((r) => ({
        label: r.name_th,
        name:  r.name_th,
        value: r.unit_id.toString(),
    }));

    return successResponse(data);
}

export const GET = withMiddleware(
    withErrorHandler(unitsHandler),
    {
        methods:   ['GET'],
        rateLimit: 'default',
    }
);