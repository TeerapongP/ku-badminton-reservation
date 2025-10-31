// src/lib/error-handler.ts
import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';

export interface ApiError {
  code: string;
  message: string;
  details?: any;
  statusCode: number;
}

export class CustomApiError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: any;

  constructor(code: string, message: string, statusCode: number = 500, details?: any) {
    super(message);
    this.name = 'CustomApiError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

// Error codes และ messages
export const ERROR_CODES = {
  // Validation errors (400)
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  MISSING_REQUIRED_FIELDS: 'MISSING_REQUIRED_FIELDS',
  INVALID_FORMAT: 'INVALID_FORMAT',
  INVALID_PARAMETERS: 'INVALID_PARAMETERS',

  // Authentication errors (401)
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',

  // Authorization errors (403)
  FORBIDDEN: 'FORBIDDEN',
  ACCOUNT_SUSPENDED: 'ACCOUNT_SUSPENDED',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',

  // Not found errors (404)
  NOT_FOUND: 'NOT_FOUND',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',

  // Conflict errors (409)
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
  RESOURCE_CONFLICT: 'RESOURCE_CONFLICT',

  // Rate limiting (429)
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  TOO_MANY_ATTEMPTS: 'TOO_MANY_ATTEMPTS',

  // Server errors (500)
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',

  // Service unavailable (503)
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  MAINTENANCE_MODE: 'MAINTENANCE_MODE',
} as const;

export const ERROR_MESSAGES = {
  [ERROR_CODES.VALIDATION_ERROR]: 'ข้อมูลไม่ถูกต้อง',
  [ERROR_CODES.MISSING_REQUIRED_FIELDS]: 'ข้อมูลไม่ครบถ้วน',
  [ERROR_CODES.INVALID_FORMAT]: 'รูปแบบข้อมูลไม่ถูกต้อง',
  [ERROR_CODES.INVALID_PARAMETERS]: 'พารามิเตอร์ไม่ถูกต้อง',

  [ERROR_CODES.UNAUTHORIZED]: 'ไม่ได้รับอนุญาต',
  [ERROR_CODES.INVALID_CREDENTIALS]: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง',
  [ERROR_CODES.TOKEN_EXPIRED]: 'โทเค็นหมดอายุ',

  [ERROR_CODES.FORBIDDEN]: 'ไม่มีสิทธิ์เข้าถึง',
  [ERROR_CODES.ACCOUNT_SUSPENDED]: 'บัญชีถูกระงับ',
  [ERROR_CODES.INSUFFICIENT_PERMISSIONS]: 'สิทธิ์ไม่เพียงพอ',

  [ERROR_CODES.NOT_FOUND]: 'ไม่พบข้อมูล',
  [ERROR_CODES.USER_NOT_FOUND]: 'ไม่พบผู้ใช้',
  [ERROR_CODES.RESOURCE_NOT_FOUND]: 'ไม่พบทรัพยากรที่ต้องการ',

  [ERROR_CODES.DUPLICATE_ENTRY]: 'ข้อมูลซ้ำในระบบ',
  [ERROR_CODES.RESOURCE_CONFLICT]: 'ข้อมูลขัดแย้ง',

  [ERROR_CODES.RATE_LIMIT_EXCEEDED]: 'เกินขอบเขตการใช้งาน',
  [ERROR_CODES.TOO_MANY_ATTEMPTS]: 'มีการพยายามมากเกินไป',

  [ERROR_CODES.INTERNAL_SERVER_ERROR]: 'เกิดข้อผิดพลาดภายในระบบ',
  [ERROR_CODES.DATABASE_ERROR]: 'เกิดข้อผิดพลาดฐานข้อมูล',
  [ERROR_CODES.EXTERNAL_SERVICE_ERROR]: 'เกิดข้อผิดพลาดบริการภายนอก',

  [ERROR_CODES.SERVICE_UNAVAILABLE]: 'บริการไม่พร้อมใช้งาน',
  [ERROR_CODES.MAINTENANCE_MODE]: 'ระบบอยู่ในช่วงปรับปรุง',
} as const;

// HTTP Status codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
} as const;

// Prisma error handler
export function handlePrismaError(error: any): CustomApiError {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002': // Unique constraint violation
        return new CustomApiError(
          ERROR_CODES.DUPLICATE_ENTRY,
          'ข้อมูลซ้ำในระบบ กรุณาตรวจสอบข้อมูลที่ซ้ำกัน',
          HTTP_STATUS.CONFLICT,
          { field: error.meta?.target }
        );

      case 'P2025': // Record not found
        return new CustomApiError(
          ERROR_CODES.NOT_FOUND,
          'ไม่พบข้อมูลที่ต้องการ',
          HTTP_STATUS.NOT_FOUND
        );

      case 'P2003': // Foreign key constraint violation
        return new CustomApiError(
          ERROR_CODES.VALIDATION_ERROR,
          'ข้อมูลอ้างอิงไม่ถูกต้อง',
          HTTP_STATUS.BAD_REQUEST,
          { field: error.meta?.field_name }
        );

      case 'P2000': // Value too long
        return new CustomApiError(
          ERROR_CODES.VALIDATION_ERROR,
          'ข้อมูลยาวเกินกำหนด',
          HTTP_STATUS.BAD_REQUEST
        );

      case 'P2011': // Null constraint violation
        return new CustomApiError(
          ERROR_CODES.MISSING_REQUIRED_FIELDS,
          'ข้อมูลจำเป็นไม่ครบถ้วน',
          HTTP_STATUS.BAD_REQUEST,
          { field: error.meta?.constraint }
        );

      case 'P2012': // Missing required value
        return new CustomApiError(
          ERROR_CODES.MISSING_REQUIRED_FIELDS,
          'ข้อมูลจำเป็นหายไป',
          HTTP_STATUS.BAD_REQUEST
        );

      case 'P2014': // Invalid ID
        return new CustomApiError(
          ERROR_CODES.INVALID_PARAMETERS,
          'รหัสอ้างอิงไม่ถูกต้อง',
          HTTP_STATUS.BAD_REQUEST
        );

      default:
        return new CustomApiError(
          ERROR_CODES.DATABASE_ERROR,
          'เกิดข้อผิดพลาดฐานข้อมูล',
          HTTP_STATUS.INTERNAL_SERVER_ERROR,
          { prismaCode: error.code }
        );
    }
  }

  if (error instanceof Prisma.PrismaClientUnknownRequestError) {
    return new CustomApiError(
      ERROR_CODES.DATABASE_ERROR,
      'เกิดข้อผิดพลาดฐานข้อมูลที่ไม่ทราบสาเหตุ',
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }

  if (error instanceof Prisma.PrismaClientRustPanicError) {
    return new CustomApiError(
      ERROR_CODES.DATABASE_ERROR,
      'เกิดข้อผิดพลาดร้ายแรงของฐานข้อมูล',
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return new CustomApiError(
      ERROR_CODES.SERVICE_UNAVAILABLE,
      'ไม่สามารถเชื่อมต่อฐานข้อมูลได้',
      HTTP_STATUS.SERVICE_UNAVAILABLE
    );
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return new CustomApiError(
      ERROR_CODES.VALIDATION_ERROR,
      'ข้อมูลไม่ถูกต้องตามรูปแบบที่กำหนด',
      HTTP_STATUS.BAD_REQUEST
    );
  }

  // Generic error
  return new CustomApiError(
    ERROR_CODES.INTERNAL_SERVER_ERROR,
    'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ',
    HTTP_STATUS.INTERNAL_SERVER_ERROR
  );
}

// Generic error handler
export function handleError(error: any): NextResponse {
  console.error('API Error:', {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
  });

  // Handle custom API errors
  if (error instanceof CustomApiError) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      },
      { status: error.statusCode }
    );
  }

  // Handle Prisma errors
  if (error.name?.includes('Prisma')) {
    const prismaError = handlePrismaError(error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: prismaError.code,
          message: prismaError.message,
          details: prismaError.details,
        },
      },
      { status: prismaError.statusCode }
    );
  }

  // Handle validation errors
  if (error.name === 'ValidationError' || error.message?.includes('validation')) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: ERROR_MESSAGES[ERROR_CODES.VALIDATION_ERROR],
          details: error.message,
        },
      },
      { status: HTTP_STATUS.BAD_REQUEST }
    );
  }

  // Handle network/fetch errors
  if (error.name === 'TypeError' && error.message?.includes('fetch')) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: ERROR_CODES.EXTERNAL_SERVICE_ERROR,
          message: ERROR_MESSAGES[ERROR_CODES.EXTERNAL_SERVICE_ERROR],
        },
      },
      { status: HTTP_STATUS.BAD_GATEWAY }
    );
  }

  // Generic server error
  return NextResponse.json(
    {
      success: false,
      error: {
        code: ERROR_CODES.INTERNAL_SERVER_ERROR,
        message: ERROR_MESSAGES[ERROR_CODES.INTERNAL_SERVER_ERROR],
      },
    },
    { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
  );
}

// Validation helpers
export function validateRequired(data: any, fields: string[]): void {
  const missing = fields.filter(field => !data[field]);
  if (missing.length > 0) {
    throw new CustomApiError(
      ERROR_CODES.MISSING_REQUIRED_FIELDS,
      `ข้อมูลจำเป็นหายไป: ${missing.join(', ')}`,
      HTTP_STATUS.BAD_REQUEST,
      { missingFields: missing }
    );
  }
}

export function validateEmail(email: string): void {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new CustomApiError(
      ERROR_CODES.INVALID_FORMAT,
      'รูปแบบอีเมลไม่ถูกต้อง',
      HTTP_STATUS.BAD_REQUEST
    );
  }
}

export function validatePhone(phone: string): void {
  const phoneRegex = /^0\d{9}$/;
  if (!phoneRegex.test(phone)) {
    throw new CustomApiError(
      ERROR_CODES.INVALID_FORMAT,
      'เบอร์โทรศัพท์ต้องขึ้นต้นด้วย 0 และมี 10 หลัก',
      HTTP_STATUS.BAD_REQUEST
    );
  }
}

export function validatePostalCode(postalCode: string): void {
  const postalRegex = /^\d{5}$/;
  if (!postalRegex.test(postalCode)) {
    throw new CustomApiError(
      ERROR_CODES.INVALID_FORMAT,
      'รหัสไปรษณีย์ต้องเป็นตัวเลข 5 หลัก',
      HTTP_STATUS.BAD_REQUEST
    );
  }
}

export function validateStudentId(studentId: string): void {
  const studentIdRegex = /^\d{8,10}$/;
  if (!studentIdRegex.test(studentId)) {
    throw new CustomApiError(
      ERROR_CODES.INVALID_FORMAT,
      'รหัสนิสิตต้องเป็นตัวเลข 8-10 หลัก',
      HTTP_STATUS.BAD_REQUEST
    );
  }
}

// Helper function to convert BigInt to string for JSON serialization
function convertBigIntToString(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'bigint') {
    return obj.toString();
  }

  if (Array.isArray(obj)) {
    return obj.map(convertBigIntToString);
  }

  if (typeof obj === 'object') {
    const converted: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        converted[key] = convertBigIntToString(obj[key]);
      }
    }
    return converted;
  }

  return obj;
}

// Response helpers
export function successResponse(data: any, message?: string): NextResponse {
  const convertedData = convertBigIntToString(data);
  return NextResponse.json({
    success: true,
    message,
    data: convertedData,
  });
}

export function errorResponse(
  code: string,
  message: string,
  statusCode: number = HTTP_STATUS.BAD_REQUEST,
  details?: any
): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
        details,
      },
    },
    { status: statusCode }
  );
}

// Async wrapper for API handlers
export function withErrorHandler(handler: Function) {
  return async (...args: any[]) => {
    try {
      return await handler(...args);
    } catch (error) {
      return handleError(error);
    }
  };
}