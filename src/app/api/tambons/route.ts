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

interface TambonRow {
    tambon_id: bigint;
    name_th: string;
}

async function tambonsHandler(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const tambon = (searchParams.get('tambon') || '').trim();
    const take = Number(searchParams.get('take') ?? 20);

    // Validate take parameter
    if (take < 1 || take > 1000) {
        throw new CustomApiError(
            ERROR_CODES.INVALID_PARAMETERS,
            'จำนวนข้อมูลที่ขอต้องอยู่ระหว่าง 1-1000',
            HTTP_STATUS.BAD_REQUEST
        );
    }

    const rows = await prisma.$queryRaw<TambonRow[]>`
      SELECT MIN(tambon_id) AS tambon_id, name_th
        FROM tambons t
        WHERE t.name_th LIKE CONCAT('%', ${tambon}, '%')
        GROUP BY name_th
        ORDER BY name_th ASC
        LIMIT ${take};
    `;

    const data = rows.map((r) => ({
        label: r.name_th,
        value: r.tambon_id.toString(),
    }));

    return successResponse(data);
}

export const GET = withMiddleware(
    withErrorHandler(tambonsHandler),
    {
        methods: ['GET'],
        rateLimit: 'default',
    }
);