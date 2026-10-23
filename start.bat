@echo off
cd /d "%~dp0backend"
call npm install
if errorlevel 1 exit /b 1
call npm start

