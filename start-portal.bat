@echo off
title Student Portal Server
cd /d "%~dp0"
echo ===================================================
echo  Starting Student Details and Attendance Portal...
echo ===================================================
start "" "http://localhost:3000"
node server.js
pause
