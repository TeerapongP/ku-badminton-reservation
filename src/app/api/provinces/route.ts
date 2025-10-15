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

interface ProvinceRow {
    province_id: bigint;
    province_name: string;
}

async function provincesHandler(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const districtId = searchParams.get('districtId');
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
    
    let rows: ProvinceRow[];

    if (districtId) {
        // Validate districtId
        const districtIdNum = Number(districtId);
        if (!Number.isInteger(districtIdNum) || districtIdNum <= 0) {
            throw new CustomApiError(
                ERROR_CODES.INVALID_PARAMETERS,
                'รหัสอำเภอไม่ถูกต้อง',
                HTTP_STATUS.BAD_REQUEST
            );
        }

        // Get province by district ID
        rows = await prisma.$queryRaw<ProvinceRow[]>`
            SELECT p.province_id, p.name_th AS province_name
            FROM provinces AS p
            INNER JOIN districts AS d ON d.province_id = p.province_id
            WHERE d.district_id = ${BigInt(districtId)}
        `;
    } else {
        // Search provinces by name
        rows = await prisma.$queryRaw<ProvinceRow[]>`
            SELECT province_id, name_th AS province_name
            FROM provinces
            WHERE name_th LIKE CONCAT('%', ${q}, '%')
            ORDER BY name_th ASC
            LIMIT ${take}
        `;
    }

    const data = rows.map((r) => ({
        label: r.province_name,
        value: r.province_id.toString(),
    }));

    return successResponse(data);
}

export const GET = withMiddleware(
    withErrorHandler(provincesHandler),
    {
        methods: ['GET'],
        rateLimit: 'default',
    }
);