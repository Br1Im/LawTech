#!/bin/bash
# Скрипт для полной очистки (volumes, images, containers)

echo "🧹 Полная очистка проекта..."
docker-compose down -v
docker system prune -f
echo "✅ Очистка завершена"
