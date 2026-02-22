import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession();
      

        if (!session?.user?.id) {
            return NextResponse.json(
                { message: 'กรุณาเข้าสู่ระบบ' },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const userId = searchParams.get('userId');

        const skip = (page - 1) * limit;

        // สร้าง where condition
        const whereCondition: any = {};
        const isAdmin = ['admin', 'super_admin'].includes(session.user.role);
        // ถ้าไม่ใช่ admin ให้ดูแค่ log ของตัวเอง
        if (userId) {
            if (!isAdmin && userId !== session.user.id) {
                return NextResponse.json(
                    { message: 'ไม่มีสิทธิ์เข้าถึงข้อมูลนี้' },
                    { status: 403 }
                );
            }
            whereCondition.user_id = BigInt(userId);
        } else {
            whereCondition.user_id = BigInt(session.user.id);
        }

        // ดึงข้อมูล logs
        const [logs, total] = await Promise.all([
            prisma.auth_log.findMany({
                where: whereCondition,
                orderBy: { created_at: 'desc' },
                skip,
                take: limit,
                include: {
                    users: {
                        select: {
                            username: true,
                            first_name: true,
                            last_name: true,
                            email: true
                        }
                    }
                }
            }),
            prisma.auth_log.count({ where: whereCondition })
        ]);

        // แปลงข้อมูลให้อ่านง่าย
        const formattedLogs = logs.map((log: { auth_log_id: any; username_input: any; action: string; ip: any; user_agent: any; created_at: any; users: { username: any; first_name: any; last_name: any; email: any; }; }) => ({
            id: log.auth_log_id,
            username: log.username_input,
            action: getActionText(log.action),
            actionType: log.action,
            success: log.action === 'login_success',
            ip: log.ip,
            userAgent: log.user_agent,
            browser: getBrowserFromUserAgent(log.user_agent || ''),
            os: getOSFromUserAgent(log.user_agent || ''),
            location: 'Unknown', // TODO: เพิ่ม IP geolocation
            timestamp: log.created_at,
            user: log.users ? {
                username: log.users.username,
                name: `${log.users.first_name} ${log.users.last_name}`,
                email: log.users.email
            } : null
        }));

        return NextResponse.json({
            logs: formattedLogs,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Login logs error:', error);
        return NextResponse.json(
            { message: 'เกิดข้อผิดพลาดในการดึงข้อมูล' },
            { status: 500 }
        );
    }
}

// API สำหรับดู security summary
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession();

        if (!session?.user?.id) {
            return NextResponse.json(
                { message: 'กรุณาเข้าสู่ระบบ' },
                { status: 401 }
            );
        }

        const userId = BigInt(session.user.id);
        const now = new Date();
        const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        // สถิติการเข้าสู่ระบบ
        const [
            totalLogins,
            successLogins24h,
            failedLogins24h,
            successLogins7d,
            failedLogins7d,
            uniqueIPs7d,
            recentDevices
        ] = await Promise.all([
            // Total logins ทั้งหมด
            prisma.auth_log.count({
                where: { user_id: userId }
            }),

            // Success logins ใน 24 ชั่วโมง
            prisma.auth_log.count({
                where: {
                    user_id: userId,
                    action: 'login_success',
                    created_at: { gte: last24Hours }
                }
            }),

            // Failed logins ใน 24 ชั่วโมง
            prisma.auth_log.count({
                where: {
                    user_id: userId,
                    action: 'login_fail',
                    created_at: { gte: last24Hours }
                }
            }),

            // Success logins ใน 7 วัน
            prisma.auth_log.count({
                where: {
                    user_id: userId,
                    action: 'login_success',
                    created_at: { gte: last7Days }
                }
            }),

            // Failed logins ใน 7 วัน
            prisma.auth_log.count({
                where: {
                    user_id: userId,
                    action: 'login_fail',
                    created_at: { gte: last7Days }
                }
            }),

            // Unique IPs ใน 7 วัน
            prisma.auth_log.findMany({
                where: {
                    user_id: userId,
                    created_at: { gte: last7Days }
                },
                select: { ip: true },
                distinct: ['ip']
            }),

            // อุปกรณ์ที่ใช้ล่าสุด
            prisma.auth_log.findMany({
                where: {
                    user_id: userId,
                    action: 'login_success',
                    created_at: { gte: last30Days }
                },
                select: {
                    ip: true,
                    user_agent: true,
                    created_at: true
                },
                orderBy: { created_at: 'desc' },
                take: 10
            })
        ]);

        // จัดกลุ่มอุปกรณ์
        const deviceMap = new Map();
        recentDevices.forEach((device: { ip: any; user_agent: any; created_at: any; }) => {
            const key = `${device.ip}-${device.user_agent}`;
            if (!deviceMap.has(key)) {
                deviceMap.set(key, {
                    ip: device.ip,
                    browser: getBrowserFromUserAgent(device.user_agent || ''),
                    os: getOSFromUserAgent(device.user_agent || ''),
                    lastUsed: device.created_at,
                    userAgent: device.user_agent
                });
            }
        });

        return NextResponse.json({
            summary: {
                totalLogins,
                last24Hours: {
                    success: successLogins24h,
                    failed: failedLogins24h
                },
                last7Days: {
                    success: successLogins7d,
                    failed: failedLogins7d,
                    uniqueIPs: uniqueIPs7d.length
                }
            },
            recentDevices: Array.from(deviceMap.values()).slice(0, 5),
            securityAlerts: generateSecurityAlerts(failedLogins24h, uniqueIPs7d.length)
        });

    } catch (error) {
        console.error('Security summary error:', error);
        return NextResponse.json(
            { message: 'เกิดข้อผิดพลาดในการดึงข้อมูล' },
            { status: 500 }
        );
    }
}

function getActionText(action: string): string {
    const actionMap: { [key: string]: string } = {
        'login_success': 'เข้าสู่ระบบสำเร็จ',
        'login_fail': 'เข้าสู่ระบบไม่สำเร็จ',
        'logout': 'ออกจากระบบ'
    };
    return actionMap[action] || action;
}

function getBrowserFromUserAgent(userAgent: string): string {
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Unknown';
}

function getOSFromUserAgent(userAgent: string): string {
    if (userAgent.includes('Windows')) return 'Windows';
    if (userAgent.includes('Mac')) return 'macOS';
    if (userAgent.includes('Linux')) return 'Linux';
    if (userAgent.includes('Android')) return 'Android';
    if (userAgent.includes('iOS')) return 'iOS';
    return 'Unknown';
}

function generateSecurityAlerts(failedLogins24h: number, uniqueIPs7d: number) {
    const alerts = [];

    if (failedLogins24h > 5) {
        alerts.push({
            type: 'warning',
            message: `มีการพยายามเข้าสู่ระบบที่ไม่สำเร็จ ${failedLogins24h} ครั้งใน 24 ชั่วโมงที่ผ่านมา`,
            severity: 'medium'
        });
    }

    if (uniqueIPs7d > 5) {
        alerts.push({
            type: 'info',
            message: `มีการเข้าสู่ระบบจาก IP ที่แตกต่างกัน ${uniqueIPs7d} ที่ในสัปดาห์ที่ผ่านมา`,
            severity: 'low'
        });
    }

    return alerts;
}