@echo off
echo Starting FinPulse Backend Server...
start "FinPulse Backend (Port 5000)" cmd /k "cd /d %~dp0server && node index.js"

echo Starting FinPulse Frontend Client...
start "FinPulse Frontend (Port 3000)" cmd /k "cd /d %~dp0client && npm run dev"

echo FinPulse is launching!
echo Frontend will be accessible at: http://localhost:3000
echo Backend will be accessible at:  http://localhost:5000

