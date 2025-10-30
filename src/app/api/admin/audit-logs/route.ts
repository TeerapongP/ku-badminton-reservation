import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/Auth';
import { prisma } from '@/lib/prisma';
import {
    withErrorHandler,
    CustomApiError,
    ERROR_CODES,
    HTTP_STATUS,
    successResponse
} from "@/lib/error-handler";

type AuthLogAction = 'login_success' | 'login_fail' | 'logout';

async function auditLogsHandler(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        // ตรวจสอบสิทธิ์ admin
        if (!session?.user || (session.user.role !== 'admin' && session.user.role !== 'super_admin' && session.user.role !== 'super-admin')) {
            throw new CustomApiError(
                ERROR_CODES.UNAUTHORIZED,
                'ไม่มีสิทธิ์เข้าถึง',
                HTTP_STATUS.FORBIDDEN
            );
        }

        const { searchParams } = new URL(request.url);

        // Query parameters
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '50');
        const action = searchParams.get('action'); // login_success, login_fail, logout
        const userId = searchParams.get('userId');
        const username = searchParams.get('username');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        // Validate pagination
        if (page < 1 || limit < 1 || limit > 100) {
            throw new CustomApiError(
                ERROR_CODES.VALIDATION_ERROR,
                'ค่า page และ limit ไม่ถูกต้อง',
                HTTP_STATUS.BAD_REQUEST
            );
        }

        const skip = (page - 1) * limit;

        // Build where clause
        const where: any = {};

        if (action && ['login_success', 'login_fail', 'logout'].includes(action)) {
            where.action = action as AuthLogAction;
        }

        if (userId) {
            where.user_id = BigInt(userId);
        }

        if (username) {
            where.username_input = {
                contains: username,
                mode: 'insensitive'
            };
        }

        if (startDate || endDate) {
            where.created_at = {};
            if (startDate) {
                where.created_at.gte = new Date(startDate);
            }
            if (endDate) {
                where.created_at.lte = new Date(endDate);
            }
        }

        // Get total count
        const totalCount = await prisma.auth_log.count({ where });

        // Get audit logs
        const auditLogs = await prisma.auth_log.findMany({
            where,
            include: {
                users: {
                    select: {
                        user_id: true,
                        username: true,
                        first_name: true,
                        last_name: true,
                        role: true,
                        email: true
                    }
                }
            },
            orderBy: {
                created_at: 'desc'
            },
            skip,
            take: limit
        });

        // Format response
        const formattedLogs = auditLogs.map(log => ({
            id: log.auth_log_id.toString(),
            userId: log.user_id?.toString() || null,
            usernameInput: log.username_input,
            action: log.action,
            ip: log.ip,
            userAgent: log.user_agent,
            createdAt: log.created_at,
            user: log.users ? {
                id: log.users.user_id.toString(),
                username: log.users.username,
                name: `${log.users.first_name} ${log.users.last_name}`.trim(),
                role: log.users.role,
                email: log.users.email
            } : null
        }));

        const totalPages = Math.ceil(totalCount / limit);

        return successResponse({
            logs: formattedLogs,
            pagination: {
                page,
                limit,
                totalCount,
                totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1
            },
            filters: {
                action,
                userId,
                username,
                startDate,
                endDate
            }
        }, 'ดึงข้อมูล audit logs สำเร็จ');

    } catch (error) {
        if (error instanceof CustomApiError) {
            throw error;
        }

        console.error('Audit logs error:', error);
        throw new CustomApiError(
            ERROR_CODES.INTERNAL_SERVER_ERROR,
            'เกิดข้อผิดพลาดในการดึงข้อมูล audit logs',
            HTTP_STATUS.INTERNAL_SERVER_ERROR
        );
    }
}

export const GET = withErrorHandler(auditLogsHandler);