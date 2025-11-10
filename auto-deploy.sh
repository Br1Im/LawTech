#!/bin/bash

# 🚀 Скрипт автоматического деплоя для LawTech
# Запускается на сервере после git pull

set -e

echo "🔄 Начинаем автоматический деплой..."

# Переходим в директорию проекта
cd ~/LawTech

# Подтягиваем изменения
echo "📥 Подтягиваем изменения из Git..."
git fetch origin
git reset --hard origin/main

# Проверяем какие файлы изменились
CHANGED_FILES=$(git diff --name-only HEAD@{1} HEAD 2>/dev/null || echo "all")

echo "📝 Изменённые файлы: $CHANGED_FILES"

# Определяем нужно ли пересобирать
NEED_REBUILD=false

if echo "$CHANGED_FILES" | grep -q "server/scripts/\|Dockerfile\|docker-compose.yml\|requirements.txt"; then
    echo "🔨 Обнаружены изменения требующие пересборки"
    NEED_REBUILD=true
fi

# Принудительно останавливаем и удаляем все контейнеры проекта
echo "🛑 Останавливаем все контейнеры..."
docker-compose down --remove-orphans || true

# Удаляем зависшие контейнеры если есть
echo "🧹 Очищаем зависшие контейнеры..."
docker ps -a | grep lawtech | awk '{print $1}' | xargs -r docker rm -f || true

if [ "$NEED_REBUILD" = true ]; then
    echo "🔨 Пересобираем сервисы..."
    docker-compose build --no-cache
fi

# Запускаем контейнеры
echo "🚀 Запускаем контейнеры..."
docker-compose up -d

# Ждём запуска
echo "⏳ Ждём запуска сервисов..."
sleep 15

# Проверяем статус
echo ""
echo "📊 Статус сервисов:"
docker-compose ps

echo ""
echo "📋 Логи (последние 30 строк):"
docker-compose logs --tail=30

echo ""
echo "✅ Деплой завершён!"
echo "🌐 Сайт: https://law-tech.online"
