@echo off
setlocal EnableDelayedExpansion

REM ─────────────────────────────────────────────────────────────────────
REM  Pakistan LegalAI - one-click setup and start
REM  Double-click on a fresh clone: installs Python venv + deps,
REM  Node modules, copies .env, creates data folders, then launches
REM  both servers (Backend on :8000, Frontend on :3000).
REM ─────────────────────────────────────────────────────────────────────

cd /d "%~dp0"
set "ROOT=%cd%"

REM ── Use Python from PATH (works inside venv Scripts too) ────────────
set "PYEXE=python"

title Pakistan LegalAI - one-click setup

cls
echo.
echo ===========================================================
echo   Pakistan LegalAI  v5.0  -  One-click setup and start
echo ===========================================================
echo   This will install all dependencies and start both servers.
echo   Press Ctrl+C any time to abort.
echo.
echo ===========================================================
echo.

REM ── 0. Pre-flight: required tools ────────────────────────────────────
echo [0/6] Checking prerequisites...

where %PYEXE% >nul 2>nul
if errorlevel 1 goto :NO_PYTHON
for /f "delims=" %%v in ('%PYEXE% --version 2^>^&1') do set "PYV=%%v"
echo   [OK] %PYV% found

where node >nul 2>nul
if errorlevel 1 goto :NO_NODE
for /f "delims=" %%v in ('node --version 2^>^&1') do set "NODV=%%v"
echo   [OK] Node %NODV% found

where npm >nul 2>nul
if errorlevel 1 goto :NO_NPM
for /f "delims=" %%v in ('npm --version 2^>^&1') do set "NPMV=%%v"
echo   [OK] npm %NPMV% found
echo.

REM ── 1. Backend .env ──────────────────────────────────────────────────
echo [1/6] Setting up backend .env...
if exist "backend\.env" goto :ENV_OK
if not exist ".env.example" goto :NO_ENV_EXAMPLE
copy /Y ".env.example" "backend\.env" >nul
if errorlevel 1 (
    echo   [X] Failed to copy .env.example to backend\.env
    pause
    exit /b 1
)
echo   [OK] Created backend\.env from .env.example
echo   [WARN] Edit backend\.env and set your GROQ_API_KEY before using chat.
goto :ENV_DONE
:ENV_OK
echo   [OK] backend\.env already exists
:NO_ENV_EXAMPLE
:ENV_DONE
echo.

REM ── 2. Backend data directories (for FAISS RAG) ──────────────────────
echo [2/6] Creating backend data folders...
if not exist "backend\data"          mkdir "backend\data"          >nul
if not exist "backend\data\laws"        mkdir "backend\data\laws"        >nul
if not exist "backend\data\faiss_index" mkdir "backend\data\faiss_index" >nul
echo   [OK] backend\data\, backend\data\laws\, backend\data\faiss_index\ ready
echo.

REM ── 3. Python venv + requirements ───────────────────────────────────
echo [3/6] Setting up Python virtual environment...
if not exist "backend\venv\Scripts\python.exe" goto :CREATE_VENV
echo   [OK] venv already exists
goto :VENV_READY
:CREATE_VENV
echo   Creating venv at backend\venv ...
pushd backend
%PYEXE% -m venv venv
if errorlevel 1 (
    echo   [X] Failed to create venv. Aborting.
    popd
    pause
    exit /b 1
)
popd
echo   [OK] venv created
:VENV_READY

echo   Upgrading pip...
pushd backend
call "venv\Scripts\activate.bat"
if errorlevel 1 (
    echo   [X] Failed to activate venv.
    popd
    pause
    exit /b 1
)
python -m pip install --upgrade pip --quiet
if errorlevel 1 (
    echo   [X] pip upgrade failed. Check your internet connection.
    popd
    pause
    exit /b 1
)

echo   Installing Python dependencies (this may take a few minutes)...
pip install -q -r requirements.txt
if errorlevel 1 (
    echo   [X] pip install -r requirements.txt failed.
    echo       Re-run with verbose output to see the first error:
    echo           pip install -r requirements.txt
    popd
    pause
    exit /b 1
)
echo   [OK] Python dependencies installed

echo   Verifying email-validator (required by pydantic EmailStr)...
python -c "import email_validator" >nul 2>nul
if errorlevel 1 (
    echo   Installing email-validator...
    pip install -q email-validator
    if errorlevel 1 (
        echo   [X] Failed to install email-validator.
        popd
        pause
        exit /b 1
    )
)
echo   [OK] email-validator present
popd
echo.

REM ── 4. Frontend npm install ─────────────────────────────────────────
echo [4/6] Setting up frontend dependencies...
if exist "react-frontend\node_modules\react-scripts\package.json" goto :NPM_READY
pushd react-frontend
echo   Running npm install (this may take a few minutes)...
call npm install --no-audit --no-fund --loglevel=error
if errorlevel 1 (
    echo   [X] npm install failed.
    popd
    pause
    exit /b 1
)
popd
echo   [OK] node_modules installed
goto :NPM_DONE
:NPM_READY
echo   [OK] node_modules already present
:NPM_DONE
echo.

REM ── 4.5. Seed database and ingest laws ─────────────────────────────────────
echo [4.5/6] Seeding database and ingesting laws...
pushd backend
call "venv\Scripts\activate.bat"

if not exist "legalai.db" (
    echo   Seeding court cases database...
    python scripts\seed_db.py
) else (
    echo   [OK] Database already exists
)

if not exist "data\faiss_index\index.faiss" (
    echo   Ingesting law documents for RAG FAISS index...
    set PYTHONIOENCODING=utf-8
    python scripts\ingest_laws.py
) else (
    echo   [OK] FAISS RAG index already exists
)
popd
echo.

REM ── 5. Free the ports if a previous run left them occupied ───────────
echo [5/6] Checking ports 3000 and 8000...
set "PORT_OK=1"
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":8000" ^| findstr "LISTENING"') do (
    echo   [WARN] Port 8000 is in use by PID %%p - leaving it as-is.
    set "PORT_OK=0"
)
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":3000" ^| findstr "LISTENING"') do (
    echo   [WARN] Port 3000 is in use by PID %%p - leaving it as-is.
    set "PORT_OK=0"
)
if "%PORT_OK%"=="1" echo   [OK] Ports 3000 and 8000 are free
echo.

REM ── 6. Launch both servers ──────────────────────────────────────────
echo [6/6] Launching servers...
echo.
echo   Backend  -^> http://localhost:8000   (docs: /docs)
echo   Frontend -^> http://localhost:3000
echo.
echo   Two new windows will open. Close them to stop the app.
echo   This window can be closed safely once both servers are up.
echo.

REM Start backend in its own window (keeps it alive after this BAT closes)
start "LegalAI - Backend (uvicorn :8000)" cmd /k "cd /d "%ROOT%\backend" && venv\Scripts\activate.bat && python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000"

REM Give the backend a moment to bind :8000 before the frontend's proxy kicks in
timeout /t 5 /nobreak >nul

REM Start frontend in its own window
start "LegalAI - Frontend (react-scripts :3000)" cmd /k "cd /d "%ROOT%\react-frontend" && npm start"

echo   Both servers are starting. Two new windows have opened.
echo.
echo   If your browser did not open automatically, visit:
echo       http://localhost:3000
echo.
pause
exit /b 0

:NO_PYTHON
echo   [X] Python not found in PATH.
echo       Install Python 3.10+ from https://www.python.org/downloads/
echo       Make sure to tick "Add Python to PATH" during install.
pause
exit /b 1

:NO_NODE
echo   [X] Node.js not found in PATH.
echo       Install Node.js 18+ from https://nodejs.org/
pause
exit /b 1

:NO_NPM
echo   [X] npm not found in PATH.
echo       It usually ships with Node.js - reinstall Node from https://nodejs.org/
pause
exit /b 1
