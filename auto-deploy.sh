#!/bin/bash

# 🚀 Скрипт автоматического деплоя для LawTech
# Запускается на сервере после git pull

set -e

echo "🔄 Начинаем автоматический деплой..."

# Переходим в директорию проекта
cd ~/LawTech

# Подтягиваем изменения
echo "📥 Подтягиваем изменения из Git..."
git pull origin main

# Проверяем что изменилось
CHANGED_FILES=$(git diff --name-only HEAD@{1} HEAD)

echo "📝 Изменённые файлы:"
echo "$CHANGED_FILES"

# Определяем что нужно пересобрать
REBUILD_BACKEND=false
REBUILD_FRONTEND=false
REBUILD_FAISS=false

if echo "$CHANGED_FILES" | grep -q "^server/"; then
    REBUILD_BACKEND=true
    echo "🔧 Обнаружены изменения в backend"
fi

if echo "$CHANGED_FILES" | grep -q "^frontend/"; then
    REBUILD_FRONTEND=true
    echo "🎨 Обнаружены изменения в frontend"
fi

if echo "$CHANGED_FILES" | grep -q "^server/scripts/"; then
    REBUILD_FAISS=true
    echo "🤖 Обнаружены изменения в FAISS сервисе"
fi

if echo "$CHANGED_FILES" | grep -q "docker-compose.yml"; then
    REBUILD_BACKEND=true
    REBUILD_FRONTEND=true
    REBUILD_FAISS=true
    echo "🐳 Обнаружены изменения в docker-compose.yml"
fi

# Пересобираем только то, что изменилось
if [ "$REBUILD_BACKEND" = true ]; then
    echo "🔨 Пересобираем backend..."
    docker-compose build --no-cache backend
    docker-compose up -d backend
fi

if [ "$REBUILD_FRONTEND" = true ]; then
    echo "🔨 Пересобираем frontend..."
    docker-compose build --no-cache frontend
    docker-compose up -d frontend
fi

if [ "$REBUILD_FAISS" = true ]; then
    echo "🔨 Пересобираем FAISS сервис..."
    docker-compose build --no-cache faiss-service
    docker-compose up -d faiss-service
fi

# Если ничего не изменилось, просто перезапускаем
if [ "$REBUILD_BACKEND" = false ] && [ "$REBUILD_FRONTEND" = false ] && [ "$REBUILD_FAISS" = false ]; then
    echo "♻️  Перезапускаем сервисы..."
    docker-compose restart
fi

# Проверяем статус
echo ""
echo "📊 Статус сервисов:"
docker-compose ps

echo ""
echo "✅ Деплой завершён успешно!"
echo "🌐 Сайт доступен: https://law-tech.online"
