@echo off
setlocal
set PORT=3005
set URL=http://localhost:%PORT%
cd /d "%~dp0"

powershell -NoProfile -Command "try{$c=New-Object Net.Sockets.TcpClient;$c.Connect('127.0.0.1',3005);$c.Close();exit 0}catch{exit 1}" >nul
if errorlevel 1 (
  start "To-do server" /min cmd /c "npm start"
  for /l %%i in (1,1,30) do (
    powershell -NoProfile -Command "try{$c=New-Object Net.Sockets.TcpClient;$c.Connect('127.0.0.1',3005);$c.Close();exit 0}catch{exit 1}" >nul
    if not errorlevel 1 goto open
    timeout /t 1 >nul
  )
)
:open
start "" "%URL%"
