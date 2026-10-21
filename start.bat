@echo off
title FlowDesk AI Voice System Launcher
echo ========================================================
echo        Starting FlowDesk AI Voice Sales Specialist
echo ========================================================
echo.

cd /d "%~dp0"

:: 1. Verify backend virtual environment
if not exist "backend\venv\Scripts\python.exe" (
    echo [ERROR] Python virtual environment not found at backend\venv!
    echo Please create it first:
    echo   python -m venv backend\venv
    echo   backend\venv\Scripts\pip install -r backend\requirements.txt
    pause
    exit /b 1
)

:: 2. Launch FastAPI backend in a dedicated window
echo [1/3] Launching FastAPI Backend on http://127.0.0.1:8000 ...
start "FlowDesk AI - Backend (Port 8000)" cmd /k "title FlowDesk AI - Backend && cd /d "%~dp0" && backend\venv\Scripts\python.exe -m uvicorn backend.app.main:app --port 8000 --reload --h11-max-incomplete-event-size 65536"

:: 3. Launch Vite frontend in a dedicated window
echo [2/3] Launching Vite Frontend on http://localhost:5173 ...
start "FlowDesk AI - Frontend (Port 5173)" cmd /k "title FlowDesk AI - Frontend && cd /d "%~dp0frontend" && npm run dev"

:: 4. Wait briefly and open browser
echo [3/3] Waiting for servers to initialize...
timeout /t 3 /nobreak >nul

echo Opening browser at http://localhost:5173 ...
start http://localhost:5173

echo.
echo ========================================================
echo FlowDesk AI is up and running!
echo - Frontend: http://localhost:5173
echo - Backend:  http://127.0.0.1:8000
echo - Swagger:  http://127.0.0.1:8000/docs
echo Close the respective terminal windows to stop the servers.
echo ========================================================
