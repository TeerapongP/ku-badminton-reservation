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

interface DepartmentRow {
    id: bigint;
    department_name_th: string;
    department_name_en: string | null;
}

async function departmentsHandler(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const facultyId = searchParams.get('facultyId');
    const q = (searchParams.get('q') || '').trim();
    const take = Number(searchParams.get('take') || 100);

    if (!facultyId) {
        throw new CustomApiError(
            ERROR_CODES.MISSING_REQUIRED_FIELDS,
            'กรุณาระบุรหัสคณะ (facultyId)',
            HTTP_STATUS.BAD_REQUEST
        );
    }

    // Validate facultyId
    const facultyIdNum = Number(facultyId);
    if (!Number.isInteger(facultyIdNum) || facultyIdNum <= 0) {
        throw new CustomApiError(
            ERROR_CODES.INVALID_PARAMETERS,
            'รหัสคณะไม่ถูกต้อง',
            HTTP_STATUS.BAD_REQUEST
        );
    }

    // Validate take parameter
    if (take < 1 || take > 1000) {
        throw new CustomApiError(
            ERROR_CODES.INVALID_PARAMETERS,
            'จำนวนข้อมูลที่ขอต้องอยู่ระหว่าง 1-1000',
            HTTP_STATUS.BAD_REQUEST
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

    return successResponse(data);
}

export const GET = withMiddleware(
    withErrorHandler(departmentsHandler),
    {
        methods: ['GET'],
        rateLimit: 'default',
    }
);