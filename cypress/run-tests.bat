@echo off
REM Script สำหรับรัน Cypress tests พร้อมกับ dev server (Windows)

echo 🚀 Starting Next.js dev server...
start "Dev Server" cmd /c "pnpm dev"

echo ⏳ Waiting for server to start...
timeout /t 10 /nobreak >nul

REM ตรวจสอบว่า server รันอยู่
set /a count=0
:check_server
set /a count+=1
if %count% gtr 30 goto server_failed
curl -s http://localhost:3000 >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Server is running!
    goto run_tests
)
echo Waiting for server... (%count%/30)
timeout /t 2 /nobreak >nul
goto check_server

:server_failed
echo ❌ Server failed to start
exit /b 1

:run_tests
echo 🧪 Running Cypress tests...
pnpm cypress:headless

echo ✅ Tests completed!
echo.
echo 📊 ดูผลลัพธ์ได้ที่:
echo    - cypress/videos/ (วิดีโอการรันเทสต์)
echo    - cypress/screenshots/ (screenshots เมื่อเทสต์ล้มเหลว)
echo    - Terminal output (ผลลัพธ์แบบ real-time)

pause

