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

interface DistrictRow {
    district_id: bigint;
    district_name: string;
}

async function districtsHandler(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const tambonId = searchParams.get('tambonId');
    const q = (searchParams.get('q') ?? '').trim();
    
    let rows: DistrictRow[];

    if (tambonId) {
        // Validate tambonId
        const tambonIdNum = Number(tambonId);
        if (!Number.isInteger(tambonIdNum) || tambonIdNum <= 0) {
            throw new CustomApiError(
                ERROR_CODES.INVALID_PARAMETERS,
                'รหัสตำบลไม่ถูกต้อง',
                HTTP_STATUS.BAD_REQUEST
            );
        }

        rows = await prisma.$queryRaw<DistrictRow[]>`
            SELECT d.district_id, d.name_th AS district_name
            FROM districts AS d
            INNER JOIN tambons AS t ON d.district_id = t.district_id
            WHERE t.tambon_id = ${BigInt(tambonId)}
        `;
    } else {
        // Search districts by name
        rows = await prisma.$queryRaw<DistrictRow[]>`
            SELECT district_id, name_th AS district_name
            FROM districts
            WHERE name_th LIKE CONCAT('%', ${q}, '%')
            ORDER BY name_th ASC
        `;
    }

    const data = rows.map((r) => ({
        label: r.district_name,
        value: r.district_id.toString(),
    }));

    return successResponse(data);
}

export const GET = withMiddleware(
    withErrorHandler(districtsHandler),
    {
        methods: ['GET'],
        rateLimit: 'default',
    }
);