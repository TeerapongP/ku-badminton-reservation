// src/lib/api-health-check.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { 
  withErrorHandler, 
  CustomApiError,
  ERROR_CODES,
  HTTP_STATUS,
  successResponse
} from "./error-handler";
import { withMiddleware } from "./api-middleware";

interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  responseTime: number;
  error?: string;
  details?: any;
}

async function healthCheckHandler(req: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  const results: HealthCheckResult[] = [];

  // Database health check
  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1 as health_check`;
    const dbTime = Date.now() - dbStart;
    
    results.push({
      service: 'database',
      status: dbTime < 1000 ? 'healthy' : 'degraded',
      responseTime: dbTime,
      details: { connectionPool: 'active' }
    });
  } catch (error) {
    results.push({
      service: 'database',
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown database error'
    });
  }

  // Memory usage check
  try {
    const memUsage = process.memoryUsage();
    const memUsageMB = {
      rss: Math.round(memUsage.rss / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      external: Math.round(memUsage.external / 1024 / 1024),
    };

    results.push({
      service: 'memory',
      status: memUsageMB.heapUsed < 512 ? 'healthy' : 'degraded',
      responseTime: 0,
      details: memUsageMB
    });
  } catch (error) {
    results.push({
      service: 'memory',
      status: 'unhealthy',
      responseTime: 0,
      error: 'Failed to get memory usage'
    });
  }

  // Environment variables check
  const requiredEnvVars = [
    'DATABASE_URL',
    'NEXTAUTH_SECRET',
    'NEXTAUTH_URL'
  ];

  const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
  
  results.push({
    service: 'environment',
    status: missingEnvVars.length === 0 ? 'healthy' : 'unhealthy',
    responseTime: 0,
    details: { 
      missing: missingEnvVars,
      total: requiredEnvVars.length,
      configured: requiredEnvVars.length - missingEnvVars.length
    }
  });

  // Overall health status
  const overallStatus = results.every(r => r.status === 'healthy') 
    ? 'healthy' 
    : results.some(r => r.status === 'unhealthy') 
    ? 'unhealthy' 
    : 'degraded';

  const totalResponseTime = Date.now() - startTime;

  const healthData = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    responseTime: totalResponseTime,
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    services: results
  };

  // Return appropriate status code
  const statusCode = overallStatus === 'healthy' ? 200 : 
                    overallStatus === 'degraded' ? 200 : 503;

  return NextResponse.json(healthData, { status: statusCode });
}

export const GET = withMiddleware(
  withErrorHandler(healthCheckHandler),
  {
    methods: ['GET'],
    skipHealthCheck: true, // Don't check health in health endpoint
    skipMaintenanceCheck: true,
  }
);

// API monitoring helper
export async function checkApiEndpoint(url: string, method: string = 'GET'): Promise<HealthCheckResult> {
  const startTime = Date.now();
  
  try {
    const response = await fetch(url, { 
      method,
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    const responseTime = Date.now() - startTime;
    
    return {
      service: url,
      status: response.ok ? 'healthy' : 'unhealthy',
      responseTime,
      details: {
        statusCode: response.status,
        statusText: response.statusText
      }
    };
  } catch (error) {
    return {
      service: url,
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Error rate monitoring
export class ErrorRateMonitor {
  private static instance: ErrorRateMonitor;
  private errorCounts = new Map<string, { count: number; window: number }>();
  private readonly windowSize = 60 * 1000; // 1 minute

  static getInstance(): ErrorRateMonitor {
    if (!ErrorRateMonitor.instance) {
      ErrorRateMonitor.instance = new ErrorRateMonitor();
    }
    return ErrorRateMonitor.instance;
  }

  recordError(endpoint: string): void {
    const now = Date.now();
    const key = endpoint;
    const current = this.errorCounts.get(key);

    if (!current || now - current.window > this.windowSize) {
      this.errorCounts.set(key, { count: 1, window: now });
    } else {
      current.count++;
    }
  }

  getErrorRate(endpoint: string): number {
    const current = this.errorCounts.get(endpoint);
    if (!current || Date.now() - current.window > this.windowSize) {
      return 0;
    }
    return current.count;
  }

  getAllErrorRates(): Record<string, number> {
    const now = Date.now();
    const result: Record<string, number> = {};

    for (const [endpoint, data] of this.errorCounts.entries()) {
      if (now - data.window <= this.windowSize) {
        result[endpoint] = data.count;
      }
    }

    return result;
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, data] of this.errorCounts.entries()) {
      if (now - data.window > this.windowSize) {
        this.errorCounts.delete(key);
      }
    }
  }
}