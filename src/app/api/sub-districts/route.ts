import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';
import {
    withErrorHandler,
    CustomApiError,
    ERROR_CODES,
    HTTP_STATUS,
    successResponse
} from "@/lib/error-handler";
import { withMiddleware } from "@/lib/api-middleware";

const prisma = new PrismaClient();

interface SubDistrictRow {
    sub_district_id: bigint;
    name_th: string;
}

async function subDistrictsHandler(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const subDistrict = (searchParams.get('sub_district') || '').trim();
    const take = Number(searchParams.get('take') ?? 20);

    // Validate take parameter
    if (take < 1 || take > 1000) {
        throw new CustomApiError(
            ERROR_CODES.INVALID_PARAMETERS,
            'จำนวนข้อมูลที่ขอต้องอยู่ระหว่าง 1-1000',
            HTTP_STATUS.BAD_REQUEST
        );
    }

    const rows = await prisma.$queryRaw<SubDistrictRow[]>`
      SELECT MIN(sub_district_id) AS sub_district_id, name_th
        FROM sub_districts sd
        WHERE sd.name_th LIKE CONCAT('%', ${subDistrict}, '%')
        GROUP BY name_th
        ORDER BY name_th ASC
        LIMIT ${take};
    `;

    const data = rows.map((r) => ({
        label: r.name_th,
        value: r.sub_district_id.toString(),
    }));

    return successResponse(data);
}

export const GET = withMiddleware(
    withErrorHandler(subDistrictsHandler),
    {
        methods: ['GET'],
        rateLimit: 'default',
    }
);