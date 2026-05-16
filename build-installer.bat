@echo off
echo ============================================
echo   Building Junk File Cleaner Installer...
echo ============================================
echo.

set CSC_IDENTITY_AUTO_DISCOVERY=false

echo [1/3] Publishing self-contained backend...
cd /d %~dp0frontend
if exist backend rmdir /s /q backend
cd /d %~dp0backend\JunkCleaner.API
dotnet publish JunkCleaner.API.csproj -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true -o "%~dp0frontend\backend"
if %errorlevel% neq 0 (
    echo ERROR: Backend publish failed!
    pause
    exit /b 1
)

echo.
echo [2/3] Building React production bundle...
cd /d %~dp0frontend
call npm run build
if %errorlevel% neq 0 (
    echo ERROR: React build failed!
    pause
    exit /b 1
)

echo.
echo.
echo [3/3] Packaging with electron-builder...
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
