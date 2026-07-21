@echo off
echo ========================================
echo Pakistan LegalAI - Complete Setup
echo ========================================

cd /d "%~dp0"

echo.
echo [1/6] Setting up Backend...
cd backend

echo Creating virtual environment...
python -m venv venv

echo Installing Python dependencies...
call venv\Scripts\activate.bat
python -m pip install --upgrade pip
pip install uvicorn[standard] fastapi sqlalchemy psycopg2-binary python-multipart python-dotenv pydantic pydantic[email]

if exist requirements.txt (
    echo Found requirements.txt, installing...
    pip install -r requirements.txt
)

echo.
echo [2/6] Checking project structure...
cd ..
dir /b

echo.
echo Looking for frontend directory...
set FRONTEND_DIR=

if exist "frontend\package.json" set FRONTEND_DIR=frontend
if exist "react-frontend\package.json" set FRONTEND_DIR=react-frontend
if exist "client\package.json" set FRONTEND_DIR=client
if exist "web\package.json" set FRONTEND_DIR=web
if exist "ui\package.json" set FRONTEND_DIR=ui

if "%FRONTEND_DIR%"=="" (
    echo.
    echo ========================================
    echo WARNING: No frontend directory found!
    echo ========================================
    echo Please tell me which folder contains package.json
    echo Current directories:
    dir /b
    echo.
    pause
    goto BACKEND_ONLY
)

echo Found frontend at: %FRONTEND_DIR%

echo.
echo [3/6] Installing frontend dependencies...
cd %FRONTEND_DIR%
call npm install
if errorlevel 1 (
    echo Frontend install failed - continuing with backend only
    cd ..
    goto BACKEND_ONLY
)
cd ..

:CREATE_SCRIPTS
echo.
echo [4/6] Creating startup scripts...

echo @echo off > start-backend.bat
echo cd backend >> start-backend.bat
echo call venv\Scripts\activate.bat >> start-backend.bat
echo python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000 >> start-backend.bat
echo pause >> start-backend.bat

if not "%FRONTEND_DIR%"=="" (
    echo @echo off > start-frontend.bat
    echo cd %FRONTEND_DIR% >> start-frontend.bat
    echo call npm start >> start-frontend.bat

    echo @echo off > start-all.bat
    echo start "Backend Server" cmd /k start-backend.bat >> start-all.bat
    echo timeout /t 3 /nobreak ^> nul >> start-all.bat
    echo start "Frontend Server" cmd /k start-frontend.bat >> start-all.bat
)

echo.
echo [4.5/6] Seeding Database and Ingesting Laws...
cd backend
call venv\Scripts\activate.bat
echo Seeding court cases database...
python scripts\seed_db.py
echo Ingesting law documents for RAG FAISS index...
set PYTHONIOENCODING=utf-8
python scripts\ingest_laws.py
cd ..

echo.
echo [5/6] Setup Complete!
echo.

if not "%FRONTEND_DIR%"=="" (
    echo [6/6] Starting servers...
    timeout /t 2 /nobreak > nul
    start "Backend Server" cmd /k start-backend.bat
    timeout /t 3 /nobreak > nul
    start "Frontend Server" cmd /k start-frontend.bat
    
    echo.
    echo ========================================
    echo Servers are starting!
    echo Backend:  http://localhost:8000
    echo Frontend: http://localhost:3000
    echo ========================================
) else (
    goto BACKEND_ONLY
)

pause
exit /b 0

:BACKEND_ONLY
echo.
echo [6/6] Starting backend only...
timeout /t 2 /nobreak > nul
start "Backend Server" cmd /k start-backend.bat

echo.
echo ========================================
echo Backend starting!
echo Backend:  http://localhost:8000
echo ========================================
echo.
echo NOTE: Frontend not found/started
echo Please check your project structure
echo.
pause