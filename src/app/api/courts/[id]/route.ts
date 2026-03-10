// src/app/api/courts/[id]/route.ts
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/Auth";
import { prisma } from "@/lib/prisma";
import { withMiddleware } from "@/lib/api-middleware";
import { CustomApiError, ERROR_CODES, HTTP_STATUS, successResponse, withErrorHandler } from "@/lib/error-handler";
import { PricingService } from "@/lib/PricingService";
import { decode } from "@/lib/Cryto";

/**
 * Helper to get raw user ID from session (decrypt if needed)
 */
async function getRawUserId(id: string): Promise<bigint> {
    if (id.includes(':')) {
        try {
            const decoded = await decode(id);
            return BigInt(decoded);
        } catch (error) {
            console.error('[courts-id] Failed to decode user ID:', error);
            throw new Error('เซสชันไม่ถูกต้อง');
        }
    }
    return BigInt(id);
}

// แปลง BigInt / Prisma.Decimal / object ซ้อน ๆ ให้ serialize เป็น JSON ได้
function normalizeForJson(data: any): any {
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

async function courtDetailHandler(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const { id: courtIdStr } = await context.params;

    if (!courtIdStr) {
        throw new CustomApiError(
            ERROR_CODES.MISSING_REQUIRED_FIELDS,
            "กรุณาระบุรหัสสนาม",
            HTTP_STATUS.BAD_REQUEST
        );
    }

    const courtId = Number.parseInt(courtIdStr, 10);

    if (!Number.isSafeInteger(courtId) || courtId <= 0) {
        throw new CustomApiError(
            ERROR_CODES.INVALID_PARAMETERS,
            "รหัสสนามต้องเป็นตัวเลขบวก",
            HTTP_STATUS.BAD_REQUEST
        );
    }

    const session = await getServerSession(authOptions);
    let userRole: any = 'guest';
    let userMembership: any = 'non_member';

    if (session?.user?.id) {
        try {
            const userId = await getRawUserId(session.user.id);
            const user = await prisma.users.findUnique({
                where: { user_id: userId },
                select: { role: true, membership: true }
            });
            if (user) {
                userRole = user.role;
                userMembership = user.membership;
            }
        } catch (error) {
            console.error('[courts-id] Error fetching user for pricing:', error);
        }
    }

    const court = await prisma.courts.findUnique({
        where: { court_id: BigInt(courtId) },
        select: {
            court_id: true,
            court_code: true,
            name: true,
            surface: true,
            is_active: true,
            notes: true,
            facilities: {
                select: {
                    facility_id: true,
                    name_th: true,
                    name_en: true,
                }
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

    // Get pricing from PricingService
    const priceCents = await PricingService.getBookingPrice({
        facilityId: court.facilities.facility_id,
        courtId: BigInt(courtId),
        role: userRole,
        membership: userMembership
    });

    const pricePerHour = priceCents / 100;

    const data = {
        id: court.court_id,
        court_id: court.court_id,
        court_code: court.court_code,
        court_name: court.name ?? `Court ${court.court_code}`,
        name: court.name ?? `Court ${court.court_code}`,
        location: court.facilities.name_th,
        description: court.notes || court.surface || "",
        availability: court.is_active === true || (court.is_active as any) === 1,
        active: court.is_active === true || (court.is_active as any) === 1,
        facility_id: court.facilities.facility_id,
        building: court.facilities.name_th,
        facilityNameTh: court.facilities.name_th,
        facilityNameEn: court.facilities.name_en,
        pricePerHour,
    };

    return successResponse(normalizeForJson(data));
}

export const GET = withMiddleware(
    withErrorHandler(courtDetailHandler),
    {
        methods: ['GET'],
        rateLimit: 'default',
    }
);
