@echo off
echo ========================================
echo    SCRIPT DI CANCELLAZIONE DATABASE
echo ========================================
echo.
echo ATTENZIONE: Questo script cancellera' TUTTI i dati dal database Supabase!
echo.
pause
echo.
echo Verifica delle dipendenze...
echo.

REM Controlla se Node.js è installato
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERRORE: Node.js non e' installato!
    echo Scarica e installa Node.js da: https://nodejs.org/
    pause
    exit /b 1
)

echo Node.js trovato: 
node --version
echo.

REM Controlla se il pacchetto Supabase è installato
if not exist "node_modules\@supabase\supabase-js" (
    echo Installazione dipendenze Supabase...
    npm install @supabase/supabase-js dotenv
    if %errorlevel% neq 0 (
        echo ERRORE: Impossibile installare le dipendenze!
        pause
        exit /b 1
    )
)

REM Controlla se il file .env.local esiste
if not exist "frontend\.env.local" (
    echo ERRORE: File frontend\.env.local non trovato!
    echo Assicurati che il file contenga:
    echo NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
    echo NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
    pause
    exit /b 1
)

echo Esecuzione script di cancellazione...
echo.
node clear-database.js

echo.
echo Script completato.
pause