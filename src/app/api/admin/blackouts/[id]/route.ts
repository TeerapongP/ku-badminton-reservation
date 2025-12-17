import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/Auth';
import { withMiddleware } from '@/lib/api-middleware';
import { CustomApiError, ERROR_CODES, HTTP_STATUS, successResponse, withErrorHandler } from '@/lib/error-handler';

const prisma = new PrismaClient();

// PUT - แก้ไข blackout
async function updateBlackoutHandler(req: NextRequest, { params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions);
    
    if (!session || (session.user.role !== "admin" && session.user.role !== "super_admin")) {
        throw new CustomApiError(
            ERROR_CODES.UNAUTHORIZED,
            'ไม่มีสิทธิ์เข้าถึง',
            HTTP_STATUS.UNAUTHORIZED
        );
    }

    const blackoutId = params.id;
    const body = await req.json();
    const { start_datetime, end_datetime, reason, active } = body;

    // ตรวจสอบว่า blackout มีอยู่จริง
    const existingBlackout = await prisma.blackouts.findUnique({
        where: { blackout_id: BigInt(blackoutId) }
    });

    if (!existingBlackout) {
        throw new CustomApiError(
            ERROR_CODES.NOT_FOUND,
            'ไม่พบการปิดสนามที่ระบุ',
            HTTP_STATUS.NOT_FOUND
        );
    }

    const updateData: any = {};

    if (start_datetime) {
        updateData.start_datetime = new Date(start_datetime);
    }

    if (end_datetime) {
        updateData.end_datetime = new Date(end_datetime);
    }

    if (reason !== undefined) {
        updateData.reason = reason;
    }

    if (active !== undefined) {
        updateData.active = active;
    }

    // ตรวจสอบวันที่ (ถ้ามีการแก้ไข)
    const startDate = updateData.start_datetime || existingBlackout.start_datetime;
    const endDate = updateData.end_datetime || existingBlackout.end_datetime;

    if (startDate >= endDate) {
        throw new CustomApiError(
            ERROR_CODES.INVALID_PARAMETERS,
            'วันที่เริ่มต้นต้องน้อยกว่าวันที่สิ้นสุด',
            HTTP_STATUS.BAD_REQUEST
        );
    }

    const blackout = await prisma.blackouts.update({
        where: { blackout_id: BigInt(blackoutId) },
        data: updateData,
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

    return successResponse(data, 'แก้ไขการปิดสนามสำเร็จ');
}

// DELETE - ลบ blackout
async function deleteBlackoutHandler(req: NextRequest, { params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions);
    
    if (!session || (session.user.role !== "admin" && session.user.role !== "super_admin")) {
        throw new CustomApiError(
            ERROR_CODES.UNAUTHORIZED,
            'ไม่มีสิทธิ์เข้าถึง',
            HTTP_STATUS.UNAUTHORIZED
        );
    }

    const blackoutId = params.id;

    // ตรวจสอบว่า blackout มีอยู่จริง
    const existingBlackout = await prisma.blackouts.findUnique({
        where: { blackout_id: BigInt(blackoutId) }
    });

    if (!existingBlackout) {
        throw new CustomApiError(
            ERROR_CODES.NOT_FOUND,
            'ไม่พบการปิดสนามที่ระบุ',
            HTTP_STATUS.NOT_FOUND
        );
    }

    await prisma.blackouts.delete({
        where: { blackout_id: BigInt(blackoutId) }
    });

    return successResponse(null, 'ลบการปิดสนามสำเร็จ');
}

export const PUT = withMiddleware(
    withErrorHandler(updateBlackoutHandler),
    {
        methods: ['PUT'],
        rateLimit: 'default',
    }
);

export const DELETE = withMiddleware(
    withErrorHandler(deleteBlackoutHandler),
    {
        methods: ['DELETE'],
        rateLimit: 'default',
    }
);