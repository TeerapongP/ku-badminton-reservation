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

async function apiLogsHandler(request: NextRequest) {
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
        const method = searchParams.get('method'); // GET, POST, PUT, DELETE
        const path = searchParams.get('path');
        const statusCode = searchParams.get('statusCode');
        const userId = searchParams.get('userId');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const minResponseTime = searchParams.get('minResponseTime');
        const maxResponseTime = searchParams.get('maxResponseTime');

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

        if (method) {
            where.method = method;
        }

        if (path) {
            where.path = {
                contains: path,
                mode: 'insensitive'
            };
        }

        if (statusCode) {
            where.status_code = parseInt(statusCode);
        }

        if (userId) {
            where.user_id = BigInt(userId);
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

        if (minResponseTime || maxResponseTime) {
            where.response_time_ms = {};
            if (minResponseTime) {
                where.response_time_ms.gte = parseInt(minResponseTime);
            }
            if (maxResponseTime) {
                where.response_time_ms.lte = parseInt(maxResponseTime);
            }
        }

        // Get total count
        const totalCount = await prisma.api_logs.count({ where });

        // Get API logs
        const apiLogs = await prisma.api_logs.findMany({
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
        const formattedLogs = apiLogs.map(log => ({
            id: log.log_id.toString(),
            method: log.method,
            path: log.path,
            queryParams: log.query_params,
            ip: log.ip,
            userAgent: log.user_agent,
            userId: log.user_id?.toString() || null,
            statusCode: log.status_code,
            responseTimeMs: log.response_time_ms,
            errorMessage: log.error_message,
            requestSize: log.request_size,
            responseSize: log.response_size,
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

        // Calculate statistics
        const stats = await prisma.api_logs.aggregate({
            where,
            _avg: {
                response_time_ms: true
            },
            _max: {
                response_time_ms: true
            },
            _min: {
                response_time_ms: true
            }
        });

        // Get status code distribution
        const statusDistribution = await prisma.api_logs.groupBy({
            by: ['status_code'],
            where,
            _count: {
                status_code: true
            },
            orderBy: {
                status_code: 'asc'
            }
        });

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
            statistics: {
                avgResponseTime: stats._avg.response_time_ms,
                maxResponseTime: stats._max.response_time_ms,
                minResponseTime: stats._min.response_time_ms,
                statusDistribution: statusDistribution.map(item => ({
                    statusCode: item.status_code,
                    count: item._count.status_code
                }))
            },
            filters: {
                method,
                path,
                statusCode,
                userId,
                startDate,
                endDate,
                minResponseTime,
                maxResponseTime
            }
        }, 'ดึงข้อมูล API logs สำเร็จ');

    } catch (error) {
        if (error instanceof CustomApiError) {
            throw error;
        }

        console.error('API logs error:', error);
        throw new CustomApiError(
            ERROR_CODES.INTERNAL_SERVER_ERROR,
            'เกิดข้อผิดพลาดในการดึงข้อมูล API logs',
            HTTP_STATUS.INTERNAL_SERVER_ERROR
        );
    }
}

export const GET = withErrorHandler(apiLogsHandler);