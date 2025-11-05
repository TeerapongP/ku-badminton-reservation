import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

import {
    withErrorHandler,
    successResponse
} from "@/lib/error-handler";
import { withMiddleware } from "@/lib/api-middleware";

const prisma = new PrismaClient();

interface UnitRow {
    unit_id: bigint;
    name_th: string;
}

async function unitsHandler(req: NextRequest) {
    const rows = await prisma.$queryRaw<UnitRow[]>`
        SELECT unit_id, name_th
        FROM units 
        ORDER BY unit_id ASC 
    `;

    const data = rows.map((r) => ({
        label: r.name_th,
        name: r.name_th,
        value: r.unit_id.toString(),
    }));

    return successResponse(data);
}

export const GET = withMiddleware(
    withErrorHandler(unitsHandler),
    {
        methods: ['GET'],
        rateLimit: 'default',
    }
);
