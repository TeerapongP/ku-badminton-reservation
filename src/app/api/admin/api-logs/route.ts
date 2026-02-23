import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/Auth';
import { decode } from '@/lib/Cryto';
import { CustomApiError, ERROR_CODES, HTTP_STATUS, successResponse, withErrorHandler } from '@/lib/error-handler';
import { prisma } from '@/lib/prisma';

// ─── Constants ────────────────────────────────────────────────────────────────

const ADMIN_ROLES   = new Set(['admin', 'super_admin']);
const VALID_METHODS = new Set(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']);
const MAX_LIMIT     = 100;
const DEFAULT_LIMIT = 50;
const DEFAULT_PAGE  = 1;

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function resolveRole(encrypted: string | undefined | null): Promise<string | null> {
    if (!encrypted) return null;
    try {
        return await decode(encrypted);
    } catch {
        console.error('[api-logs] Failed to decode role');
        return null;
    }
}

function parsePositiveInt(value: string | null, fallback: number): number {
    if (!value) return fallback;
    const parsed = parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseSafeDate(value: string | null): Date | null {
    if (!value) return null;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
}

// ─── Handler ──────────────────────────────────────────────────────────────────

async function apiLogsHandler(request: NextRequest) {
    //  decode role ก่อน compare (A02)
    const session = await getServerSession(authOptions);
    const role    = await resolveRole(session?.user?.role);

    if (!session?.user || !ADMIN_ROLES.has(role ?? '')) {
        throw new CustomApiError(
            ERROR_CODES.UNAUTHORIZED,
            'ไม่มีสิทธิ์เข้าถึง',
            HTTP_STATUS.FORBIDDEN
        );
    }

    //  ใช้ request.nextUrl แทน new URL(request.url)
    const { searchParams } = request.nextUrl;

    //  A03: validate และ clamp pagination
    const page  = parsePositiveInt(searchParams.get('page'), DEFAULT_PAGE);
    const limit = Math.min(
        parsePositiveInt(searchParams.get('limit'), DEFAULT_LIMIT),
        MAX_LIMIT
    );

    if (page < 1 || limit < 1) {
        throw new CustomApiError(
            ERROR_CODES.VALIDATION_ERROR,
            'ค่า page และ limit ไม่ถูกต้อง',
            HTTP_STATUS.BAD_REQUEST
        );
    }

    //  A03: whitelist HTTP method — กัน injection ผ่าน method filter
    const rawMethod = searchParams.get('method')?.toUpperCase() ?? null;
    const method    = rawMethod && VALID_METHODS.has(rawMethod) ? rawMethod : null;

    //  A03: validate statusCode เป็น HTTP range จริงๆ
    const rawStatus = searchParams.get('statusCode');
    const statusCode = rawStatus !== null
        ? (() => {
            const n = parseInt(rawStatus, 10);
            return n >= 100 && n <= 599 ? n : null;
        })()
        : null;

    //  A03: validate userId เป็น numeric string ก่อน BigInt
    const rawUserId = searchParams.get('userId');
    const userId    = rawUserId && /^\d+$/.test(rawUserId) ? BigInt(rawUserId) : null;

    //  A03: validate dates
    const startDate = parseSafeDate(searchParams.get('startDate'));
    const endDate   = parseSafeDate(searchParams.get('endDate'));

    if (startDate && endDate && startDate > endDate) {
        throw new CustomApiError(
            ERROR_CODES.VALIDATION_ERROR,
            'startDate ต้องน้อยกว่า endDate',
            HTTP_STATUS.BAD_REQUEST
        );
    }

    //  A03: validate response time เป็น positive int
    const minResponseTime = parsePositiveInt(searchParams.get('minResponseTime'), 0) || null;
    const maxResponseTime = parsePositiveInt(searchParams.get('maxResponseTime'), 0) || null;

    //  path ใช้ contains — Prisma จัดการ parameterized query ให้อยู่แล้ว (กัน SQL injection)
    const path = searchParams.get('path') ?? null;

    // ─── Build where ──────────────────────────────────────────────────────────

    const where = {
        ...(method     && { method }),
        ...(path       && { path: { contains: path } }),
        ...(statusCode && { status_code: statusCode }),
        ...(userId     && { user_id: userId }),
        ...((startDate || endDate) && {
            created_at: {
                ...(startDate && { gte: startDate }),
                ...(endDate   && { lte: endDate }),
            }
        }),
        ...((minResponseTime || maxResponseTime) && {
            response_time_ms: {
                ...(minResponseTime && { gte: minResponseTime }),
                ...(maxResponseTime && { lte: maxResponseTime }),
            }
        }),
    } satisfies import('@prisma/client').Prisma.api_logsWhereInput;

    try {
        const skip = (page - 1) * limit;

        //  ดึง count + logs + stats แบบ parallel
        const [totalCount, apiLogs, stats, statusDistribution] = await Promise.all([
            prisma.api_logs.count({ where }),

            prisma.api_logs.findMany({
                where,
                include: {
                    users: {
                        select: {
                            user_id:    true,
                            username:   true,
                            first_name: true,
                            last_name:  true,
                            role:       true,
                            //  ไม่ส่ง email กลับ — ลด data exposure (A02)
                        }
                    }
                },
                orderBy: { created_at: 'desc' },
                skip,
                take: limit,
            }),

            prisma.api_logs.aggregate({
                where,
                _avg: { response_time_ms: true },
                _max: { response_time_ms: true },
                _min: { response_time_ms: true },
            }),

            prisma.api_logs.groupBy({
                by:      ['status_code'],
                where,
                _count:  { status_code: true },
                orderBy: { status_code: 'asc' },
            }),
        ]);

        const totalPages = Math.ceil(totalCount / limit);

        const formattedLogs = apiLogs.map(log => ({
            id:             log.log_id.toString(),
            method:         log.method,
            path:           log.path,
            queryParams:    log.query_params,
            ip:             log.ip,
            userAgent:      log.user_agent,
            userId:         log.user_id?.toString() ?? null,
            statusCode:     log.status_code,
            responseTimeMs: log.response_time_ms,
            errorMessage:   log.error_message,
            requestSize:    log.request_size,
            responseSize:   log.response_size,
            createdAt:      log.created_at.toISOString(),
            user: log.users ? {
                id:       log.users.user_id.toString(),
                username: log.users.username,
                name:     `${log.users.first_name} ${log.users.last_name}`.trim(),
                role:     log.users.role,
                //  email ถูกตัดออก
            } : null,
        }));

        return successResponse({
            logs: formattedLogs,
            pagination: {
                page,
                limit,
                totalCount,
                totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1,
            },
            statistics: {
                avgResponseTime:    stats._avg.response_time_ms,
                maxResponseTime:    stats._max.response_time_ms,
                minResponseTime:    stats._min.response_time_ms,
                statusDistribution: statusDistribution.map(item => ({
                    statusCode: item.status_code,
                    count:      item._count.status_code,
                })),
            },
            //  echo กลับเฉพาะ validated values ไม่ใช่ raw input
            filters: {
                method,
                path,
                statusCode,
                userId:          userId?.toString() ?? null,
                startDate:       startDate?.toISOString() ?? null,
                endDate:         endDate?.toISOString()   ?? null,
                minResponseTime,
                maxResponseTime,
            },
        }, 'ดึงข้อมูล API logs สำเร็จ');

    } catch (error) {
        if (error instanceof CustomApiError) throw error;

        console.error('[api-logs] Unexpected error:', (error as Error).message);
        throw new CustomApiError(
            ERROR_CODES.INTERNAL_SERVER_ERROR,
            'เกิดข้อผิดพลาดในการดึงข้อมูล API logs',
            HTTP_STATUS.INTERNAL_SERVER_ERROR
        );
    }
}

export const GET = withErrorHandler(apiLogsHandler);