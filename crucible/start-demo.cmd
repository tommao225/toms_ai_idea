@echo off
rem Double-click to start the local server and open the browser.
rem Pass --no-open to only start the server.
setlocal
title Crucible demo
cd /d "%~dp0"

set "OPEN=--open"
if /i "%~1"=="--no-open" set "OPEN="

set "PORT=5273"
set "DSH_NODE=%USERPROFILE%\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe"
set "DSH_PNPM=%USERPROFILE%\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\pnpm\bin\pnpm.mjs"

set "NODE_EXE="
for %%I in (node.exe) do if not "%%~$PATH:I"=="" set "NODE_EXE=%%~$PATH:I"
if not defined NODE_EXE if exist "%DSH_NODE%" set "NODE_EXE=%DSH_NODE%"
if not defined NODE_EXE if exist "%ProgramFiles%\nodejs\node.exe" set "NODE_EXE=%ProgramFiles%\nodejs\node.exe"

if not defined NODE_EXE goto no_node

for %%I in ("%NODE_EXE%") do set "NODE_DIR=%%~dpI"
set "PATH=%NODE_DIR%;%PATH%"

netstat -ano | findstr ":%PORT%" | findstr "LISTENING" >nul 2>nul
if not errorlevel 1 goto already_running

if not exist "node_modules\vite" goto install
goto serve

:install
echo.
echo First run: installing dependencies, this may take a few minutes.
echo Keep this window open.
echo.
if exist "%DSH_PNPM%" (
  "%NODE_EXE%" "%DSH_PNPM%" install
) else (
  call pnpm install
)
if errorlevel 1 goto install_failed
goto serve

:serve
echo.
echo Starting http://127.0.0.1:%PORT%/
echo Close this window to stop the server.
echo.
"%NODE_EXE%" "node_modules\vite\bin\vite.js" --host 127.0.0.1 --port %PORT% --strictPort %OPEN%
echo.
echo Server stopped.
pause
exit /b 0

:already_running
echo Server already running at http://127.0.0.1:%PORT%/
start "" "http://127.0.0.1:%PORT%/"
exit /b 0

:no_node
echo.
echo Node.js not found. Install it first: https://nodejs.org/
echo.
pause
exit /b 1

:install_failed
echo.
echo Install failed. Run "pnpm install" in this folder to see the details.
echo.
pause
exit /b 1
