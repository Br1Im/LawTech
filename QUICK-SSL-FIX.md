# Быстрое исправление HTTPS

## Проблема
HTTPS не работает, сайт доступен только по HTTP.

## Решение (выполните на сервере)

### Шаг 1: Подключитесь к серверу
```bash
ssh root@your-server-ip
cd ~/LawTech
git pull
```

### Шаг 2: Установите Nginx и Certbot
```bash
apt-get update
apt-get install -y nginx certbot python3-certbot-nginx
```

### Шаг 3: Создайте временную конфигурацию Nginx
```bash
cat > /etc/nginx/sites-available/lawtech << 'EOF'
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
```

### Шаг 4: Активируйте конфигурацию
```bash
mkdir -p /var/www/certbot
ln -sf /etc/nginx/sites-available/lawtech /etc/nginx/sites-enabled/lawtech
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx
```

### Шаг 5: Получите SSL сертификат
**ВАЖНО: Замените your-email@example.com на ваш реальный email!**

```bash
certbot certonly --webroot \
    -w /var/www/certbot \
    -d law-tech.online \
    -d www.law-tech.online \
    --email your-email@example.com \
    --agree-tos \
    --non-interactive
```

### Шаг 6: Обновите конфигурацию Nginx с HTTPS
```bash
cat > /etc/nginx/sites-available/lawtech << 'EOF'
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

    ssl_certificate /etc/letsencrypt/live/law-tech.online/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/law-tech.online/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    client_max_body_size 10M;

    location / {
        proxy_pass http://localhost:80;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF
```

### Шаг 7: Перезапустите Nginx
```bash
nginx -t
systemctl restart nginx
```

### Шаг 8: Настройте автообновление сертификата
```bash
(crontab -l 2>/dev/null; echo "0 0,12 * * * certbot renew --quiet --post-hook 'systemctl reload nginx'") | crontab -
```

## Проверка

После выполнения всех шагов:

1. Откройте http://law-tech.online - должен редиректить на https://
2. Откройте https://law-tech.online - должен работать с зеленым замочком

## Если что-то пошло не так

### Проверьте статус Nginx
```bash
systemctl status nginx
journalctl -u nginx -n 50
```

### Проверьте сертификат
```bash
certbot certificates
ls -la /etc/letsencrypt/live/law-tech.online/
```

### Проверьте логи
```bash
tail -f /var/log/nginx/error.log
tail -f /var/log/letsencrypt/letsencrypt.log
```

### Проверьте порты
```bash
netstat -tulpn | grep :80
netstat -tulpn | grep :443
```

## Альтернативный способ (если первый не сработал)

Если у вас уже есть Nginx на сервере и он конфликтует:

```bash
# Остановите Nginx
systemctl stop nginx

# Получите сертификат в standalone режиме
certbot certonly --standalone \
    -d law-tech.online \
    -d www.law-tech.online \
    --email your-email@example.com \
    --agree-tos \
    --non-interactive

# Запустите Nginx обратно
systemctl start nginx
```
