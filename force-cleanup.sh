#!/bin/bash

# Скрипт для полной очистки Docker на сервере
# Запускать вручную при проблемах с деплоем

echo "🧹 Полная очистка Docker..."

# Останавливаем все контейнеры
docker stop $(docker ps -aq) 2>/dev/null || true

# Удаляем все контейнеры
docker rm -f $(docker ps -aq) 2>/dev/null || true

# Удаляем все образы
docker rmi -f $(docker images -q) 2>/dev/null || true

# Удаляем все volumes
docker volume rm $(docker volume ls -q) 2>/dev/null || true

# Удаляем все networks (кроме стандартных)
docker network prune -f

# Полная очистка системы
docker system prune -af --volumes

echo "✅ Очистка завершена!"
echo "Теперь запустите: docker-compose up -d --build"
