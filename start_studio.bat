@echo off
REM =========================================================================
REM MathMotion Studio - One-Click Launcher for Windows
REM Double-click this file from Windows Explorer to launch the studio!
REM =========================================================================

cd /d "%~dp0"

echo ========================================================================
echo   Starting MathMotion Studio (Visual Mathematical Animations)
echo ========================================================================
echo.

where uv >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo [+] Starting with uv runner...
    uv run python studio.py
    goto end
)

where python >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo [+] Starting with Python...
    python studio.py
    goto end
)

where py >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo [+] Starting with Python launcher (py)...
    py studio.py
    goto end
)

echo [!] Error: Python or uv was not found in your PATH.
echo [!] Please install Python 3.10+ from https://python.org and check "Add Python to PATH".
pause

:end
