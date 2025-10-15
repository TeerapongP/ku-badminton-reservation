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

async function courtsHandler(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const facilityIdParam = searchParams.get('facilityId');
    
    if (!facilityIdParam) {
        throw new CustomApiError(
            ERROR_CODES.MISSING_REQUIRED_FIELDS,
            'กรุณาระบุรหัสสิ่งอำนวยความสะดวก (facilityId)',
            HTTP_STATUS.BAD_REQUEST
        );
    }
    
    const facilityId = parseInt(facilityIdParam, 10);
    
    if (!Number.isInteger(facilityId) || facilityId <= 0) {
        throw new CustomApiError(
            ERROR_CODES.INVALID_PARAMETERS,
            'รหัสสิ่งอำนวยความสะดวกไม่ถูกต้อง',
            HTTP_STATUS.BAD_REQUEST
        );
    }
    const courts = await prisma.courts.findMany({
        where: { facility_id: facilityId },
        select: {
            court_id: true,
            court_code: true,
            name: true,
            is_active: true,
            image_path: true,
        },
        orderBy: [{ court_id: 'asc' }],
    });

    const data = courts.map((c) => ({
        court_id: typeof c.court_id === 'bigint' ? c.court_id.toString() : c.court_id,
        court_code: c.court_code,
        name: c.name,
        is_active: c.is_active,
        image_path: c.image_path
    }));

    return successResponse(data);
}

export const GET = withMiddleware(
    withErrorHandler(courtsHandler),
    {
        methods: ['GET'],
        rateLimit: 'default',
    }
);
