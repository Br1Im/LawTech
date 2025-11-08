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

# Останавливаем все контейнеры
echo "🛑 Останавливаем контейнеры..."
docker-compose down -v || true

# Удаляем все старые контейнеры принудительно
echo "🧹 Удаляем старые контейнеры..."
docker ps -a | grep lawtech | awk '{print $1}' | xargs -r docker rm -f || true

# Удаляем старые образы
echo "🗑️  Удаляем старые образы..."
docker images | grep lawtech | awk '{print $3}' | xargs -r docker rmi -f || true

# Очищаем систему
echo "🧼 Очищаем Docker систему..."
docker system prune -af --volumes || true

# Пересобираем все сервисы
echo "🔨 Пересобираем все сервисы..."
docker-compose build --no-cache --pull

# Запускаем контейнеры
echo "🚀 Запускаем контейнеры..."
docker-compose up -d

# Ждём запуска
echo "⏳ Ждём запуска сервисов..."
sleep 20

# Проверяем статус
echo ""
echo "📊 Статус сервисов:"
docker-compose ps

echo ""
echo "📋 Последние логи:"
docker-compose logs --tail=50

echo ""
echo "✅ Деплой завершён успешно!"
echo "🌐 Сайт доступен: https://law-tech.online"
