@echo off
REM Inicia la aplicación con Docker Compose
cd /d "%~dp0"

REM Verificar si Docker está corriendo
echo Verificando Docker Desktop...
docker ps >nul 2>&1
if errorlevel 1 (
    echo.
    echo ============================================
    echo ERROR: Docker Desktop no está iniciado
    echo ============================================
    echo.
    echo Por favor:
    echo 1. Inicia Docker Desktop
    echo 2. Espera a que esté completamente listo
    echo 3. Ejecuta este script de nuevo
    echo.
    pause
    exit /b 1
)

echo Docker está corriendo. Iniciando servicios con Docker Compose...
docker compose up -d --build

echo.
echo Esperando a que el servicio esté listo (10 segundos)...
timeout /t 10 /nobreak

echo.
echo Abriendo la aplicación web en el navegador...
start http://127.0.0.1:3050

echo.
echo ============================================
echo Servicio iniciado correctamente
echo.
echo Dashboard: http://127.0.0.1:3050
echo Health:    http://127.0.0.1:3050/health
echo.
echo Para detener el servicio, ejecuta:
echo   docker compose down
echo ============================================
pause
