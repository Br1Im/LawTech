#!/bin/bash

# 🚀 Быстрое исправление SSL - выполните на сервере

set -e

echo "🔧 Быстрое исправление HTTPS для law-tech.online"
echo ""

# Проверка root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Запустите от root: sudo bash fix-ssl-now.sh"
    exit 1
fi

# 1. Установка необходимых пакетов
echo "📦 Установка Nginx и Certbot..."
apt-get update -qq
apt-get install -y nginx certbot python3-certbot-nginx

# 2. Остановка Nginx для получения сертификата
echo "🛑 Остановка Nginx..."
systemctl stop nginx

# 3. Получение SSL сертификата
echo "🔐 Получение SSL сертификата..."
mkdir -p /var/www/certbot

# Проверяем есть ли уже сертификат
if [ -f "/etc/letsencrypt/live/law-tech.online/fullchain.pem" ]; then
    echo "✅ SSL сертификат уже существует"
else
    echo "📝 Введите ваш email для уведомлений Let's Encrypt:"
    read -p "Email: " USER_EMAIL
    
    certbot certonly --standalone \
        -d law-tech.online \
        -d www.law-tech.online \
        --email "$USER_EMAIL" \
        --agree-tos \
        --non-interactive
fi

# 4. Создание конфигурации Nginx
echo "📝 Создание конфигурации Nginx..."
cat > /etc/nginx/sites-available/lawtech << 'NGINX_EOF'
# HTTP -> HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name law-tech.online www.law-tech.online;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name law-tech.online www.law-tech.online;

    # SSL certificates
    ssl_certificate /etc/letsencrypt/live/law-tech.online/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/law-tech.online/privkey.pem;

    # SSL settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Logs
    access_log /var/log/nginx/lawtech-access.log;
    error_log /var/log/nginx/lawtech-error.log;

    # Max upload size
    client_max_body_size 10M;

    # Frontend (Docker container on port 8080)
    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API (Docker container on port 3001)
    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # CORS headers
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type' always;
        
        if ($request_method = 'OPTIONS') {
            return 204;
        }
    }
}
NGINX_EOF

# 5. Активация конфигурации
echo "🔗 Активация конфигурации..."
ln -sf /etc/nginx/sites-available/lawtech /etc/nginx/sites-enabled/lawtech
rm -f /etc/nginx/sites-enabled/default

# 6. Проверка конфигурации
echo "✅ Проверка конфигурации Nginx..."
nginx -t

# 7. Запуск Nginx
echo "🚀 Запуск Nginx..."
systemctl start nginx
systemctl enable nginx

# 8. Настройка автообновления сертификата
echo "🔄 Настройка автообновления сертификата..."
(crontab -l 2>/dev/null | grep -v "certbot renew"; echo "0 0,12 * * * certbot renew --quiet --post-hook 'systemctl reload nginx'") | crontab -

# 9. Проверка статуса
echo ""
echo "✅ Настройка завершена!"
echo ""
echo "📊 Статус сервисов:"
systemctl status nginx --no-pager | head -5
echo ""
echo "🔍 Проверка портов:"
netstat -tulpn | grep -E ":80|:443"
echo ""
echo "🌐 Проверьте сайт:"
echo "   HTTP:  http://law-tech.online (должен редиректить на HTTPS)"
echo "   HTTPS: https://law-tech.online (должен работать)"
echo ""
echo "📋 Полезные команды:"
echo "   Логи Nginx: tail -f /var/log/nginx/lawtech-error.log"
echo "   Статус: systemctl status nginx"
echo "   Перезапуск: systemctl restart nginx"
