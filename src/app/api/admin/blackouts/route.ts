import { NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { withMiddleware } from '@/lib/api-middleware';
import { authOptions } from '@/lib/Auth';
import { CustomApiError, ERROR_CODES, HTTP_STATUS, successResponse, withErrorHandler } from '@/lib/error-handler';


const prisma = new PrismaClient();

// GET - ดึงข้อมูล blackouts
async function getBlackoutsHandler(req: NextRequest) {
    const session = await getServerSession(authOptions);
    
    if (!session || (session.user.role !== "admin" && session.user.role !== "super_admin")) {
        throw new CustomApiError(
            ERROR_CODES.UNAUTHORIZED,
            'ไม่มีสิทธิ์เข้าถึง',
            HTTP_STATUS.UNAUTHORIZED
        );
    }

    const { searchParams } = new URL(req.url);
    const facilityId = searchParams.get('facilityId');
    const courtId = searchParams.get('courtId');

    const whereClause: any = {
        active: true
    };

    if (facilityId) {
        whereClause.facility_id = BigInt(facilityId);
    }

    if (courtId) {
        whereClause.court_id = BigInt(courtId);
    }

    const blackouts = await prisma.blackouts.findMany({
        where: whereClause,
        include: {
            facilities: {
                select: {
                    name_th: true,
                    facility_code: true
                }
            },
            courts: {
                select: {
                    name: true,
                    court_code: true
                }
            }
        },
        orderBy: {
            start_datetime: 'asc'
        }
    });

    const data = blackouts.map(blackout => ({
        blackout_id: blackout.blackout_id.toString(),
        facility_id: blackout.facility_id.toString(),
        facility_name: blackout.facilities.name_th,
        facility_code: blackout.facilities.facility_code,
        court_id: blackout.court_id?.toString() || null,
        court_name: blackout.courts?.name || blackout.courts?.court_code || null,
        start_datetime: blackout.start_datetime.toISOString(),
        end_datetime: blackout.end_datetime.toISOString(),
        reason: blackout.reason,
        active: blackout.active,
        created_at: blackout.created_at.toISOString(),
        updated_at: blackout.updated_at.toISOString()
    }));

    return successResponse(data);
}

// POST - สร้าง blackout ใหม่
async function createBlackoutHandler(req: NextRequest) {
    const session = await getServerSession(authOptions);
    
    if (!session || (session.user.role !== "admin" && session.user.role !== "super_admin")) {
        throw new CustomApiError(
            ERROR_CODES.UNAUTHORIZED,
            'ไม่มีสิทธิ์เข้าถึง',
            HTTP_STATUS.UNAUTHORIZED
        );
    }

    const body = await req.json();
    const { facility_id, court_id, start_datetime, end_datetime, reason } = body;

    // Validation
    if (!facility_id || !start_datetime || !end_datetime) {
        throw new CustomApiError(
            ERROR_CODES.MISSING_REQUIRED_FIELDS,
            'กรุณากระบุข้อมูลที่จำเป็น',
            HTTP_STATUS.BAD_REQUEST
        );
    }

    const startDate = new Date(start_datetime);
    const endDate = new Date(end_datetime);

    if (startDate >= endDate) {
        throw new CustomApiError(
            ERROR_CODES.INVALID_PARAMETERS,
            'วันที่เริ่มต้นต้องน้อยกว่าวันที่สิ้นสุด',
            HTTP_STATUS.BAD_REQUEST
        );
    }

    // ตรวจสอบว่า facility มีอยู่จริง
    const facility = await prisma.facilities.findUnique({
        where: { facility_id: BigInt(facility_id) }
    });

    if (!facility) {
        throw new CustomApiError(
            ERROR_CODES.NOT_FOUND,
            'ไม่พบอาคารที่ระบุ',
            HTTP_STATUS.NOT_FOUND
        );
    }

    // ตรวจสอบว่า court มีอยู่จริง (ถ้าระบุ)
    if (court_id) {
        const court = await prisma.courts.findUnique({
            where: { court_id: BigInt(court_id) }
        });

        if (!court || court.facility_id !== BigInt(facility_id)) {
            throw new CustomApiError(
                ERROR_CODES.NOT_FOUND,
                'ไม่พบสนามที่ระบุในอาคารนี้',
                HTTP_STATUS.NOT_FOUND
            );
        }
    }

    const blackout = await prisma.blackouts.create({
        data: {
            facility_id: BigInt(facility_id),
            court_id: court_id ? BigInt(court_id) : null,
            start_datetime: startDate,
            end_datetime: endDate,
            reason: reason || null,
            active: true
        },
        include: {
            facilities: {
                select: {
                    name_th: true,
                    facility_code: true
                }
            },
            courts: {
                select: {
                    name: true,
                    court_code: true
                }
            }
        }
    });

    const data = {
        blackout_id: blackout.blackout_id.toString(),
        facility_id: blackout.facility_id.toString(),
        facility_name: blackout.facilities.name_th,
        facility_code: blackout.facilities.facility_code,
        court_id: blackout.court_id?.toString() || null,
        court_name: blackout.courts?.name || blackout.courts?.court_code || null,
        start_datetime: blackout.start_datetime.toISOString(),
        end_datetime: blackout.end_datetime.toISOString(),
        reason: blackout.reason,
        active: blackout.active,
        created_at: blackout.created_at.toISOString(),
        updated_at: blackout.updated_at.toISOString()
    };

    return successResponse(data, 'สร้างการปิดสนามสำเร็จ');
}

export const GET = withMiddleware(
    withErrorHandler(getBlackoutsHandler),
    {
        methods: ['GET'],
        rateLimit: 'default',
    }
);

export const POST = withMiddleware(
    withErrorHandler(createBlackoutHandler),
    {
        methods: ['POST'],
        rateLimit: 'default',
    }
);