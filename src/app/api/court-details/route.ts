// src/app/api/court-details/route.ts
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withMiddleware } from "@/lib/api-middleware";
import { CustomApiError, ERROR_CODES, HTTP_STATUS, successResponse, withErrorHandler } from "@/lib/error-handler";

// แปลง BigInt / Prisma.Decimal / object ซ้อน ๆ ให้ serialize เป็น JSON ได้
function normalizeForJson<T = any>(data: T): T {
    const isPlainObj = (v: any) =>
        v !== null && typeof v === "object" && (v.constructor === Object || Object.getPrototypeOf(v) === Object.prototype);

    const norm = (v: any): any => {
        if (typeof v === "bigint") {
            const n = Number(v);
            return Number.isSafeInteger(n) ? n : v.toString();
        }
        if (v && typeof v === "object" && "toNumber" in v && typeof (v as any).toNumber === "function") {
            try { return (v as any).toNumber(); }
            catch { return (v as any).toString(); }
        }
        if (Array.isArray(v)) return v.map(norm);
        if (isPlainObj(v)) {
            return Object.fromEntries(Object.entries(v).map(([k, val]) => [k, norm(val)]));
        }
        return v;
    };

    return norm(data);
}

async function courtDetailsHandler(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const courtIdStr = searchParams.get("courtId");

    if (!courtIdStr) {
        throw new CustomApiError(
            ERROR_CODES.MISSING_REQUIRED_FIELDS,
            "กรุณาระบุรหัสสนาม (courtId)",
            HTTP_STATUS.BAD_REQUEST
        );
    }

    const courtId = Number.parseInt(courtIdStr, 10);

    if (!Number.isSafeInteger(courtId) || courtId <= 0) {
        throw new CustomApiError(
            ERROR_CODES.INVALID_PARAMETERS,
            "รหัสสนามต้องเป็นตัวเลขบวก",
            HTTP_STATUS.BAD_REQUEST,
            { providedCourtId: courtIdStr }
        );
    }

    //  ใช้ Prisma ORM แทน $queryRaw เพื่อความปลอดภัยและ maintainability
    const court = await prisma.courts.findUnique({
        where: { court_id: BigInt(courtId) },
        select: {
            court_id:   true,
            court_code: true,
            name:       true,
            surface:    true,
            is_active:  true,
            facilities: {
                select: {
                    facility_id: true,
                    name_th:     true,
                    name_en:     true,
                }
            },
            pricing_rules: {
                where: {
                    active:         true,
                    effective_from: { lte: new Date() },
                    OR: [
                        { effective_to: null },
                        { effective_to: { gte: new Date() } },
                    ],
                },
                orderBy: [
                    { effective_from: 'desc' },
                ],
                take:   1,
                select: { price_cents: true },
            },
        },
    });

    if (!court) {
        throw new CustomApiError(
            ERROR_CODES.NOT_FOUND,
            "ไม่พบข้อมูลสนาม",
            HTTP_STATUS.NOT_FOUND,
            { courtId }
        );
    }

    //  normalize ก่อนคำนวณ เพื่อให้ Decimal ถูกแปลงเป็น number แล้วค่อยหาร 100
    const rawPriceCents = court.pricing_rules[0]?.price_cents ?? null;
    const normalizedPriceCents = normalizeForJson(rawPriceCents);
    const pricePerHour = typeof normalizedPriceCents === "number"
        ? normalizedPriceCents / 100
        : null;

    const data = {
        court_id:       court.court_id,
        courtCode:      court.court_code,
        courtName:      court.name ?? `Court ${court.court_code}`,
        surface:        court.surface,
        active:         court.is_active === true || (court.is_active as any) === 1,
        facilityId:     court.facilities.facility_id,
        building:       court.facilities.name_th,
        facilityNameTh: court.facilities.name_th,
        facilityNameEn: court.facilities.name_en,
        pricePerHour,
    };

    return successResponse(normalizeForJson(data));
}

export const GET = withMiddleware(
    withErrorHandler(courtDetailsHandler),
    {
        methods:   ['GET'],
        rateLimit: 'default',
    }
);