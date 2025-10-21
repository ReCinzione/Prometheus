@echo off
echo Avvio dell'applicazione Prometheus in modalità sviluppo...
echo.

echo [1/2] Avvio del backend FastAPI...
start "Backend" cmd /k "cd /d backend && python -m uvicorn app:app --reload --host 0.0.0.0 --port 8000"

echo [2/2] Avvio del frontend Next.js...
start "Frontend" cmd /k "cd /d frontend && npm run dev"

echo.
echo Applicazione avviata!
echo Backend: http://localhost:8000
echo Frontend: http://localhost:3000
echo.
echo Premi un tasto per chiudere questa finestra...
pause > nul