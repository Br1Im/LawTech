#!/bin/bash

# Скрипт для полной пересборки фронтенда

echo "🧹 Полная очистка и пересборка фронтенда..."

# Останавливаем контейнеры
docker-compose down

# Удаляем образ фронтенда
docker rmi lawtech_frontend:latest 2>/dev/null || true

# Очищаем кеш Docker
docker builder prune -f

# Пересобираем фронтенд с нуля
docker-compose build --no-cache --pull frontend

# Запускаем все контейнеры
docker-compose up -d

echo "✅ Пересборка завершена!"
