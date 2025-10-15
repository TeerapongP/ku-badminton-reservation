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

interface PostcodeRow {
    postcode_id: bigint;
    postcode: string;
}

async function postcodesHandler(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const tambonId = searchParams.get('tambonId');

    if (!tambonId) {
        throw new CustomApiError(
            ERROR_CODES.MISSING_REQUIRED_FIELDS,
            'กรุณาระบุรหัสตำบล (tambonId)',
            HTTP_STATUS.BAD_REQUEST
        );
    }

    // Validate tambonId
    const tambonIdNum = Number(tambonId);
    if (!Number.isInteger(tambonIdNum) || tambonIdNum <= 0) {
        throw new CustomApiError(
            ERROR_CODES.INVALID_PARAMETERS,
            'รหัสตำบลไม่ถูกต้อง',
            HTTP_STATUS.BAD_REQUEST
        );
    }

    const rows = await prisma.$queryRaw<PostcodeRow[]>`
        SELECT p.postcode_id, p.postcode 
        FROM postcodes p 
        WHERE p.tambon_id = ${BigInt(tambonId)}
    `;

    const data = rows.map((r) => ({
        label: r.postcode,
        value: r.postcode_id.toString(),
    }));

    return successResponse(data);
}

export const GET = withMiddleware(
    withErrorHandler(postcodesHandler),
    {
        methods: ['GET'],
        rateLimit: 'default',
    }
);