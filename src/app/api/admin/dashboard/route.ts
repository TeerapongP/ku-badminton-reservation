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

async function dashboardHandler(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        // ตรวจสอบสิทธิ์ admin
        if (!session?.user || (session.user.role !== 'admin' && session.user.role !== 'super_admin' && session.user.role !== 'super_admin')) {
            throw new CustomApiError(
                ERROR_CODES.UNAUTHORIZED,
                'ไม่มีสิทธิ์เข้าถึง',
                HTTP_STATUS.FORBIDDEN
            );
        }

        // 1. นับการชำระเงินที่รอตรวจสอบ
        const pendingPayments = await prisma.payments.count({
            where: {
                status: 'pending'
            }
        });

        // 2. นับการจองวันนี้
        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

        const todayBookings = await prisma.reservations.count({
            where: {
                created_at: {
                    gte: startOfDay,
                    lt: endOfDay
                }
            }
        });

        // 3. นับผู้ใช้ที่ใช้งานอยู่ (login ใน 30 วันที่ผ่านมา)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const activeUsers = await prisma.users.count({
            where: {
                status: 'active',
                last_login_at: {
                    gte: thirtyDaysAgo
                }
            }
        });

        // 4. สถิติเพิ่มเติม
        const totalUsers = await prisma.users.count();
        const totalBookings = await prisma.reservations.count();
        const totalRevenue = await prisma.payments.aggregate({
            where: {
                status: 'succeeded'
            },
            _sum: {
                amount_cents: true
            }
        });

        // 5. การจองที่ต้องการความสนใจ (pending, cancelled)
        const pendingBookings = await prisma.reservations.count({
            where: {
                status: 'pending'
            }
        });

        const cancelledBookings = await prisma.reservations.count({
            where: {
                status: 'cancelled',
                created_at: {
                    gte: startOfDay,
                    lt: endOfDay
                }
            }
        });

        return successResponse({
            pendingPayments,
            todayBookings,
            activeUsers,
            totalUsers,
            totalBookings,
            totalRevenue: Number(totalRevenue._sum.amount_cents || 0) / 100,
            pendingBookings,
            cancelledBookings,
            lastUpdated: new Date().toISOString()
        }, 'ดึงข้อมูล Dashboard สำเร็จ');

    } catch (error) {
        if (error instanceof CustomApiError) {
            throw error;
        }

        console.error('Dashboard error:', error);
        throw new CustomApiError(
            ERROR_CODES.INTERNAL_SERVER_ERROR,
            'เกิดข้อผิดพลาดในการดึงข้อมูล Dashboard',
            HTTP_STATUS.INTERNAL_SERVER_ERROR
        );
    }
}

export const GET = withErrorHandler(dashboardHandler);