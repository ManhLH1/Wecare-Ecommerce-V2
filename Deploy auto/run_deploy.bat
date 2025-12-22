@echo off
REM WeCare Full Automated Deployment Script
REM Double-click to run full deployment

echo ========================================
echo WeCare Auto Deployment Tool
echo ========================================
echo.

REM Change to deploy directory
cd /d "%~dp0"

echo Starting full deployment to host20...
echo.

python deploy.py -s host20 --auto

echo.
echo ========================================
echo Deployment completed!
echo ========================================
echo.

pause
