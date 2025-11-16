# Security Hardening Guide

## ✅ Critical Fixes Applied (2025-11-16)

### 1. SQL Injection Prevention
- **Fixed**: Replaced all `$queryRaw` with Prisma Client type-safe queries
- **Impact**: Prevents SQL injection attacks
- **Files Modified**: `src/app/api/court-availability/route.ts`

### 2. Dependency Updates
- **next-auth**: 4.24.11 → 4.24.13 (Fixed CVE email misdelivery)
- **nodemailer**: 7.0.9 → 7.0.10 (Security patches)
- **js-yaml**: Updated to latest (Fixed prototype pollution)
- **bcryptjs**: 3.0.2 → 3.0.3

### 3. Password Hashing Strengthened
- **Changed**: bcrypt salt rounds from 10 → 12
- **Impact**: Stronger password protection
- **Files Modified**: `src/app/api/admin/students/upload/route.ts`

### 4. Environment Security
- **Status**: `.env` is NOT in Git (✅ Secure)
- **Added**: `.env.security-template` with security guidelines
- **Recommendation**: Use secrets manager in production

---

## 🔴 Remaining Critical Issues

### 1. xlsx Library Vulnerability
**Issue**: Prototype Pollution (CVE-2023-30533) and ReDoS (CVE-2024-22363)
**Current Version**: 0.18.5
**Status**: No npm fix available

**Solutions**:
```bash
# Option 1: Download patched version
# Visit: https://cdn.sheetjs.com/

# Option 2: Replace with alternative
pnpm remove xlsx
pnpm add exceljs
```

**Migration Example**:
```typescript
// Before (xlsx)
import * as XLSX from 'xlsx';
const workbook = XLSX.read(buffer);

// After (exceljs)
import ExcelJS from 'exceljs';
const workbook = new ExcelJS.Workbook();
await workbook.xlsx.load(buffer);
```

### 2. SSL/TLS Configuration Missing
**File**: `nginx.conf`

**Add SSL Configuration**:
```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    
    # Modern SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256';
    ssl_prefer_server_ciphers off;
    
    # HSTS
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # ... rest of config
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}
```

---

## 🟠 High Priority Recommendations

### 1. Account Lockout Mechanism
**File**: Create `src/lib/account-lockout.ts`

```typescript
import { prisma } from './prisma';

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 30 * 60 * 1000; // 30 minutes

export async function checkAccountLockout(userId: bigint): Promise<boolean> {
    const recentFailures = await prisma.auth_log.count({
        where: {
            user_id: userId,
            action: 'login_fail',
            created_at: {
                gte: new Date(Date.now() - LOCKOUT_DURATION)
            }
        }
    });
    
    return recentFailures >= MAX_ATTEMPTS;
}

export async function resetLoginAttempts(userId: bigint): Promise<void> {
    // Clear old failed attempts after successful login
    await prisma.auth_log.deleteMany({
        where: {
            user_id: userId,
            action: 'login_fail',
            created_at: {
                lt: new Date(Date.now() - LOCKOUT_DURATION)
            }
        }
    });
}
```

### 2. File Upload Magic Byte Validation
**File**: `src/app/api/upload/profile-image/route.ts`

```typescript
import { fileTypeFromBuffer } from 'file-type';

// Add after reading file buffer
const fileType = await fileTypeFromBuffer(buffer);

if (!fileType || !['image/jpeg', 'image/png', 'image/webp'].includes(fileType.mime)) {
    throw new CustomApiError(
        ERROR_CODES.INVALID_FORMAT,
        'ไฟล์ไม่ใช่รูปภาพที่ถูกต้อง',
        HTTP_STATUS.BAD_REQUEST
    );
}
```

**Install dependency**:
```bash
pnpm add file-type
```

### 3. Content Security Policy
**File**: `next.config.js`

```javascript
async headers() {
    return [
        {
            source: '/(.*)',
            headers: [
                {
                    key: 'Content-Security-Policy',
                    value: [
                        "default-src 'self'",
                        "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
                        "style-src 'self' 'unsafe-inline'",
                        "img-src 'self' data: https:",
                        "font-src 'self' data:",
                        "connect-src 'self'",
                        "frame-ancestors 'none'",
                    ].join('; ')
                },
                // ... existing headers
            ],
        },
    ];
}
```

### 4. JWT Session Optimization
**File**: `src/lib/Auth.ts`

```typescript
session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // Reduce to 8 hours
},
jwt: {
    maxAge: 8 * 60 * 60, // 8 hours
},
```

---

## 🟡 Medium Priority

### 1. Rate Limiting Enhancement
**File**: `src/middleware/rateLimiter.ts`

```typescript
// Add IP-based blocking for repeated violations
const BLOCK_DURATION = 60 * 60 * 1000; // 1 hour
const blockedIPs = new Map<string, number>();

export function blockIP(ip: string): void {
    blockedIPs.set(ip, Date.now() + BLOCK_DURATION);
}

export function isIPBlocked(ip: string): boolean {
    const blockUntil = blockedIPs.get(ip);
    if (!blockUntil) return false;
    
    if (Date.now() > blockUntil) {
        blockedIPs.delete(ip);
        return false;
    }
    
    return true;
}
```

### 2. Remove Debug Logs in Production
**Search and remove**:
```bash
# Find all console.log in production code
grep -r "console.log" src/app/api/ --exclude-dir=debug
```

**Replace with proper logging**:
```typescript
// Use conditional logging
if (process.env.NODE_ENV === 'development') {
    console.log('Debug info:', data);
}
```

### 3. API Versioning
**Structure**:
```
src/app/api/
├── v1/
│   ├── auth/
│   ├── booking/
│   └── ...
└── v2/
    └── ...
```

---

## 📋 Security Checklist

### Before Deployment
- [ ] All dependencies updated
- [ ] SSL/TLS configured
- [ ] Environment variables secured
- [ ] Rate limiting tested
- [ ] File upload validation tested
- [ ] SQL injection tests passed
- [ ] XSS protection verified
- [ ] CSRF tokens implemented
- [ ] Security headers configured
- [ ] Logs sanitized (no sensitive data)

### Regular Maintenance
- [ ] Weekly: Check `pnpm audit`
- [ ] Monthly: Update dependencies
- [ ] Quarterly: Security audit
- [ ] Yearly: Penetration testing

---

## 🔧 Quick Commands

```bash
# Check vulnerabilities
pnpm audit

# Update all dependencies
pnpm update

# Test security headers
curl -I https://your-domain.com

# Check SSL configuration
openssl s_client -connect your-domain.com:443

# Generate secure secrets
openssl rand -hex 32
```

---

## 📚 Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security](https://nextjs.org/docs/app/building-your-application/configuring/security)
- [Prisma Security](https://www.prisma.io/docs/guides/security)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
