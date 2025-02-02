#!/bin/bash

# Переменные окружения с расширенными настройками
export VITE_API_URL=/api
export NODE_ENV=production
export SERVER_PORT=5000
export FRONTEND_PORT=80

echo "Остановка контейнеров..."
docker-compose down

echo "Сборка и запуск контейнеров..."
docker-compose up -d --build

# Для обновления только фронтенда
# docker-compose up -d --build frontend

# Для обновления только бэкенда
# docker-compose up -d --build server

echo "Проверка статуса контейнеров..."
docker-compose ps

echo "Готово! Приложение доступно на http://law-tech.online" 