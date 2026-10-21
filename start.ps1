Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "       Starting FlowDesk AI Voice Sales Specialist      " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

$rootDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# 1. Verify venv
$venvPython = Join-Path $rootDir "backend\venv\Scripts\python.exe"
if (-not (Test-Path $venvPython)) {
    Write-Host "[ERROR] Virtualenv not found at backend\venv!" -ForegroundColor Red
    Write-Host "Run: python -m venv backend\venv; .\backend\venv\Scripts\pip install -r backend\requirements.txt"
    exit 1
}

# 2. Launch Backend in a new window
Write-Host "[1/3] Launching FastAPI Backend (Port 8000)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$rootDir'; `$host.UI.RawUI.WindowTitle = 'FlowDesk AI - Backend'; & '$venvPython' -m uvicorn backend.app.main:app --port 8000 --reload --h11-max-incomplete-event-size 65536"

# 3. Launch Frontend in a new window
Write-Host "[2/3] Launching Vite Frontend (Port 5173)..." -ForegroundColor Green
$frontendDir = Join-Path $rootDir "frontend"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$frontendDir'; `$host.UI.RawUI.WindowTitle = 'FlowDesk AI - Frontend'; npm run dev"

# 4. Wait & Open browser
Write-Host "[3/3] Waiting for servers to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

Write-Host "Opening browser at http://localhost:5173 ..." -ForegroundColor Green
Start-Process "http://localhost:5173"

Write-Host ""
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "FlowDesk AI is live!" -ForegroundColor Green
Write-Host "  Frontend: http://localhost:5173"
Write-Host "  Backend:  http://127.0.0.1:8000"
Write-Host "========================================================" -ForegroundColor Cyan
