# Security Check Script for Windows PowerShell
# Run this before deployment

Write-Host "🔒 Running Security Checks..." -ForegroundColor Cyan
Write-Host ""

$exitCode = 0

# 1. Check for .env in git
Write-Host "1️⃣ Checking for .env in Git..." -ForegroundColor Yellow
$envInGit = git ls-files | Select-String -Pattern "^\.env$"
if ($envInGit) {
    Write-Host "❌ CRITICAL: .env file is tracked in Git!" -ForegroundColor Red
    Write-Host "   Run: git rm --cached .env" -ForegroundColor Red
    $exitCode = 1
} else {
    Write-Host "✅ .env is not in Git" -ForegroundColor Green
}
Write-Host ""

# 2. Check dependencies
Write-Host "2️⃣ Checking for vulnerable dependencies..." -ForegroundColor Yellow
$auditResult = pnpm audit --audit-level=high 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  WARNING: High/Critical vulnerabilities found" -ForegroundColor Yellow
    Write-Host "   Run: pnpm audit" -ForegroundColor Yellow
} else {
    Write-Host "✅ No high/critical vulnerabilities" -ForegroundColor Green
}
Write-Host ""

# 3. Check for hardcoded secrets
Write-Host "3️⃣ Checking for hardcoded secrets..." -ForegroundColor Yellow
$secrets = Get-ChildItem -Path src -Recurse -Include *.ts,*.tsx | 
    Select-String -Pattern "password.*=.*['\"]" | 
    Where-Object { $_.Line -notmatch "password_hash" -and $_.Line -notmatch "type.*password" -and $_.Line -notmatch "label.*password" }
if ($secrets) {
    Write-Host "⚠️  WARNING: Possible hardcoded passwords found" -ForegroundColor Yellow
    $secrets | ForEach-Object { Write-Host "   $($_.Path):$($_.LineNumber)" -ForegroundColor Gray }
} else {
    Write-Host "✅ No obvious hardcoded secrets" -ForegroundColor Green
}
Write-Host ""

# 4. Check for console.log in production code
Write-Host "4️⃣ Checking for debug logs..." -ForegroundColor Yellow
$logs = Get-ChildItem -Path src/app/api -Recurse -Include *.ts -Exclude *debug* | 
    Select-String -Pattern "console\.log"
$logCount = ($logs | Measure-Object).Count
if ($logCount -gt 0) {
    Write-Host "⚠️  WARNING: Found $logCount console.log statements in API routes" -ForegroundColor Yellow
    Write-Host "   Consider removing or using conditional logging" -ForegroundColor Yellow
} else {
    Write-Host "✅ No console.log in API routes" -ForegroundColor Green
}
Write-Host ""

# 5. Check for SQL injection risks
Write-Host "5️⃣ Checking for SQL injection risks..." -ForegroundColor Yellow
$sqlInjection = Get-ChildItem -Path src -Recurse -Include *.ts | 
    Select-String -Pattern '\$queryRaw.*WHERE.*\$\{'
if ($sqlInjection) {
    Write-Host "❌ CRITICAL: Potential SQL injection found!" -ForegroundColor Red
    Write-Host "   Use Prisma Client methods instead of raw queries" -ForegroundColor Red
    $sqlInjection | ForEach-Object { Write-Host "   $($_.Path):$($_.LineNumber)" -ForegroundColor Gray }
    $exitCode = 1
} else {
    Write-Host "✅ No obvious SQL injection risks" -ForegroundColor Green
}
Write-Host ""

# 6. Check SSL configuration
Write-Host "6️⃣ Checking SSL configuration..." -ForegroundColor Yellow
if (Test-Path nginx.conf) {
    $sslConfig = Get-Content nginx.conf | Select-String -Pattern "listen 443 ssl"
    if ($sslConfig) {
        Write-Host "✅ SSL configured in nginx" -ForegroundColor Green
    } else {
        Write-Host "⚠️  WARNING: SSL not configured in nginx.conf" -ForegroundColor Yellow
        Write-Host "   Add SSL configuration before production deployment" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️  WARNING: nginx.conf not found" -ForegroundColor Yellow
}
Write-Host ""

# 7. Check environment variables
Write-Host "7️⃣ Checking environment configuration..." -ForegroundColor Yellow
if (Test-Path .env) {
    $envContent = Get-Content .env -Raw
    if ($envContent -match "CHANGE_THIS") {
        Write-Host "❌ CRITICAL: Default values found in .env" -ForegroundColor Red
        Write-Host "   Update all CHANGE_THIS placeholders" -ForegroundColor Red
        $exitCode = 1
    } elseif ($envContent -match "default-key-change-in-production") {
        Write-Host "❌ CRITICAL: Default encryption key in .env" -ForegroundColor Red
        $exitCode = 1
    } else {
        Write-Host "✅ Environment variables appear configured" -ForegroundColor Green
    }
} else {
    Write-Host "⚠️  WARNING: .env file not found" -ForegroundColor Yellow
}
Write-Host ""

# Summary
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "🎯 Security Check Complete" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor White
Write-Host "1. Review any warnings above" -ForegroundColor White
Write-Host "2. Fix critical issues before deployment" -ForegroundColor White
Write-Host "3. Run: pnpm build" -ForegroundColor White
Write-Host "4. Test thoroughly in staging environment" -ForegroundColor White
Write-Host ""

exit $exitCode
