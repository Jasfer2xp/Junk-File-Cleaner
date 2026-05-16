@echo off
echo ============================================
echo   Building Junk File Cleaner Installer...
echo ============================================
echo.

echo [1/2] Building React production bundle...
cd /d %~dp0frontend
call npm run build
if %errorlevel% neq 0 (
    echo ERROR: React build failed!
    pause
    exit /b 1
)

echo.
echo [2/2] Packaging with electron-builder...
call npx electron-builder
if %errorlevel% neq 0 (
    echo ERROR: electron-builder failed!
    pause
    exit /b 1
)

echo.
echo ============================================
echo   Installer created in: frontend\dist\
echo ============================================
pause
