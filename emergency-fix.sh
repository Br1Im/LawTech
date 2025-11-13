#!/bin/bash

# ЭКСТРЕННОЕ ВОССТАНОВЛЕНИЕ РАБОТЫ САЙТА

echo "🚨 Экстренное восстановление..."

cd ~/LawTech

# 1. Останавливаем Nginx на хосте
echo "🛑 Останавливаем Nginx на хосте..."
systemctl stop nginx 2>/dev/null || true

# 2. Подтягиваем изменения
echo "📥 Подтягиваем изменения..."
git pull

# 3. Полностью очищаем Docker
echo "🧹 Очищаем Docker..."
docker-compose down
docker ps -a | grep lawtech | awk '{print $1}' | xargs -r docker rm -f 2>/dev/null || true

# 4. Освобождаем порты
echo "🔓 Освобождаем порты..."
lsof -ti:80 | xargs -r kill -9 2>/dev/null || true
lsof -ti:443 | xargs -r kill -9 2>/dev/null || true
lsof -ti:3001 | xargs -r kill -9 2>/dev/null || true
lsof -ti:8080 | xargs -r kill -9 2>/dev/null || true
sleep 3

# 5. Запускаем Docker контейнеры
echo "🚀 Запускаем Docker контейнеры..."
docker-compose up -d

# 6. Ждем запуска
echo "⏳ Ждем запуска..."
sleep 15

# 7. Проверяем статус
echo ""
echo "📊 Статус контейнеров:"
docker-compose ps

echo ""
echo "🔍 Проверка портов:"
netstat -tulpn | grep -E ":80|:3001|:5000"

echo ""
echo "✅ Готово!"
echo "🌐 Сайт должен работать на: http://law-tech.online"
echo ""
echo "📋 Если не работает, проверьте логи:"
echo "   docker-compose logs frontend"
echo "   docker-compose logs backend"
