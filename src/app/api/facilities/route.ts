import { PrismaClient } from '@prisma/client';

import { NextRequest, NextResponse } from 'next/server';
import {
    withErrorHandler,
    successResponse
} from "@/lib/error-handler";
import { withMiddleware } from "@/lib/api-middleware";

const prisma = new PrismaClient();

async function facilitiesHandler(req: NextRequest) {
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
        facility_id: f.facility_id.toString(),
        facility_code: f.facility_code,
        name_th: f.name_th,
        name_en: f.name_en,
        active: f.active,
        image_path: f.image_path
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
