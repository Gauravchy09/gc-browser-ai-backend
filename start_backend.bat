@echo off
echo.
echo  ========================================
echo   AI Page Assistant - Backend Startup
echo  ========================================
echo.

cd /d "%~dp0backend"

:: Check if .env exists
if not exist .env (
    echo [!] .env file not found!
    echo [!] Copy .env.example to .env and add your GROQ_API_KEY
    echo.
    copy .env.example .env
    echo [+] Created .env from template.
    echo [!] Please edit backend\.env and add your GROQ_API_KEY, then re-run this script.
    pause
    exit /b 1
)

:: Check if venv exists
if not exist venv (
    echo [+] Creating Python virtual environment...
    python -m venv venv
    if errorlevel 1 (
        echo [!] Failed to create venv. Make sure Python 3.10+ is installed.
        pause
        exit /b 1
    )
)

:: Activate venv
call venv\Scripts\activate.bat

:: Install dependencies
echo [+] Installing dependencies...
pip install -r requirements.txt --quiet

echo.
echo [+] Starting FastAPI backend on http://localhost:8000
echo [+] Press Ctrl+C to stop.
echo.

uvicorn app:app --host 0.0.0.0 --port 8000 --reload

pause
