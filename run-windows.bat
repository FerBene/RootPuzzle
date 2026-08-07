@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo No se encontro Node.js.
  echo Instala Node.js LTS desde https://nodejs.org/ y volve a ejecutar este archivo.
  echo.
  pause
  exit /b 1
)

if not exist node_modules (
  echo Instalando dependencias la primera vez...
  call npm install
  if errorlevel 1 (
    echo.
    echo Hubo un error instalando las dependencias.
    pause
    exit /b 1
  )
)

echo.
echo Iniciando Raices...
echo Cuando aparezca "Ready", abri http://localhost:3000
start "" http://localhost:3000
call npm run dev
