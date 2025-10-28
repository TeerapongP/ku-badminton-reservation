import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

import {
    withErrorHandler,
    CustomApiError,
    ERROR_CODES,
    HTTP_STATUS,
    successResponse
} from "@/lib/error-handler";
import { withMiddleware } from "@/lib/api-middleware";

const prisma = new PrismaClient();

interface FacultyRow {
    id: bigint;
    faculty_name_th: string;
    faculty_name_en: string | null;
}

async function facultiesHandler(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') || '').trim();
    const take = Number(searchParams.get('take') || 100);

    // Validate take parameter
    if (take < 1 || take > 1000) {
        throw new CustomApiError(
            ERROR_CODES.INVALID_PARAMETERS,
            'จำนวนข้อมูลที่ขอต้องอยู่ระหว่าง 1-1000',
            HTTP_STATUS.BAD_REQUEST
        );
    }

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

    return successResponse(data);
}

export const GET = withMiddleware(
    withErrorHandler(facultiesHandler),
    {
        methods: ['GET'],
        rateLimit: 'default',
    }
);