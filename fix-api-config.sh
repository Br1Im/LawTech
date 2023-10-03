#!/bin/bash

# Скрипт для проверки и исправления проблем с API

echo "Проверка статуса контейнеров..."
docker-compose ps

echo "1. Проверка доступности server из frontend..."
docker-compose exec frontend ping -c 3 server
echo "Результат ping: $?"

echo "2. Проверка API напрямую..."
docker-compose exec server curl http://localhost:5000/api/health
echo "Результат проверки API: $?"

echo "3. Проверка API через nginx..."
docker-compose exec frontend curl http://server:5000/api/health
echo "Результат проверки API через nginx: $?"

echo "4. Перезапуск контейнеров (если требуется)..."
read -p "Перезапустить контейнеры? (y/n): " answer
if [ "$answer" == "y" ]; then
  echo "Остановка контейнеров..."
  docker-compose down
  
  echo "Очистка volumes nginx (если требуется)..."
  read -p "Очистить nginx volumes? (y/n): " clean_volumes
  if [ "$clean_volumes" == "y" ]; then
    docker volume rm $(docker volume ls -q | grep lawtech)
  fi
  
  echo "Пересборка и запуск контейнеров..."
  docker-compose up -d --build
  
  echo "Проверка статуса контейнеров после перезапуска..."
  docker-compose ps
else
  echo "Перезапуск отменен."
fi

echo "5. Отображение логов..."
read -p "Показать логи контейнеров? (y/n): " show_logs
if [ "$show_logs" == "y" ]; then
  echo "Логи frontend:"
  docker-compose logs --tail=30 frontend
  
  echo "Логи server:"
  docker-compose logs --tail=30 server
fi

echo "Готово!" 