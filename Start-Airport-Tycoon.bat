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
  echo Installing Airport Tycoon dependencies...
  call npm install
  if errorlevel 1 (
    echo Dependency installation failed. Check your internet connection and try again.
    pause
    exit /b 1
  )
)
call npm run dev
pause
