@echo off
REM DevTunnel helper batch for Windows
REM Usage: devtunnel.bat [port]

setlocal
if "%~1"=="" (
  set "PORT=8080"
) else (
  set "PORT=%~1"
)

echo ================================
echo Building Next.js app and starting Dev Tunnel
echo Port: %PORT%
echo ================================

echo.
echo 1) npm install (skipped here) - ensure dependencies are installed beforehand

echo.
echo 2) Run build
npm run build
if errorlevel 1 (
  echo Build failed. Exiting.
  goto :eof
)

echo.
echo 3) Start Next.js (production) in a new window
REM This opens a new terminal window and runs the server; output will be visible there.
start "" cmd /c "npx next start -p %PORT%"

timeout /t 2 >nul

echo.
echo 4) Start Dev Tunnel (will run in this window)
where devtunnel >nul 2>&1
if %errorlevel%==0 (
  echo Using local devtunnel CLI...
  devtunnel host -p %PORT%
) else (
  echo Local devtunnel CLI not found, trying npx package fallback...
  npx @microsoft/dev-tunnels-ssh host -p %PORT%
)

echo.
echo Dev tunnel session ended. Press any key to exit.
pause >nul

endlocal


