#!/bin/bash

# Скрипт для перезапуска Docker контейнеров с новыми портами

echo "🔄 Перезапуск Docker контейнеров..."

cd ~/LawTech

# Останавливаем контейнеры
echo "🛑 Останавливаем контейнеры..."
docker-compose down

# Проверяем что порт 8080 свободен
echo "🔍 Проверяем порт 8080..."
if lsof -ti:8080 > /dev/null 2>&1; then
    echo "⚠️  Порт 8080 занят, освобождаем..."
    lsof -ti:8080 | xargs kill -9 2>/dev/null || true
    sleep 2
fi

# Запускаем контейнеры
echo "🚀 Запускаем контейнеры..."
docker-compose up -d

# Ждем запуска
echo "⏳ Ждем запуска сервисов..."
sleep 10

# Проверяем статус
echo ""
echo "📊 Статус контейнеров:"
docker-compose ps

echo ""
echo "🔍 Проверка портов:"
netstat -tulpn | grep -E ":8080|:3001|:5000"

echo ""
echo "✅ Готово! Проверьте сайт:"
echo "   HTTP:  http://law-tech.online"
echo "   HTTPS: https://law-tech.online"
