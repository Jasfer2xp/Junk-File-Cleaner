@echo off
echo ============================================
echo   Junk File Cleaner - Starting Desktop App
echo ============================================
echo.

:: Start backend in background (hidden window)
echo [1/2] Starting backend on http://localhost:5000...
start /min "JunkCleaner Backend" cmd /c "cd /d %~dp0backend && dotnet run --project JunkCleaner.API/JunkCleaner.API.csproj"

:: Wait for backend to be ready
echo Waiting for backend to initialize...
timeout /t 4 /nobreak > nul

:: Launch Electron as desktop app (loads from pre-built files)
echo [2/2] Launching desktop application...
cd /d %~dp0frontend
npm run electron

echo.
echo Application closed.
taskkill /f /im "JunkCleaner.API.exe" >nul 2>&1
