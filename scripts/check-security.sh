#!/bin/bash

# Security Check Script
# Run this before deployment

echo "🔒 Running Security Checks..."
echo ""

# 1. Check for .env in git
echo "1️⃣ Checking for .env in Git..."
if git ls-files | grep -q "^\.env$"; then
    echo "❌ CRITICAL: .env file is tracked in Git!"
    echo "   Run: git rm --cached .env"
    exit 1
else
    echo " .env is not in Git"
fi
echo ""

# 2. Check dependencies
echo "2️⃣ Checking for vulnerable dependencies..."
pnpm audit --audit-level=high
if [ $? -ne 0 ]; then
    echo "⚠️  WARNING: High/Critical vulnerabilities found"
    echo "   Run: pnpm audit fix"
else
    echo " No high/critical vulnerabilities"
fi
echo ""

# 3. Check for hardcoded secrets
echo "3️⃣ Checking for hardcoded secrets..."
if grep -r "password.*=.*['\"]" src/ --include="*.ts" --include="*.tsx" | grep -v "password_hash" | grep -v "type.*password" | grep -v "label.*password"; then
    echo "⚠️  WARNING: Possible hardcoded passwords found"
else
    echo " No obvious hardcoded secrets"
fi
echo ""

# 4. Check for console.log in production code
echo "4️⃣ Checking for debug logs..."
LOG_COUNT=$(grep -r "console.log" src/app/api/ --include="*.ts" --exclude-dir=debug | wc -l)
if [ $LOG_COUNT -gt 0 ]; then
    echo "⚠️  WARNING: Found $LOG_COUNT console.log statements in API routes"
    echo "   Consider removing or using conditional logging"
else
    echo " No console.log in API routes"
fi
echo ""

# 5. Check for SQL injection risks
echo "5️⃣ Checking for SQL injection risks..."
if grep -r "\$queryRaw.*WHERE.*\${" src/ --include="*.ts"; then
    echo "❌ CRITICAL: Potential SQL injection found!"
    echo "   Use Prisma Client methods instead of raw queries"
    exit 1
else
    echo " No obvious SQL injection risks"
fi
echo ""

# 6. Check SSL configuration
echo "6️⃣ Checking SSL configuration..."
if grep -q "listen 443 ssl" nginx.conf; then
    echo " SSL configured in nginx"
else
    echo "⚠️  WARNING: SSL not configured in nginx.conf"
    echo "   Add SSL configuration before production deployment"
fi
echo ""

# 7. Check environment variables
echo "7️⃣ Checking environment configuration..."
if [ -f .env ]; then
    if grep -q "CHANGE_THIS" .env; then
        echo "❌ CRITICAL: Default values found in .env"
        echo "   Update all CHANGE_THIS placeholders"
        exit 1
    fi
    
    if grep -q "default-key-change-in-production" .env; then
        echo "❌ CRITICAL: Default encryption key in .env"
        exit 1
    fi
    
    echo " Environment variables appear configured"
else
    echo "⚠️  WARNING: .env file not found"
fi
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎯 Security Check Complete"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Next steps:"
echo "1. Review any warnings above"
echo "2. Fix critical issues before deployment"
echo "3. Run: pnpm build"
echo "4. Test thoroughly in staging environment"
echo ""
