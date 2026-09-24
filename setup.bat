@echo off
set PYTHONIOENCODING=utf-8

echo ========================================================
echo   CrimeShield AI - Automated Setup (Team CTRL Z)
echo ========================================================
echo.

cd backend

echo [1/5] Checking for old virtual environment...
if exist venv\ (
    echo Deleting old venv...
    rmdir /s /q venv
)

echo [2/5] Creating fresh Python 3.12 Virtual Environment...
py -3.12 -m venv venv
if %errorlevel% neq 0 (
    echo [ERROR] Failed to create venv. Please ensure Python 3.12 is installed.
    pause
    exit /b %errorlevel%
)

echo [3/5] Activating environment and installing dependencies...
call venv\Scripts\activate
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install requirements.
    pause
    exit /b %errorlevel%
)

echo Unblocking downloaded binaries to bypass Smart App Control...
powershell -Command "Get-ChildItem -Path venv -Recurse -File | Unblock-File"

echo [4/5] Generating synthetic crime data...
python -m app.data.generator
if %errorlevel% neq 0 (
    echo [ERROR] Failed to generate data.
    pause
    exit /b %errorlevel%
)

echo [5/5] Training XGBoost Machine Learning Model...
python -m app.ml.train_model
if %errorlevel% neq 0 (
    echo [ERROR] Failed to train model.
    pause
    exit /b %errorlevel%
)

echo.
echo ========================================================
echo   Setup Complete! 
echo   Your AI Model is trained and the backend is ready.
echo ========================================================
pause
