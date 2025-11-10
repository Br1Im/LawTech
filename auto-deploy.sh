#!/bin/bash

# 🚀 Скрипт автоматического деплоя для LawTech
# Запускается на сервере после git pull

set -e

echo "🔄 Начинаем автоматический деплой..."

# Переходим в директорию проекта
cd ~/LawTech

# Подтягиваем изменения с retry логикой
echo "📥 Подтягиваем изменения из Git..."
RETRY_COUNT=0
MAX_RETRIES=3

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if git fetch origin --timeout=30; then
        echo "✅ Git fetch успешен"
        break
    else
        RETRY_COUNT=$((RETRY_COUNT + 1))
        if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
            echo "⚠️  Попытка $RETRY_COUNT не удалась, повторяем через 5 секунд..."
            sleep 5
        else
            echo "❌ Не удалось подключиться к GitHub после $MAX_RETRIES попыток"
            exit 1
        fi
    fi
done

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

# Проверяем что занимает порт 80 и освобождаем его
echo "🔍 Проверяем порт 80..."
PORT_PID=$(lsof -ti:80 || true)
if [ ! -z "$PORT_PID" ]; then
    echo "⚠️  Порт 80 занят процессом $PORT_PID, освобождаем..."
    kill -9 $PORT_PID || true
    sleep 2
fi

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
