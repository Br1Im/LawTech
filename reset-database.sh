#!/bin/bash

# Скрипт полного сброса и пересоздания базы данных

echo "🗑️  ПОЛНЫЙ СБРОС БАЗЫ ДАННЫХ"
echo "⚠️  Все данные будут удалены!"
echo ""
read -p "Продолжить? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Отменено"
    exit 0
fi

cd ~/LawTech

echo "🛑 Останавливаем контейнеры..."
docker-compose down

echo "🗑️  Удаляем volume с базой данных..."
docker volume rm lawtech_mysql-data 2>/dev/null || true

echo "📥 Подтягиваем последние изменения..."
git pull

echo "🚀 Запускаем контейнеры заново..."
docker-compose up -d

echo "⏳ Ждем инициализации базы данных (30 секунд)..."
sleep 30

echo ""
echo "📊 Статус контейнеров:"
docker-compose ps

echo ""
echo "📋 Логи backend (последние 20 строк):"
docker-compose logs --tail=20 backend

echo ""
echo "✅ База данных пересоздана!"
echo "🔍 Проверьте что тестовые пользователи созданы без ошибок"
