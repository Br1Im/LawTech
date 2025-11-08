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
docker-compose down || true

# Очищаем старые образы и контейнеры
echo "🧹 Очищаем старые образы..."
docker system prune -f || true

# Удаляем проблемные контейнеры
docker rm -f lawtech-faiss lawtech-frontend lawtech-backend || true

# Пересобираем все сервисы
echo "🔨 Пересобираем все сервисы..."
docker-compose build --no-cache

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
echo "📋 Последние логи:"
docker-compose logs --tail=30

echo ""
echo "✅ Деплой завершён успешно!"
echo "🌐 Сайт доступен: https://law-tech.online"
