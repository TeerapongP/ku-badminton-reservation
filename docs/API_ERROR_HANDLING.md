# API Error Handling Documentation

## Overview

ระบบ API ทั้งหมดได้รับการอัปเดตให้มี error handling ที่สมบูรณ์และสม่ำเสมอ โดยใช้ middleware และ error handler ที่กำหนดไว้ล่วงหน้า

## Architecture

### Core Components

1. **Error Handler** (`src/lib/error-handler.ts`)
   - จัดการ error ทุกประเภท
   - แปลง Prisma errors เป็น user-friendly messages
   - รองรับ error codes และ HTTP status codes
   - มี validation helpers

2. **API Middleware** (`src/lib/api-middleware.ts`)
   - Rate limiting
   - Request logging
   - Security headers
   - CORS handling
   - Request validation

3. **Health Check** (`src/lib/api-health-check.ts`)
   - ตรวจสอบสถานะระบบ
   - Monitor database connection
   - Memory usage tracking
   - Error rate monitoring

## Error Codes

### Client Errors (4xx)

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | ข้อมูลไม่ถูกต้อง |
| `MISSING_REQUIRED_FIELDS` | 400 | ข้อมูลไม่ครบถ้วน |
| `INVALID_FORMAT` | 400 | รูปแบบข้อมูลไม่ถูกต้อง |
| `INVALID_PARAMETERS` | 400 | พารามิเตอร์ไม่ถูกต้อง |
| `UNAUTHORIZED` | 401 | ไม่ได้รับอนุญาต |
| `INVALID_CREDENTIALS` | 401 | ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง |
| `FORBIDDEN` | 403 | ไม่มีสิทธิ์เข้าถึง |
| `ACCOUNT_SUSPENDED` | 403 | บัญชีถูกระงับ |
| `NOT_FOUND` | 404 | ไม่พบข้อมูล |
| `DUPLICATE_ENTRY` | 409 | ข้อมูลซ้ำในระบบ |
| `TOO_MANY_ATTEMPTS` | 429 | มีการพยายามมากเกินไป |

### Server Errors (5xx)

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INTERNAL_SERVER_ERROR` | 500 | เกิดข้อผิดพลาดภายในระบบ |
| `DATABASE_ERROR` | 500 | เกิดข้อผิดพลาดฐานข้อมูล |
| `EXTERNAL_SERVICE_ERROR` | 502 | เกิดข้อผิดพลาดบริการภายนอก |
| `SERVICE_UNAVAILABLE` | 503 | บริการไม่พร้อมใช้งาน |

## Usage Examples

### Basic API Handler

```typescript
import { NextRequest } from 'next/server';
import { 
  withErrorHandler, 
  validateRequired,
  successResponse,
  CustomApiError,
  ERROR_CODES,
  HTTP_STATUS
} from "@/lib/error-handler";
import { withMiddleware } from "@/lib/api-middleware";

async function myApiHandler(req: NextRequest) {
  const body = await req.json();
  
  // Validate required fields
  validateRequired(body, ['name', 'email']);
  
  // Your business logic here
  const result = await someBusinessLogic(body);
  
  return successResponse(result, 'Operation completed successfully');
}

export const POST = withMiddleware(
  withErrorHandler(myApiHandler),
  {
    methods: ['POST'],
    rateLimit: 'default',
    requireContentType: 'application/json',
    maxBodySize: 10 * 1024, // 10KB
  }
);
```

### Custom Error Throwing

```typescript
// Throw custom errors
throw new CustomApiError(
  ERROR_CODES.INVALID_PARAMETERS,
  'รหัสผู้ใช้ไม่ถูกต้อง',
  HTTP_STATUS.BAD_REQUEST,
  { userId: 'invalid-id' }
);
```

### Validation Helpers

```typescript
import { 
  validateRequired,
  validateEmail,
  validatePhone,
  validatePostalCode,
  validateStudentId
} from "@/lib/error-handler";

// Validate required fields
validateRequired(data, ['username', 'email', 'password']);

// Validate formats
validateEmail(email);
validatePhone(phone);
validatePostalCode(postalCode);
validateStudentId(studentId);
```

## Rate Limiting

### Rate Limit Types

| Type | Requests | Window | Usage |
|------|----------|--------|-------|
| `default` | 100 | 1 minute | General API calls |
| `auth` | 10 | 1 minute | Authentication endpoints |
| `upload` | 20 | 1 minute | File upload endpoints |
| `sensitive` | 5 | 1 minute | Sensitive operations |

### Configuration

```typescript
export const POST = withMiddleware(
  withErrorHandler(handler),
  {
    rateLimit: 'auth', // Choose appropriate rate limit
    methods: ['POST'],
    requireContentType: 'application/json',
  }
);
```

## Security Features

### Headers Applied

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Strict-Transport-Security` (production only)

### Request Validation

- Method validation
- Content-Type validation
- Body size limits
- Authentication checks (when required)

## Monitoring

### Health Check Endpoint

```
GET /api/health
```

Returns system health status including:
- Database connectivity
- Memory usage
- Environment configuration
- Service status

### Error Rate Monitoring

```typescript
import { ErrorRateMonitor } from '@/lib/api-health-check';

const monitor = ErrorRateMonitor.getInstance();
monitor.recordError('/api/some-endpoint');
const errorRate = monitor.getErrorRate('/api/some-endpoint');
```

## Response Format

### Success Response

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    // Response data
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "ข้อมูลไม่ถูกต้อง",
    "details": {
      "field": "email"
    }
  }
}
```

## Best Practices

### 1. Always Use Middleware

```typescript
export const GET = withMiddleware(
  withErrorHandler(handler),
  options
);
```

### 2. Validate Input Data

```typescript
// For required fields
validateRequired(body, ['field1', 'field2']);

// For specific formats
validateEmail(email);
validatePhone(phone);
```

### 3. Use Appropriate Rate Limits

- `auth` for authentication endpoints
- `upload` for file uploads
- `sensitive` for critical operations
- `default` for general APIs

### 4. Throw Meaningful Errors

```typescript
throw new CustomApiError(
  ERROR_CODES.NOT_FOUND,
  'ไม่พบผู้ใช้ที่ระบุ',
  HTTP_STATUS.NOT_FOUND,
  { userId }
);
```

### 5. Log Important Events

The middleware automatically logs:
- All requests and responses
- Error details
- Performance metrics
- Security events

## Testing

### Health Check

```bash
curl http://localhost:3000/api/health
```

### Error Handling

```bash
# Test validation error
curl -X POST http://localhost:3000/api/some-endpoint \
  -H "Content-Type: application/json" \
  -d '{}'

# Test rate limiting
for i in {1..15}; do
  curl http://localhost:3000/api/auth/login
done
```

## Troubleshooting

### Common Issues

1. **Missing Error Handler**
   ```
   Error: Handler not wrapped with withErrorHandler
   ```
   Solution: Wrap your handler with `withErrorHandler`

2. **Rate Limit Exceeded**
   ```json
   {
     "error": {
       "code": "RATE_LIMIT_EXCEEDED",
       "message": "เกินขอบเขตการใช้งาน"
     }
   }
   ```
   Solution: Implement exponential backoff or reduce request frequency

3. **Database Connection Issues**
   ```json
   {
     "error": {
       "code": "SERVICE_UNAVAILABLE",
       "message": "ไม่สามารถเชื่อมต่อฐานข้อมูลได้"
     }
   }
   ```
   Solution: Check database connection and configuration

### Debug Mode

Set `NODE_ENV=development` for detailed error messages and stack traces.

## Migration Guide

### From Old Error Handling

1. Remove old try-catch blocks
2. Add error handler imports
3. Wrap handlers with middleware
4. Replace direct error responses with thrown errors

### Example Migration

**Before:**
```typescript
export async function POST(req: Request) {
  try {
    // logic
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
```

**After:**
```typescript
async function postHandler(req: NextRequest) {
  // logic
  return successResponse(data);
}

export const POST = withMiddleware(
  withErrorHandler(postHandler),
  { methods: ['POST'], rateLimit: 'default' }
);
```

## Performance Considerations

- Error handlers are lightweight and add minimal overhead
- Rate limiting uses in-memory storage (consider Redis for production)
- Logging is asynchronous and non-blocking
- Health checks are cached for 30 seconds

## Security Considerations

- All errors are sanitized before sending to client
- Sensitive information is never exposed in error messages
- Rate limiting prevents abuse
- Security headers protect against common attacks
- Request logging helps with audit trails