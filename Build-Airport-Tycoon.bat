@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is required. Install Node.js 20.19+ or 22.12+ and run this file again.
  pause
  exit /b 1
)
if not exist node_modules\ (
  call npm install
  if errorlevel 1 pause & exit /b 1
)
call npm run build
if errorlevel 1 pause & exit /b 1
echo.
echo Production build created in the dist folder.
pause
