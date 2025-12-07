#!/bin/bash

# 🚀 Скрипт автоматического деплоя LawTech CRM
# Использование: ./deploy.sh [production|staging]

set -e  # Остановка при ошибке

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

# Проверка аргументов
ENVIRONMENT=${1:-production}

if [ "$ENVIRONMENT" != "production" ] && [ "$ENVIRONMENT" != "staging" ]; then
    error "Неверное окружение. Используйте: production или staging"
fi

info "Начало деплоя для окружения: $ENVIRONMENT"

# Проверка наличия необходимых команд
command -v git >/dev/null 2>&1 || error "Git не установлен"
command -v node >/dev/null 2>&1 || error "Node.js не установлен"
command -v npm >/dev/null 2>&1 || error "npm не установлен"

# Переменные
PROJECT_DIR="/var/www/lawtech-crm"
BACKUP_DIR="/var/backups/lawtech"
DATE=$(date +%Y%m%d_%H%M%S)

# Создание директории для бэкапов
mkdir -p $BACKUP_DIR

info "Создание бэкапа базы данных..."
if [ -f "$PROJECT_DIR/server/.env" ]; then
    source $PROJECT_DIR/server/.env
    mysqldump -u $DB_USER -p$DB_PASSWORD $DB_NAME | gzip > $BACKUP_DIR/db_before_deploy_$DATE.sql.gz
    info "Бэкап создан: $BACKUP_DIR/db_before_deploy_$DATE.sql.gz"
else
    warn "Файл .env не найден, пропускаем бэкап БД"
fi

# Переход в директорию проекта
cd $PROJECT_DIR || error "Директория проекта не найдена: $PROJECT_DIR"

info "Получение последних изменений из Git..."
git fetch origin
git pull origin main || error "Ошибка при получении изменений из Git"

# Обновление Backend
info "Обновление Backend..."
cd server

info "Установка зависимостей Backend..."
npm install --production || error "Ошибка при установке зависимостей Backend"

info "Запуск миграций БД..."
npm run migrate || warn "Ошибка при запуске миграций"

# Обновление Frontend
info "Обновление Frontend..."
cd ../frontend

info "Установка зависимостей Frontend..."
npm install || error "Ошибка при установке зависимостей Frontend"

info "Сборка Frontend..."
npm run build || error "Ошибка при сборке Frontend"

# Перезапуск сервисов
cd $PROJECT_DIR

if command -v pm2 >/dev/null 2>&1; then
    info "Перезапуск Backend через PM2..."
    pm2 restart lawtech-backend || error "Ошибка при перезапуске PM2"
    pm2 save
elif command -v docker-compose >/dev/null 2>&1; then
    info "Перезапуск через Docker Compose..."
    docker-compose -f docker-compose.prod.yml up -d --build || error "Ошибка при перезапуске Docker"
else
    warn "PM2 и Docker не найдены, пропускаем перезапуск"
fi

# Перезапуск Nginx
if command -v nginx >/dev/null 2>&1; then
    info "Проверка конфигурации Nginx..."
    nginx -t || error "Ошибка в конфигурации Nginx"
    
    info "Перезапуск Nginx..."
    systemctl reload nginx || error "Ошибка при перезапуске Nginx"
fi

# Очистка старых бэкапов (старше 7 дней)
info "Очистка старых бэкапов..."
find $BACKUP_DIR -name "db_before_deploy_*.sql.gz" -mtime +7 -delete

# Проверка работоспособности
info "Проверка работоспособности..."
sleep 5

# Проверка Backend
if curl -f http://localhost:3001/api/health >/dev/null 2>&1; then
    info "✅ Backend работает корректно"
else
    error "❌ Backend не отвечает"
fi

# Проверка Frontend
if curl -f http://localhost >/dev/null 2>&1; then
    info "✅ Frontend работает корректно"
else
    warn "⚠️  Frontend не отвечает (возможно, нужна настройка домена)"
fi

# Вывод логов
if command -v pm2 >/dev/null 2>&1; then
    info "Последние логи Backend:"
    pm2 logs lawtech-backend --lines 20 --nostream
fi

info "========================================="
info "✅ Деплой успешно завершен!"
info "========================================="
info "Окружение: $ENVIRONMENT"
info "Дата: $DATE"
info "Бэкап: $BACKUP_DIR/db_before_deploy_$DATE.sql.gz"
info "========================================="

# Отправка уведомления (опционально)
# curl -X POST https://your-webhook-url -d "Деплой $ENVIRONMENT завершен успешно"

exit 0
