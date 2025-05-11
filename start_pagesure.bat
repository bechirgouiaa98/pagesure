@echo off
REM Démarre le backend Flask
start cmd /k "cd backend && call venv\Scripts\activate && python app.py"

REM Démarre le frontend React
start cmd /k "cd frontend && npm start"

REM Ouvre le frontend dans Chrome après quelques secondes (optionnel)
timeout /t 5
start chrome http://localhost:3000

exit 