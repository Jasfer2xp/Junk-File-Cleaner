@echo off
echo ============================================
echo   Junk File Cleaner - Starting Desktop App
echo ============================================
echo.

:: Electron dev starts the backend and React dev server together.
echo [1/1] Launching desktop development app...
cd /d %~dp0frontend
npm run electron:dev

echo.
echo Application closed.
