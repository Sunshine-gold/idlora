@echo off
setlocal
cd /d "%~dp0"

where pwsh >nul 2>&1
if %errorlevel%==0 (
  pwsh -NoProfile -File "%~dp0subir.ps1" %*
) else (
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0subir.ps1" %*
)

echo.
pause
