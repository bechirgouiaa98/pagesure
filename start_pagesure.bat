@echo off
echo Starting PageSure development environment...

REM Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo Error: Node.js is not installed or not in PATH
    pause
    exit /b 1
)

REM Check if Python is installed
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo Error: Python is not installed or not in PATH
    pause
    exit /b 1
)

REM Setup backend
echo Setting up backend...
cd backend

REM Create virtual environment if it doesn't exist
if not exist venv (
    echo Creating Python virtual environment...
    python -m venv venv
)

REM Activate virtual environment and install dependencies
call venv\Scripts\activate
pip install -r requirements.txt

REM Install Node.js dependencies for the scraper
cd scrapers
echo Installing scraper dependencies...
call npm install
cd ..

REM Start Flask backend
echo Starting Flask backend...
start cmd /k "call venv\Scripts\activate && python app.py"

REM Setup frontend
cd ..
cd frontend

REM Install frontend dependencies if node_modules doesn't exist
if not exist node_modules (
    echo Installing frontend dependencies...
    call npm install
)

REM Start React frontend
echo Starting React frontend...
start cmd /k "call npm start"

REM Open browser after a delay
echo Waiting for servers to start...
timeout /t 10
start chrome http://localhost:3000

echo PageSure development environment is starting...
echo Backend will be available at http://localhost:5000
echo Frontend will be available at http://localhost:3000
echo.
echo Press any key to close this window...
pause >nul 