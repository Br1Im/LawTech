#!/bin/bash

# ========================================
# Скрипт полного обновления и перезапуска проекта
# Использование: ./redeploy.sh
# ========================================

set -e  # Остановка при ошибке

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Функции для вывода
info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

step() {
    echo -e "\n${CYAN}$1${NC}"
}

# Заголовок
echo ""
echo "========================================"
echo "  LawTech CRM - Полное обновление"
echo "========================================"
echo ""

# Проверка зависимостей
step "[1/6] Проверка зависимостей..."

command -v git >/dev/null 2>&1 || error "Git не установлен"
info "Git найден"

command -v docker >/dev/null 2>&1 || error "Docker не установлен"
info "Docker найден"

command -v docker-compose >/dev/null 2>&1 || error "Docker Compose не установлен"
info "Docker Compose найден"

# Получение изменений из Git
step "[2/6] Получение последних изменений из Git..."
git fetch origin || error "Ошибка при получении изменений"
info "Текущая ветка: $(git branch --show-current)"

git pull origin main || error "Ошибка при обновлении из Git"
info "Изменения успешно получены"

# Остановка контейнеров
step "[3/6] Остановка контейнеров..."
if docker-compose ps | grep -q "Up"; then
    docker-compose down || warn "Ошибка при остановке контейнеров"
    info "Контейнеры остановлены"
else
    info "Контейнеры не запущены"
fi

# Удаление старых контейнеров
step "[4/6] Очистка старых данных..."
docker-compose rm -f || warn "Ошибка при удалении контейнеров"
info "Старые контейнеры удалены"

# Опционально: удаление неиспользуемых образов
# docker image prune -f

# Сборка и запуск контейнеров
step "[5/7] Сборка и запуск контейнеров..."
info "Пересборка фронтенда без кеша..."
docker-compose build --no-cache frontend || warn "Ошибка при сборке фронтенда"
docker-compose up -d --build || error "Ошибка при запуске контейнеров"
info "Контейнеры успешно запущены"

# Ожидание запуска БД
step "[6/7] Ожидание запуска базы данных..."
sleep 10
info "База данных готова"

# Применение миграций
step "[7/7] Применение миграций базы данных..."
docker-compose exec -T backend node scripts/apply_all_migrations.js || warn "Ошибка при применении миграций"
info "Миграции применены"

# Проверка статуса
echo ""
info "Проверка статуса контейнеров..."
sleep 3

docker-compose ps

# Подсчет запущенных контейнеров
RUNNING=$(docker-compose ps | grep "Up" | wc -l)
info "Запущено контейнеров: $RUNNING"

# Итоговое сообщение
echo ""
echo "========================================"
echo -e "${GREEN}  ✅ Обновление завершено успешно!${NC}"
echo "========================================"
echo ""
echo -e "${YELLOW}Полезные команды:${NC}"
echo "  Просмотр логов:         docker-compose logs -f"
echo "  Просмотр логов сервиса: docker-compose logs -f [service-name]"
echo "  Остановка:              docker-compose down"
echo "  Перезапуск:             docker-compose restart"
echo "  Статус:                 docker-compose ps"
echo ""

exit 0
