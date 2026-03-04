import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/Auth';
import { decode } from '@/lib/Cryto'; //  async AES-256-GCM
import {
    CustomApiError, ERROR_CODES, HTTP_STATUS,
    successResponse, withErrorHandler
} from '@/lib/error-handler';
import { prisma } from '@/lib/prisma';

// ─── Constants ────────────────────────────────────────────────────────────────

const ADMIN_ROLES = new Set(['admin', 'super_admin']);
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50; //  A03: กัน DoS จาก limit ขนาดใหญ่

// ─── Role decode helper ───────────────────────────────────────────────────────

async function resolveRole(encryptedRole: string | undefined | null): Promise<string | null> {
    if (!encryptedRole) return null;
    try {
        return await decode(encryptedRole);
    } catch {
        console.error('[activities] Failed to decode role');
        return null;
    }
}

// ─── Handler ──────────────────────────────────────────────────────────────────

async function activitiesHandler(request: NextRequest) {
    const session = await getServerSession(authOptions);

    //  decode role ก่อน compare
    const role = await resolveRole(session?.user?.role);
    const isAdmin = ADMIN_ROLES.has(role ?? '');

    if (!session?.user || !isAdmin) {
        throw new CustomApiError(
            ERROR_CODES.UNAUTHORIZED,
            'ไม่มีสิทธิ์เข้าถึง',
            HTTP_STATUS.FORBIDDEN
        );
    }

    //  ใช้ request.nextUrl แทน new URL(request.url)
    const { searchParams } = request.nextUrl;

    //  A03: validate และ clamp limit
    const rawLimit = parseInt(searchParams.get('limit') ?? String(DEFAULT_LIMIT), 10);
    const limit = Number.isFinite(rawLimit) && rawLimit > 0
        ? Math.min(rawLimit, MAX_LIMIT)
        : DEFAULT_LIMIT;

    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    try {
        const activities: {
            type: string;
            message: string;
            time: Date;
            icon: string;
            color: string;
            relatedId: string;
        }[] = [];

        // ── 1. การชำระเงินล่าสุด ──────────────────────────────────────────────
        const recentPayments = await prisma.payments.findMany({
            where: {
                OR: [{ status: 'succeeded' }, { status: 'failed' }],
                updated_at: { gte: since24h },
            },
            include: {
                reservations: {
                    include: {
                        users: { select: { first_name: true, last_name: true } }
                    }
                }
            },
            orderBy: { updated_at: 'desc' },
            take: 5,
        });

        for (const payment of recentPayments) {
            const user = payment.reservations?.users;
            const userName = user ? `${user.first_name} ${user.last_name}`.trim() : 'ไม่ระบุ';
            const amount = (payment.amount_cents / 100).toLocaleString('th-TH');

            if (payment.status === 'succeeded') {
                activities.push({
                    type: 'payment_approval',
                    message: `อนุมัติการชำระเงิน: ${userName} (฿${amount})`,
                    time: payment.updated_at,
                    icon: 'CheckCircle',
                    color: 'tw-text-green-600',
                    relatedId: payment.payment_id.toString(),
                });
            } else {
                //  validate meta_json shape ก่อนใช้
                const meta = payment.meta_json;
                const rejectionReason =
                    meta !== null &&
                        typeof meta === 'object' &&
                        !Array.isArray(meta) &&
                        'rejection_reason' in meta &&
                        typeof (meta as Record<string, unknown>).rejection_reason === 'string'
                        ? (meta as Record<string, unknown>).rejection_reason as string
                        : null;

                activities.push({
                    type: 'payment_rejection',
                    message: `ปฏิเสธการชำระเงิน: ${userName}${rejectionReason ? ` - ${rejectionReason}` : ''}`,
                    time: payment.updated_at,
                    icon: 'XCircle',
                    color: 'tw-text-red-600',
                    relatedId: payment.payment_id.toString(),
                });
            }
        }

        // ── 2. การจองใหม่ล่าสุด ──────────────────────────────────────────────
        const recentBookings = await prisma.reservations.findMany({
            where: { created_at: { gte: since24h } },
            include: {
                users: { select: { first_name: true, last_name: true } },
                reservation_items: {
                    include: {
                        courts: {
                            select: {
                                name: true,
                                facilities: { select: { name_th: true } }
                            }
                        }
                    },
                    take: 1,
                },
            },
            orderBy: { created_at: 'desc' },
            take: 5,
        });

        for (const booking of recentBookings) {
            const user = booking.users;
            const userName = user ? `${user.first_name} ${user.last_name}`.trim() : 'ไม่ระบุ';
            const court = booking.reservation_items[0]?.courts;
            const facility = court?.facilities?.name_th ?? 'ไม่ระบุ';
            const courtName = court?.name ?? 'ไม่ระบุ';

            activities.push({
                type: 'booking_created',
                message: `การจองใหม่: ${userName} - ${facility} ${courtName}`,
                time: booking.created_at,
                icon: 'Calendar',
                color: 'tw-text-blue-600',
                relatedId: booking.reservation_id.toString(),
            });
        }

        // ── 3. การยกเลิกการจอง ────────────────────────────────────────────────
        const cancelledBookings = await prisma.reservations.findMany({
            where: {
                status: 'cancelled',
                updated_at: { gte: since24h },
            },
            include: {
                users: { select: { first_name: true, last_name: true } }
            },
            orderBy: { updated_at: 'desc' },
            take: 3,
        });

        for (const booking of cancelledBookings) {
            const user = booking.users;
            const userName = user ? `${user.first_name} ${user.last_name}`.trim() : 'ไม่ระบุ';

            activities.push({
                type: 'booking_cancelled',
                message: `ยกเลิกการจอง: ${userName}`,
                time: booking.updated_at,
                icon: 'XCircle',
                color: 'tw-text-orange-600',
                relatedId: booking.reservation_id.toString(),
            });
        }

        // ── 4. ผู้ใช้ใหม่ ─────────────────────────────────────────────────────
        const newUsers = await prisma.users.findMany({
            where: { registered_at: { gte: since24h } },
            select: {
                user_id: true,
                first_name: true,
                last_name: true,
                role: true,
                registered_at: true,
            },
            orderBy: { registered_at: 'desc' },
            take: 3,
        });

        const ROLE_LABEL: Record<string, string> = {
            student: 'นิสิต',
            staff: 'บุคลากร',
            admin: 'ผู้ดูแลระบบ',
            super_admin: 'ผู้ดูแลระบบ',
        };

        for (const user of newUsers) {
            const userName = `${user.first_name} ${user.last_name}`.trim();
            const roleLabel = ROLE_LABEL[user.role] ?? 'บุคคลภายนอก';

            activities.push({
                type: 'user_registered',
                message: `สมาชิกใหม่: ${userName} (${roleLabel})`,
                time: user.registered_at,
                icon: 'Users',
                color: 'tw-text-purple-600',
                relatedId: user.user_id.toString(),
            });
        }

        // ── Sort + slice + format ─────────────────────────────────────────────
        const sortedActivities = activities
            .sort((a, b) => b.time.getTime() - a.time.getTime())
            .slice(0, limit)
            .map(activity => ({
                ...activity,
                time: activity.time.toISOString(),
                timeAgo: getTimeAgo(activity.time),
            }));

        return successResponse(
            {
                activities: sortedActivities,
                total: sortedActivities.length,
                lastUpdated: new Date().toISOString(),
            },
            'ดึงข้อมูลกิจกรรมล่าสุดสำเร็จ'
        );

    } catch (error) {
        if (error instanceof CustomApiError) throw error;

        // A09: log message เท่านั้น ไม่ log raw error object
        console.error('[activities] Unexpected error:', (error as Error).message);
        throw new CustomApiError(
            ERROR_CODES.INTERNAL_SERVER_ERROR,
            'เกิดข้อผิดพลาดในการดึงข้อมูลกิจกรรม',
            HTTP_STATUS.INTERNAL_SERVER_ERROR
        );
    }
}

// ─── Time helper ──────────────────────────────────────────────────────────────

function getTimeAgo(date: Date): string {
    const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);

    if (diffSec < 60) return 'เมื่อสักครู่';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)} นาทีที่แล้ว`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} ชั่วโมงที่แล้ว`;
    return `${Math.floor(diffSec / 86400)} วันที่แล้ว`;
}

// ─── Export ───────────────────────────────────────────────────────────────────

export const GET = withErrorHandler(activitiesHandler);