import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface LogCleanupResult {
    table: string;
    deletedRows: number;
    success: boolean;
    error?: string;
}

export interface LogCleanupSummary {
    totalDeleted: number;
    results: LogCleanupResult[];
    duration: number;
    success: boolean;
}

/**
 * ล้าง logs ที่เก่ากว่า 90 วัน
 */
export async function cleanupOldLogs(retentionDays: number = 90): Promise<LogCleanupSummary> {
    const startTime = Date.now();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    console.log(`🧹 Starting log cleanup for records older than ${cutoffDate.toISOString()}`);

    const results: LogCleanupResult[] = [];
    let totalDeleted = 0;
    let overallSuccess = true;

    // ล้าง API logs
    try {
        const apiLogsResult = await prisma.api_logs.deleteMany({
            where: {
                created_at: {
                    lt: cutoffDate
                }
            }
        });

        const result: LogCleanupResult = {
            table: 'api_logs',
            deletedRows: apiLogsResult.count,
            success: true
        };

        results.push(result);
        totalDeleted += apiLogsResult.count;

        console.log(` Deleted ${apiLogsResult.count} records from api_logs`);
    } catch (error) {
        const result: LogCleanupResult = {
            table: 'api_logs',
            deletedRows: 0,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };

        results.push(result);
        overallSuccess = false;

        console.error(`❌ Failed to cleanup api_logs:`, error);
    }

    // ล้าง Auth logs
    try {
        const authLogsResult = await prisma.auth_log.deleteMany({
            where: {
                created_at: {
                    lt: cutoffDate
                }
            }
        });

        const result: LogCleanupResult = {
            table: 'auth_log',
            deletedRows: authLogsResult.count,
            success: true
        };

        results.push(result);
        totalDeleted += authLogsResult.count;

        console.log(` Deleted ${authLogsResult.count} records from auth_log`);
    } catch (error) {
        const result: LogCleanupResult = {
            table: 'auth_log',
            deletedRows: 0,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };

        results.push(result);
        overallSuccess = false;

        console.error(`❌ Failed to cleanup auth_log:`, error);
    }

    // ล้าง Daily reset logs
    try {
        const dailyResetResult = await prisma.daily_reset_log.deleteMany({
            where: {
                created_at: {
                    lt: cutoffDate
                }
            }
        });

        const result: LogCleanupResult = {
            table: 'daily_reset_log',
            deletedRows: dailyResetResult.count,
            success: true
        };

        results.push(result);
        totalDeleted += dailyResetResult.count;

        console.log(` Deleted ${dailyResetResult.count} records from daily_reset_log`);
    } catch (error) {
        const result: LogCleanupResult = {
            table: 'daily_reset_log',
            deletedRows: 0,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };

        results.push(result);
        overallSuccess = false;

        console.error(`❌ Failed to cleanup daily_reset_log:`, error);
    }

    const duration = Date.now() - startTime;

    const summary: LogCleanupSummary = {
        totalDeleted,
        results,
        duration,
        success: overallSuccess
    };

    console.log(`🏁 Log cleanup completed in ${duration}ms. Total deleted: ${totalDeleted} records`);

    return summary;
}

/**
 * บันทึกผลการล้าง logs ลงใน daily_reset_log
 */
export async function logCleanupActivity(
    summary: LogCleanupSummary,
    runBy?: bigint
): Promise<void> {
    try {
        await prisma.daily_reset_log.create({
            data: {
                run_date: new Date(),
                job_name: 'log_cleanup',
                started_at: new Date(Date.now() - summary.duration),
                finished_at: new Date(),
                duration_sec: Math.round(summary.duration / 1000),
                status: summary.success ? 'SUCCESS' : 'PARTIAL_SUCCESS',
                rows_affected: summary.totalDeleted,
                retry_count: 0,
                server_host: process.env.HOSTNAME || 'unknown',
                instance_id: process.env.INSTANCE_ID || 'default',
                run_by: runBy,
                details_json: {
                    retention_days: 90,
                    results: summary.results,
                    total_deleted: summary.totalDeleted
                },
                error_message: summary.success ? null : 'Some tables failed to cleanup'
            }
        });

        console.log('📝 Log cleanup activity recorded');
    } catch (error) {
        console.error('❌ Failed to record log cleanup activity:', error);
    }
}

/**
 * ตรวจสอบขนาดของ log tables
 */
export async function getLogTableSizes(): Promise<Record<string, number>> {
    try {
        const [apiLogsCount, authLogCount, dailyResetCount] = await Promise.all([
            prisma.api_logs.count(),
            prisma.auth_log.count(),
            prisma.daily_reset_log.count()
        ]);

        return {
            api_logs: apiLogsCount,
            auth_log: authLogCount,
            daily_reset_log: dailyResetCount
        };
    } catch (error) {
        console.error('❌ Failed to get log table sizes:', error);
        return {
            api_logs: 0,
            auth_log: 0,
            daily_reset_log: 0
        };
    }
}

/**
 * ตรวจสอบ logs ที่เก่ากว่า retention period
 */
export async function getOldLogsCounts(retentionDays: number = 90): Promise<Record<string, number>> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    try {
        const [apiLogsCount, authLogCount, dailyResetCount] = await Promise.all([
            prisma.api_logs.count({
                where: { created_at: { lt: cutoffDate } }
            }),
            prisma.auth_log.count({
                where: { created_at: { lt: cutoffDate } }
            }),
            prisma.daily_reset_log.count({
                where: { created_at: { lt: cutoffDate } }
            })
        ]);

        return {
            api_logs: apiLogsCount,
            auth_log: authLogCount,
            daily_reset_log: dailyResetCount
        };
    } catch (error) {
        console.error('❌ Failed to get old logs counts:', error);
        return {
            api_logs: 0,
            auth_log: 0,
            daily_reset_log: 0
        };
    }
}