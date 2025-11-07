#!/bin/bash

# 🔍 Скрипт проверки готовности проекта к деплою
# Использование: bash check-deploy-ready.sh

echo "🔍 Проверка готовности LawTech к деплою..."
echo ""

# Цвета
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

ERRORS=0
WARNINGS=0

# Функция для проверки
check() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
        ((ERRORS++))
    fi
}

warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
    ((WARNINGS++))
}

info() {
    echo -e "${GREEN}ℹ️  $1${NC}"
}

echo "📦 Проверка структуры проекта..."
echo "================================"

# Проверка основных директорий
[ -d "frontend" ] && check 0 "Директория frontend существует" || check 1 "Директория frontend не найдена"
[ -d "server" ] && check 0 "Директория server существует" || check 1 "Директория server не найдена"
[ -d "server/scripts" ] && check 0 "Директория server/scripts существует" || check 1 "Директория server/scripts не найдена"

echo ""
echo "📄 Проверка конфигурационных файлов..."
echo "======================================="

# Проверка package.json
[ -f "frontend/package.json" ] && check 0 "frontend/package.json существует" || check 1 "frontend/package.json не найден"
[ -f "server/package.json" ] && check 0 "server/package.json существует" || check 1 "server/package.json не найден"

# Проверка Dockerfile
[ -f "frontend/Dockerfile" ] && check 0 "frontend/Dockerfile существует" || check 1 "frontend/Dockerfile не найден"
[ -f "server/Dockerfile" ] && check 0 "server/Dockerfile существует" || check 1 "server/Dockerfile не найден"
[ -f "server/scripts/Dockerfile" ] && check 0 "server/scripts/Dockerfile существует" || check 1 "server/scripts/Dockerfile не найден"

# Проверка docker-compose
[ -f "docker-compose.yml" ] && check 0 "docker-compose.yml существует" || warn "docker-compose.yml не найден (опционально)"

# Проверка requirements.txt
[ -f "server/scripts/requirements.txt" ] && check 0 "server/scripts/requirements.txt существует" || check 1 "server/scripts/requirements.txt не найден"

# Проверка nginx.conf
[ -f "frontend/nginx.conf" ] && check 0 "frontend/nginx.conf существует" || warn "frontend/nginx.conf не найден"

echo ""
echo "🔧 Проверка основных файлов..."
echo "==============================="

# Проверка server.js
[ -f "server/server.js" ] && check 0 "server/server.js существует" || check 1 "server/server.js не найден"

# Проверка faiss_service.py
[ -f "server/scripts/faiss_service.py" ] && check 0 "server/scripts/faiss_service.py существует" || check 1 "server/scripts/faiss_service.py не найден"

# Проверка миграций
[ -f "server/database/migrations/001_crm_sync_mysql.sql" ] && check 0 "Миграция MySQL существует" || warn "Миграция MySQL не найдена"

echo ""
echo "📝 Проверка документации..."
echo "============================"

[ -f "README.md" ] && check 0 "README.md существует" || warn "README.md не найден"
[ -f "DEPLOYMENT_GUIDE.md" ] && check 0 "DEPLOYMENT_GUIDE.md существует" || warn "DEPLOYMENT_GUIDE.md не найден"
[ -f "QUICK_DEPLOY.md" ] && check 0 "QUICK_DEPLOY.md существует" || warn "QUICK_DEPLOY.md не найден"

echo ""
echo "🔐 Проверка безопасности..."
echo "==========================="

# Проверка .env файлов (не должны быть в репозитории)
if [ -f "server/.env" ]; then
    warn "server/.env найден - убедитесь, что он в .gitignore"
fi

if [ -f "frontend/.env.production" ]; then
    warn "frontend/.env.production найден - убедитесь, что он в .gitignore"
fi

# Проверка .gitignore
if [ -f ".gitignore" ]; then
    if grep -q "\.env" .gitignore; then
        check 0 ".gitignore содержит .env"
    else
        warn ".gitignore не содержит .env"
    fi
    
    if grep -q "node_modules" .gitignore; then
        check 0 ".gitignore содержит node_modules"
    else
        warn ".gitignore не содержит node_modules"
    fi
fi

echo ""
echo "🐳 Проверка Docker конфигурации..."
echo "==================================="

if [ -f "docker-compose.yml" ]; then
    # Проверка наличия всех сервисов
    if grep -q "frontend:" docker-compose.yml; then
        check 0 "Сервис frontend настроен"
    else
        warn "Сервис frontend не найден в docker-compose.yml"
    fi
    
    if grep -q "backend:" docker-compose.yml; then
        check 0 "Сервис backend настроен"
    else
        warn "Сервис backend не найден в docker-compose.yml"
    fi
    
    if grep -q "faiss-service:" docker-compose.yml; then
        check 0 "Сервис faiss-service настроен"
    else
        warn "Сервис faiss-service не найден в docker-compose.yml"
    fi
    
    if grep -q "db:" docker-compose.yml; then
        check 0 "Сервис db настроен"
    else
        warn "Сервис db не найден в docker-compose.yml"
    fi
fi

echo ""
echo "📊 Результаты проверки"
echo "======================"
echo ""

if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ Проект готов к деплою!${NC}"
    echo ""
    echo "Следующие шаги:"
    echo "1. Создайте .env файлы на основе .env.production.example"
    echo "2. Измените пароли и секретные ключи"
    echo "3. Выберите способ деплоя:"
    echo "   - Docker: docker-compose up -d"
    echo "   - Автоматический: bash deploy.sh"
    echo "   - Ручной: следуйте DEPLOYMENT_GUIDE.md"
    exit 0
else
    echo -e "${RED}❌ Найдено ошибок: $ERRORS${NC}"
    echo -e "${YELLOW}⚠️  Предупреждений: $WARNINGS${NC}"
    echo ""
    echo "Исправьте ошибки перед деплоем!"
    exit 1
fi
