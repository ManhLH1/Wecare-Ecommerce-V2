@echo off
REM DevTunnel helper batch for Windows - Development Mode
REM Usage: devtunnel-dev.bat [port]

setlocal
if "%~1"=="" (
  set "PORT=3000"
) else (
  set "PORT=%~1"
)

echo ================================
echo Dev Tunnel for Development Mode
echo Port: %PORT%
echo ================================

echo.
echo Instructions:
echo 1. Open a new terminal/command prompt
echo 2. Run: npm run dev
echo 3. Wait for Next.js to start on http://localhost:%PORT%
echo 4. Come back here and press any key to create the tunnel
echo.

pause

echo.
echo Creating dev tunnel (anonymous access allowed)...
echo Share the tunnel URL with your testers.
echo Press Ctrl+C to stop the tunnel.
echo.

REM Create dev tunnel with anonymous access
devtunnel host -p %PORT% --allow-anonymous

echo.
echo Dev tunnel session ended.
pause

endlocal
