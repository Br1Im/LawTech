#!/bin/bash

# Скрипт восстановления HTTPS

echo "🔒 Восстановление HTTPS..."

cd ~/LawTech

# 1. Подтягиваем изменения
echo "📥 Подтягиваем изменения..."
git pull

# 2. Останавливаем Docker контейнеры
echo "🛑 Останавливаем Docker контейнеры..."
docker-compose down

# 3. Запускаем Nginx на хосте
echo "🚀 Запускаем Nginx..."
systemctl start nginx
systemctl enable nginx

# 4. Проверяем конфигурацию Nginx
echo "✅ Проверяем Nginx..."
nginx -t

# 5. Запускаем Docker контейнеры с новыми портами
echo "🐳 Запускаем Docker контейнеры..."
docker-compose up -d

# 6. Ждем запуска
sleep 10

# 7. Проверяем статус
echo ""
echo "📊 Статус Nginx:"
systemctl status nginx --no-pager | head -5

echo ""
echo "📊 Статус Docker:"
docker-compose ps

echo ""
echo "🔍 Проверка портов:"
netstat -tulpn | grep -E ":80|:443|:8080|:3001"

echo ""
echo "✅ Готово!"
echo "🌐 Проверьте сайт:"
echo "   HTTP:  http://law-tech.online (должен редиректить)"
echo "   HTTPS: https://law-tech.online"
