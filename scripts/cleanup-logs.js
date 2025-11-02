#!/usr/bin/env node

/**
 * Log Cleanup Cron Job
 * 
 * ใช้สำหรับล้าง logs เก่าอัตโนมัติ
 * รันทุกวันเวลา 02:00 น.
 * 
 * Usage:
 * node scripts/cleanup-logs.js [retention_days]
 * 
 * Example:
 * node scripts/cleanup-logs.js 90
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function cleanupOldLogs(retentionDays = 90) {
    const startTime = Date.now();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    console.log(`🧹 Starting automated log cleanup for records older than ${cutoffDate.toISOString()}`);

    const results = [];
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

        results.push({
            table: 'api_logs',
            deletedRows: apiLogsResult.count,
            success: true
        });

        totalDeleted += apiLogsResult.count;
        console.log(`✅ Deleted ${apiLogsResult.count} records from api_logs`);
    } catch (error) {
        results.push({
            table: 'api_logs',
            deletedRows: 0,
            success: false,
            error: error.message
        });

        overallSuccess = false;
        console.error(`❌ Failed to cleanup api_logs:`, error.message);
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

        results.push({
            table: 'auth_log',
            deletedRows: authLogsResult.count,
            success: true
        });

        totalDeleted += authLogsResult.count;
        console.log(`✅ Deleted ${authLogsResult.count} records from auth_log`);
    } catch (error) {
        results.push({
            table: 'auth_log',
            deletedRows: 0,
            success: false,
            error: error.message
        });

        overallSuccess = false;
        console.error(`❌ Failed to cleanup auth_log:`, error.message);
    }

    // ล้าง Daily reset logs (เก็บไว้นานกว่าเล็กน้อย - 120 วัน)
    try {
        const dailyResetCutoff = new Date();
        dailyResetCutoff.setDate(dailyResetCutoff.getDate() - 120);

        const dailyResetResult = await prisma.daily_reset_log.deleteMany({
            where: {
                created_at: {
                    lt: dailyResetCutoff
                }
            }
        });

        results.push({
            table: 'daily_reset_log',
            deletedRows: dailyResetResult.count,
            success: true
        });

        totalDeleted += dailyResetResult.count;
        console.log(`✅ Deleted ${dailyResetResult.count} records from daily_reset_log (120 days retention)`);
    } catch (error) {
        results.push({
            table: 'daily_reset_log',
            deletedRows: 0,
            success: false,
            error: error.message
        });

        overallSuccess = false;
        console.error(`❌ Failed to cleanup daily_reset_log:`, error.message);
    }

    const duration = Date.now() - startTime;

    // บันทึกผลการทำงาน
    try {
        await prisma.daily_reset_log.create({
            data: {
                run_date: new Date(),
                job_name: 'automated_log_cleanup',
                started_at: new Date(Date.now() - duration),
                finished_at: new Date(),
                duration_sec: Math.round(duration / 1000),
                status: overallSuccess ? 'SUCCESS' : 'PARTIAL_SUCCESS',
                rows_affected: totalDeleted,
                retry_count: 0,
                server_host: process.env.HOSTNAME || require('os').hostname(),
                instance_id: process.env.INSTANCE_ID || 'cron',
                run_by: null, // automated job
                details_json: {
                    retention_days: retentionDays,
                    results: results,
                    total_deleted: totalDeleted,
                    automated: true
                },
                error_message: overallSuccess ? null : 'Some tables failed to cleanup'
            }
        });

        console.log('📝 Log cleanup activity recorded');
    } catch (error) {
        console.error('❌ Failed to record log cleanup activity:', error.message);
    }

    console.log(`🏁 Automated log cleanup completed in ${duration}ms. Total deleted: ${totalDeleted} records`);

    return {
        totalDeleted,
        results,
        duration,
        success: overallSuccess
    };
}

async function main() {
    try {
        const retentionDays = parseInt(process.argv[2]) || parseInt(process.env.LOG_RETENTION_DAYS) || 90;

        if (retentionDays < 7) {
            console.error('❌ Retention days must be at least 7');
            process.exit(1);
        }

        console.log(`🚀 Starting automated log cleanup with ${retentionDays} days retention`);

        const result = await cleanupOldLogs(retentionDays);

        if (result.success) {
            console.log('✅ Log cleanup completed successfully');
            process.exit(0);
        } else {
            console.log('⚠️ Log cleanup completed with some errors');
            process.exit(1);
        }

    } catch (error) {
        console.error('💥 Fatal error during log cleanup:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

// รันเฉพาะเมื่อเรียกใช้โดยตรง
if (require.main === module) {
    main();
}

module.exports = { cleanupOldLogs };