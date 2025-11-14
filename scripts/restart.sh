#!/bin/bash
# Скрипт для перезапуска контейнеров

echo "🔄 Перезапуск контейнеров..."
docker-compose down
docker-compose up -d --build
echo "✅ Контейнеры перезапущены"
