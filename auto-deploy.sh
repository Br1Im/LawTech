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

# Останавливаем все контейнеры проекта
echo "🛑 Останавливаем контейнеры..."
docker-compose down -v --remove-orphans || true

# Останавливаем ВСЕ контейнеры с lawtech в имени
echo "🧹 Останавливаем все контейнеры lawtech..."
docker ps -a --format '{{.Names}}' | grep -i lawtech | xargs -r docker stop || true
docker ps -a --format '{{.Names}}' | grep -i lawtech | xargs -r docker rm -f || true

# Удаляем контейнеры по ID (включая c4f307ee96ef)
docker ps -a --format '{{.ID}} {{.Names}}' | grep -i lawtech | awk '{print $1}' | xargs -r docker rm -f || true

# Удаляем все образы lawtech
echo "🗑️  Удаляем образы lawtech..."
docker images --format '{{.Repository}}:{{.Tag}} {{.ID}}' | grep -i lawtech | awk '{print $2}' | xargs -r docker rmi -f || true

# Удаляем dangling образы
docker images -f "dangling=true" -q | xargs -r docker rmi -f || true

# Очищаем volumes
echo "🧼 Очищаем volumes..."
docker volume ls -q | grep -i lawtech | xargs -r docker volume rm -f || true

# Полная очистка системы
docker system prune -af --volumes || true

# Пересобираем все сервисы
echo "🔨 Пересобираем все сервисы..."
docker-compose build --no-cache --pull

# Запускаем контейнеры
echo "🚀 Запускаем контейнеры..."
docker-compose up -d

# Ждём запуска
echo "⏳ Ждём запуска сервисов..."
sleep 25

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
