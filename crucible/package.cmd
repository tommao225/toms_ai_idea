@echo off
rem Build the demo and pack web/ into dist/crucible-demo.zip for itch.
setlocal
title Crucible package
cd /d "%~dp0"

set "DSH_NODE=%USERPROFILE%\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe"
set "NODE_EXE="
for %%I in (node.exe) do if not "%%~$PATH:I"=="" set "NODE_EXE=%%~$PATH:I"
if not defined NODE_EXE if exist "%DSH_NODE%" set "NODE_EXE=%DSH_NODE%"

if not defined NODE_EXE goto no_node
for %%I in ("%NODE_EXE%") do set "NODE_DIR=%%~dpI"
set "PATH=%NODE_DIR%;%PATH%"

if not exist "node_modules\vite" goto no_deps

echo Building...
"%NODE_EXE%" "node_modules\vite\bin\vite.js" build
if errorlevel 1 goto build_failed

echo Packing...
if exist "dist" rmdir /s /q "dist"
mkdir "dist"
powershell -NoProfile -Command "Compress-Archive -Path 'web\*' -DestinationPath 'dist\crucible-demo.zip' -Force"
if errorlevel 1 goto pack_failed

echo.
echo Done: dist\crucible-demo.zip
echo Upload that zip to itch, and tick "This file will be played in the browser".
echo.
pause
exit /b 0

:no_node
echo Node.js not found. Install it first: https://nodejs.org/
pause
exit /b 1

:no_deps
echo node_modules is missing. Run start-demo.cmd once, or run pnpm install.
pause
exit /b 1

:build_failed
echo Build failed. See the output above.
pause
exit /b 1

:pack_failed
echo Packing failed. See the output above.
pause
exit /b 1
