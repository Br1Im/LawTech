# ========================================
# Скрипт полного обновления и перезапуска проекта LawTech CRM
# Использование: .\redeploy.ps1
# ========================================

# Цвета для вывода
function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Green
}

function Write-Warn {
    param([string]$Message)
    Write-Host "[WARN] $Message" -ForegroundColor Yellow
}

function Write-Error-Custom {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

function Write-Step {
    param([string]$Message)
    Write-Host "`n$Message" -ForegroundColor Cyan
}

# Заголовок
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  LawTech CRM - Полное обновление" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Проверка наличия Git
Write-Step "[1/6] Проверка зависимостей..."
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Error-Custom "Git не установлен!"
    exit 1
}
Write-Info "Git найден"

# Проверка наличия Docker
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Error-Custom "Docker не установлен!"
    exit 1
}
Write-Info "Docker найден"

# Проверка наличия docker-compose
if (-not (Get-Command docker-compose -ErrorAction SilentlyContinue)) {
    Write-Error-Custom "Docker Compose не установлен!"
    exit 1
}
Write-Info "Docker Compose найден"

# Получение изменений из Git
Write-Step "[2/6] Получение последних изменений из Git..."
try {
    git fetch origin
    if ($LASTEXITCODE -ne 0) { throw "Ошибка при fetch" }
    
    $status = git status -sb
    Write-Info "Текущий статус: $status"
    
    git pull origin main
    if ($LASTEXITCODE -ne 0) { throw "Ошибка при pull" }
    
    Write-Info "Изменения успешно получены"
} catch {
    Write-Error-Custom "Ошибка при работе с Git: $_"
    exit 1
}

# Остановка контейнеров
Write-Step "[3/6] Остановка контейнеров..."
try {
    docker-compose down
    if ($LASTEXITCODE -ne 0) {
        Write-Warn "Контейнеры не были запущены или произошла ошибка"
    } else {
        Write-Info "Контейнеры остановлены"
    }
} catch {
    Write-Warn "Ошибка при остановке контейнеров: $_"
}

# Удаление старых образов и volumes (опционально)
Write-Step "[4/6] Очистка старых данных..."
try {
    docker-compose rm -f
    Write-Info "Старые контейнеры удалены"
    
    # Раскомментируйте следующую строку, если хотите удалять неиспользуемые образы
    # docker image prune -f
} catch {
    Write-Warn "Ошибка при очистке: $_"
}

# Сборка и запуск контейнеров
Write-Step "[5/6] Сборка и запуск контейнеров..."
try {
    docker-compose up -d --build
    if ($LASTEXITCODE -ne 0) { throw "Ошибка при запуске контейнеров" }
    Write-Info "Контейнеры успешно запущены"
} catch {
    Write-Error-Custom "Ошибка при запуске контейнеров: $_"
    Write-Info "Попытка просмотра логов..."
    docker-compose logs --tail=50
    exit 1
}

# Проверка статуса
Write-Step "[6/6] Проверка статуса контейнеров..."
Start-Sleep -Seconds 5

try {
    $containers = docker-compose ps
    Write-Host $containers
    
    # Проверка здоровья контейнеров
    $runningContainers = docker-compose ps --services --filter "status=running"
    if ($runningContainers) {
        Write-Info "Запущенные контейнеры:"
        $runningContainers | ForEach-Object { Write-Host "  - $_" -ForegroundColor Green }
    }
} catch {
    Write-Warn "Не удалось получить статус контейнеров: $_"
}

# Итоговое сообщение
Write-Host "`n========================================" -ForegroundColor Green
Write-Host "  ✅ Обновление завершено успешно!" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Green

Write-Host "Полезные команды:" -ForegroundColor Yellow
Write-Host "  Просмотр логов:       docker-compose logs -f"
Write-Host "  Просмотр логов сервиса: docker-compose logs -f [service-name]"
Write-Host "  Остановка:            docker-compose down"
Write-Host "  Перезапуск:           docker-compose restart"
Write-Host "  Статус:               docker-compose ps"
Write-Host ""

exit 0
