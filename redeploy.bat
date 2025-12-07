@echo off
REM ========================================
REM Скрипт полного обновления и перезапуска проекта
REM ========================================

echo.
echo ========================================
echo   LawTech CRM - Полное обновление
echo ========================================
echo.

REM Проверка наличия Git
where git >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Git не установлен!
    exit /b 1
)

REM Проверка наличия Docker
where docker >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Docker не установлен!
    exit /b 1
)

echo [1/5] Получение последних изменений из Git...
git fetch origin
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Ошибка при получении изменений из Git
    exit /b 1
)

git pull origin main
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Ошибка при обновлении из Git
    exit /b 1
)
echo [OK] Изменения получены

echo.
echo [2/5] Остановка контейнеров...
docker-compose down
if %ERRORLEVEL% NEQ 0 (
    echo [WARN] Ошибка при остановке контейнеров (возможно, они не запущены)
)
echo [OK] Контейнеры остановлены

echo.
echo [3/5] Удаление старых образов...
docker-compose rm -f
echo [OK] Старые образы удалены

echo.
echo [4/5] Сборка и запуск контейнеров...
docker-compose up -d --build
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Ошибка при запуске контейнеров
    exit /b 1
)
echo [OK] Контейнеры запущены

echo.
echo [5/5] Проверка статуса контейнеров...
timeout /t 5 /nobreak >nul
docker-compose ps

echo.
echo ========================================
echo   Обновление завершено успешно!
echo ========================================
echo.
echo Для просмотра логов используйте:
echo   docker-compose logs -f
echo.
echo Для остановки используйте:
echo   docker-compose down
echo.

exit /b 0
