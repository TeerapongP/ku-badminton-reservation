import { prisma } from '@/lib/prisma';

export interface SecurityEvent {
    userId?: bigint | null;
    action: 'login_success' | 'login_fail' | 'logout';
    ip: string;
    userAgent: string;
    username?: string;
    details?: any;
    severity?: 'low' | 'medium' | 'high' | 'critical';
}

export class SecurityLogger {
    static async log(event: SecurityEvent) {
        try {
            // บันทึกใน auth_log table
            await prisma.auth_log.create({
                data: {
                    user_id: event.userId,
                    username_input: event.username || '',
                    action: event.action,
                    ip: event.ip,
                    user_agent: event.userAgent,
                    created_at: new Date()
                }
            });

            // บันทึก detailed log
            console.log('Security Event:', {
                timestamp: new Date().toISOString(),
                userId: event.userId?.toString(),
                action: event.action,
                ip: event.ip,
                userAgent: event.userAgent,
                severity: event.severity || 'low',
                details: event.details
            });

            // ส่งแจ้งเตือนหากเป็น event ที่มีความรุนแรงสูง
            if (event.severity === 'high' || event.severity === 'critical') {
                await this.sendSecurityAlert(event);
            }

        } catch (error) {
            console.error('Security logging error:', error);
        }
    }

    static async logLoginAttempt(
        userId: bigint | null,
        username: string,
        success: boolean,
        ip: string,
        userAgent: string,
        details?: any
    ) {
        await this.log({
            userId,
            action: success ? 'login_success' : 'login_fail',
            ip,
            userAgent,
            details: { username, ...details },
            severity: success ? 'low' : 'medium'
        });
    }

    static async logAccountLocked(userId: bigint, ip: string, userAgent: string, attempts: number, username?: string) {
        // บันทึกเป็น login_fail พร้อมข้อมูลเพิ่มเติม
        await this.log({
            userId,
            action: 'login_fail',
            ip,
            userAgent,
            username,
            details: { type: 'account_locked', failedAttempts: attempts },
            severity: 'high'
        });

        // บันทึก detailed log แยก
        console.log('🔒 ACCOUNT LOCKED:', {
            userId: userId.toString(),
            attempts,
            ip,
            timestamp: new Date().toISOString()
        });
    }

    static async logSuspiciousActivity(
        userId: bigint | null,
        ip: string,
        userAgent: string,
        reason: string,
        username?: string,
        details?: any
    ) {
        // บันทึกเป็น login_fail พร้อมข้อมูลเพิ่มเติม
        await this.log({
            userId,
            action: 'login_fail',
            ip,
            userAgent,
            username,
            details: { type: 'suspicious_activity', reason, ...details },
            severity: 'high'
        });

        // บันทึก detailed log แยก
        console.log('🚨 SUSPICIOUS ACTIVITY:', {
            userId: userId?.toString(),
            reason,
            ip,
            timestamp: new Date().toISOString()
        });
    }

    private static async sendSecurityAlert(event: SecurityEvent) {
        // TODO: ส่งแจ้งเตือนผ่าน email, Slack, หรือ SMS
        console.log('🚨 SECURITY ALERT:', {
            action: event.action,
            severity: event.severity,
            ip: event.ip,
            timestamp: new Date().toISOString()
        });
    }

    // ฟังก์ชันวิเคราะห์ pattern ที่น่าสงสัย
    static async detectSuspiciousPatterns(userId: bigint, ip: string) {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        // ตรวจสอบการ login จาก IP ใหม่
        const recentIPs = await prisma.auth_log.findMany({
            where: {
                user_id: userId,
                action: 'login_success',
                created_at: { gte: oneDayAgo }
            },
            select: { ip: true },
            distinct: ['ip']
        });

        const isNewIP = !recentIPs.some(log => log.ip === ip);
        
        // ตรวจสอบการ login หลายครั้งในเวลาสั้น
        const recentLogins = await prisma.auth_log.count({
            where: {
                user_id: userId,
                action: 'login_success',
                created_at: { gte: oneHourAgo }
            }
        });

        // ตรวจสอบการ login จากหลาย IP พร้อมกัน
        const concurrentIPs = await prisma.auth_log.findMany({
            where: {
                user_id: userId,
                action: 'login_success',
                created_at: { gte: oneHourAgo }
            },
            select: { ip: true },
            distinct: ['ip']
        });

        const alerts = [];

        if (isNewIP) {
            alerts.push({
                type: 'new_ip',
                message: 'การเข้าสู่ระบบจาก IP ใหม่',
                severity: 'medium'
            });
        }

        if (recentLogins > 10) {
            alerts.push({
                type: 'frequent_login',
                message: `การเข้าสู่ระบบบ่อยเกินไป (${recentLogins} ครั้งใน 1 ชั่วโมง)`,
                severity: 'high'
            });
        }

        if (concurrentIPs.length > 3) {
            alerts.push({
                type: 'multiple_ips',
                message: `การเข้าสู่ระบบจากหลาย IP พร้อมกัน (${concurrentIPs.length} IPs)`,
                severity: 'high'
            });
        }

        return alerts;
    }

    // ฟังก์ชันดึงสถิติความปลอดภัย
    static async getSecurityStats(userId: bigint) {
        const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        
        const [
            totalLogins,
            failedLogins,
            uniqueIPs,
            lastLogin
        ] = await Promise.all([
            prisma.auth_log.count({
                where: {
                    user_id: userId,
                    action: 'login_success',
                    created_at: { gte: last30Days }
                }
            }),
            
            prisma.auth_log.count({
                where: {
                    user_id: userId,
                    action: 'login_fail',
                    created_at: { gte: last30Days }
                }
            }),
            
            prisma.auth_log.findMany({
                where: {
                    user_id: userId,
                    created_at: { gte: last30Days }
                },
                select: { ip: true },
                distinct: ['ip']
            }),
            
            prisma.auth_log.findFirst({
                where: {
                    user_id: userId,
                    action: 'login_success'
                },
                orderBy: { created_at: 'desc' }
            })
        ]);

        return {
            totalLogins,
            failedLogins,
            uniqueIPs: uniqueIPs.length,
            lastLogin: lastLogin?.created_at,
            successRate: totalLogins > 0 ? ((totalLogins / (totalLogins + failedLogins)) * 100).toFixed(1) : '0'
        };
    }
}