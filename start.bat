@echo off
echo =========================================
echo Starting Manmo AI...
echo =========================================

echo Starting Backend Server (Port 8000)...
start "Manmo AI - Backend" cmd /k ".\venv\Scripts\python.exe backend\app.py"

echo Starting Frontend Server (Port 3000)...
start "Manmo AI - Frontend" cmd /k "cd frontend && python -m http.server 3000"

echo.
echo Both servers are starting up in separate windows!
echo Once they are running, open your browser to:
echo http://localhost:3000
echo.
pause
