#!/bin/bash

# 🔒 Скрипт установки SSL сертификата для LawTech
# Запускается на сервере один раз для настройки HTTPS

set -e

echo "🔒 Настройка SSL для law-tech.online..."

# Проверяем что скрипт запущен от root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Пожалуйста, запустите скрипт от root (sudo)"
    exit 1
fi

# Устанавливаем Certbot если его нет
if ! command -v certbot &> /dev/null; then
    echo "📦 Устанавливаем Certbot..."
    apt-get update
    apt-get install -y certbot python3-certbot-nginx
fi

# Проверяем что Nginx установлен
if ! command -v nginx &> /dev/null; then
    echo "📦 Устанавливаем Nginx..."
    apt-get update
    apt-get install -y nginx
fi

# Создаем директорию для ACME challenge
mkdir -p /var/www/certbot

# Копируем конфигурацию Nginx
echo "📝 Копируем конфигурацию Nginx..."
cp nginx-host.conf /etc/nginx/sites-available/lawtech

# Создаем временную конфигурацию для получения сертификата
cat > /etc/nginx/sites-available/lawtech-temp << 'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name law-tech.online www.law-tech.online;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# Активируем временную конфигурацию
ln -sf /etc/nginx/sites-available/lawtech-temp /etc/nginx/sites-enabled/lawtech
rm -f /etc/nginx/sites-enabled/default

# Проверяем конфигурацию
echo "🔍 Проверяем конфигурацию Nginx..."
nginx -t

# Перезагружаем Nginx
echo "🔄 Перезагружаем Nginx..."
systemctl reload nginx

# Получаем SSL сертификат
echo "🔐 Получаем SSL сертификат от Let's Encrypt..."
certbot certonly --webroot \
    -w /var/www/certbot \
    -d law-tech.online \
    -d www.law-tech.online \
    --email your-email@example.com \
    --agree-tos \
    --no-eff-email \
    --non-interactive

# Проверяем что сертификат получен
if [ ! -f /etc/letsencrypt/live/law-tech.online/fullchain.pem ]; then
    echo "❌ Не удалось получить SSL сертификат"
    exit 1
fi

# Активируем основную конфигурацию с HTTPS
echo "✅ Активируем конфигурацию с HTTPS..."
ln -sf /etc/nginx/sites-available/lawtech /etc/nginx/sites-enabled/lawtech
rm -f /etc/nginx/sites-enabled/lawtech-temp

# Проверяем конфигурацию
nginx -t

# Перезагружаем Nginx
systemctl reload nginx

# Настраиваем автообновление сертификата
echo "🔄 Настраиваем автообновление сертификата..."
(crontab -l 2>/dev/null; echo "0 0,12 * * * certbot renew --quiet --post-hook 'systemctl reload nginx'") | crontab -

echo ""
echo "✅ SSL успешно настроен!"
echo "🌐 Сайт доступен по адресу: https://law-tech.online"
echo ""
echo "📋 Полезные команды:"
echo "  - Проверить статус сертификата: certbot certificates"
echo "  - Обновить сертификат вручную: certbot renew"
echo "  - Проверить конфигурацию Nginx: nginx -t"
echo "  - Перезагрузить Nginx: systemctl reload nginx"
