import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/Auth';
import { decode } from '@/lib/Cryto';
import { CustomApiError, ERROR_CODES, HTTP_STATUS, successResponse, withErrorHandler } from '@/lib/error-handler';

// ─── Constants ────────────────────────────────────────────────────────────────

type AuthLogAction = 'login_success' | 'login_fail' | 'logout';

const ADMIN_ROLES       = new Set(['admin', 'super_admin']);
const VALID_ACTIONS     = new Set<AuthLogAction>(['login_success', 'login_fail', 'logout']);
const DEFAULT_PAGE      = 1;
const DEFAULT_LIMIT     = 50;
const MAX_LIMIT         = 100;

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function resolveRole(encrypted: string | undefined | null): Promise<string | null> {
    if (!encrypted) return null;
    try {
        return await decode(encrypted);
    } catch {
        console.error('[audit-logs] Failed to decode role');
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

async function auditLogsHandler(request: NextRequest) {
    const session = await getServerSession(authOptions);
    const role    = await resolveRole(session?.user?.role);

    if (!session?.user || !ADMIN_ROLES.has(role ?? '')) {
        throw new CustomApiError(
            ERROR_CODES.UNAUTHORIZED,
            'ไม่มีสิทธิ์เข้าถึง',
            HTTP_STATUS.FORBIDDEN
        );
    }

    const { searchParams } = request.nextUrl;

    const page  = parsePositiveInt(searchParams.get('page'),  DEFAULT_PAGE);
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

    // A03: whitelist action
    const rawAction = searchParams.get('action');
    const action    = rawAction && VALID_ACTIONS.has(rawAction as AuthLogAction)
        ? (rawAction as AuthLogAction)
        : null;

    // A03: validate userId เป็น numeric ก่อน BigInt
    const rawUserId = searchParams.get('userId');
    const userId    = rawUserId && /^\d+$/.test(rawUserId) ? BigInt(rawUserId) : null;

    // username ใช้ contains — Prisma parameterized query กัน SQL injection อยู่แล้ว
    const username = searchParams.get('username') ?? null;

    // A03: validate dates
    const startDate = parseSafeDate(searchParams.get('startDate'));
    const endDate   = parseSafeDate(searchParams.get('endDate'));

    if (startDate && endDate && startDate > endDate) {
        throw new CustomApiError(
            ERROR_CODES.VALIDATION_ERROR,
            'startDate ต้องน้อยกว่า endDate',
            HTTP_STATUS.BAD_REQUEST
        );
    }

    const where: Prisma.auth_logWhereInput = {
        ...(action   && { action }),
        ...(userId   && { user_id: userId }),
        ...(username && { username_input: { contains: username } }),
        ...((startDate || endDate) && {
            created_at: {
                ...(startDate && { gte: startDate }),
                ...(endDate   && { lte: endDate }),
            }
        }),
    };

    try {
        const skip = (page - 1) * limit;

        const [totalCount, auditLogs] = await Promise.all([
            prisma.auth_log.count({ where }),
            prisma.auth_log.findMany({
                where,
                include: {
                    users: {
                        select: {
                            user_id:    true,
                            username:   true,
                            first_name: true,
                            last_name:  true,
                            role:       true,
                            // email ถูกตัดออก — ลด data exposure
                        }
                    }
                },
                orderBy: { created_at: 'desc' },
                skip,
                take: limit,
            }),
        ]);

        const totalPages    = Math.ceil(totalCount / limit);
        const formattedLogs = auditLogs.map(log => ({
            id:            log.auth_log_id.toString(),
            userId:        log.user_id?.toString() ?? null,
            usernameInput: log.username_input,
            action:        log.action,
            ip:            log.ip,
            userAgent:     log.user_agent,
            createdAt:     log.created_at.toISOString(),
            user: log.users ? {
                id:       log.users.user_id.toString(),
                username: log.users.username,
                name:     `${log.users.first_name} ${log.users.last_name}`.trim(),
                role:     log.users.role,
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
            // echo กลับเฉพาะ validated values ไม่ใช่ raw input
            filters: {
                action,
                userId:    userId?.toString() ?? null,
                username,
                startDate: startDate?.toISOString() ?? null,
                endDate:   endDate?.toISOString()   ?? null,
            },
        }, 'ดึงข้อมูล audit logs สำเร็จ');

    } catch (error) {
        if (error instanceof CustomApiError) throw error;

        console.error('[audit-logs] Unexpected error:', (error as Error).message);
        throw new CustomApiError(
            ERROR_CODES.INTERNAL_SERVER_ERROR,
            'เกิดข้อผิดพลาดในการดึงข้อมูล audit logs',
            HTTP_STATUS.INTERNAL_SERVER_ERROR
        );
    }
}

export const GET = withErrorHandler(auditLogsHandler);