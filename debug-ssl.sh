#!/bin/bash

# Скрипт диагностики SSL проблем

echo "🔍 Диагностика SSL и Nginx..."
echo ""

echo "1️⃣ Проверка портов:"
echo "Port 80:"
netstat -tulpn | grep :80 || echo "❌ Порт 80 не слушается"
echo ""
echo "Port 443:"
netstat -tulpn | grep :443 || echo "❌ Порт 443 не слушается"
echo ""

echo "2️⃣ Статус Nginx:"
systemctl status nginx --no-pager || echo "❌ Nginx не установлен"
echo ""

echo "3️⃣ Проверка конфигурации Nginx:"
nginx -t 2>&1 || echo "❌ Ошибка в конфигурации"
echo ""

echo "4️⃣ Активные сайты Nginx:"
ls -la /etc/nginx/sites-enabled/
echo ""

echo "5️⃣ Проверка SSL сертификатов:"
if [ -d "/etc/letsencrypt/live/law-tech.online" ]; then
    echo "✅ Директория сертификатов существует"
    ls -la /etc/letsencrypt/live/law-tech.online/
else
    echo "❌ Сертификаты не найдены"
fi
echo ""

echo "6️⃣ Проверка Docker контейнеров:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""

echo "7️⃣ Тест HTTP запроса:"
curl -I http://localhost:80 2>&1 | head -5
echo ""

echo "8️⃣ Тест HTTPS запроса:"
curl -I https://law-tech.online 2>&1 | head -5
echo ""

echo "9️⃣ Логи Nginx (последние 10 строк):"
tail -10 /var/log/nginx/error.log 2>/dev/null || echo "❌ Логи не найдены"
echo ""

echo "🔟 Проверка firewall:"
ufw status 2>/dev/null || iptables -L -n | grep -E "80|443" || echo "Firewall не настроен"
