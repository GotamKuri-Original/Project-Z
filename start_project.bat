@echo off
cd /d "%~dp0"
echo ========================================================
echo   Starting CrimeShield AI (Team CTRL Z)
echo ========================================================
echo.

echo Starting Backend Engine (FastAPI) on port 8000...
start "Backend - CrimeShield AI" cmd /k "cd /d ""%~dp0backend"" && .\venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000"

echo Starting Frontend Dashboard (Next.js) on port 3000...
start "Frontend - CrimeShield AI" cmd /k "cd /d ""%~dp0frontend"" && npm run dev"

echo.
echo Both servers are now starting in separate windows!
echo.
echo Please wait a few seconds, then open your browser to:
echo 👉 http://localhost:3000
echo.
pause
