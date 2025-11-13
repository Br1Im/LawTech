# Настройка HTTPS для LawTech

## Проблема
Сайт работает на HTTP (http://law-tech.online), но не работает на HTTPS (https://law-tech.online).

## Решение

### Вариант 1: Автоматическая настройка (рекомендуется)

На сервере выполните:

```bash
cd ~/LawTech
chmod +x setup-ssl.sh
sudo ./setup-ssl.sh
```

**Важно:** Перед запуском отредактируйте `setup-ssl.sh` и замените `your-email@example.com` на ваш реальный email.

### Вариант 2: Ручная настройка

#### Шаг 1: Установите Certbot

```bash
sudo apt-get update
sudo apt-get install -y certbot python3-certbot-nginx nginx
```

#### Шаг 2: Получите SSL сертификат

```bash
sudo mkdir -p /var/www/certbot
sudo certbot certonly --webroot \
    -w /var/www/certbot \
    -d law-tech.online \
    -d www.law-tech.online \
    --email your-email@example.com \
    --agree-tos
```

#### Шаг 3: Установите конфигурацию Nginx

```bash
sudo cp nginx-host.conf /etc/nginx/sites-available/lawtech
sudo ln -sf /etc/nginx/sites-available/lawtech /etc/nginx/sites-enabled/lawtech
sudo rm -f /etc/nginx/sites-enabled/default
```

#### Шаг 4: Проверьте и перезагрузите Nginx

```bash
sudo nginx -t
sudo systemctl reload nginx
```

#### Шаг 5: Настройте автообновление сертификата

```bash
sudo crontab -e
```

Добавьте строку:
```
0 0,12 * * * certbot renew --quiet --post-hook 'systemctl reload nginx'
```

## Проверка

После настройки проверьте:

1. **HTTP редирект**: http://law-tech.online должен автоматически перенаправлять на https://
2. **HTTPS работает**: https://law-tech.online должен открываться с зеленым замочком
3. **Сертификат валиден**: Проверьте срок действия сертификата

```bash
sudo certbot certificates
```

## Устранение проблем

### Ошибка "Connection refused"

Проверьте что Nginx запущен:
```bash
sudo systemctl status nginx
sudo systemctl start nginx
```

### Ошибка "Certificate not found"

Проверьте что сертификат получен:
```bash
sudo ls -la /etc/letsencrypt/live/law-tech.online/
```

### Порт 443 занят

Проверьте что занимает порт:
```bash
sudo lsof -i :443
sudo netstat -tulpn | grep :443
```

### Проверка логов

```bash
# Логи Nginx
sudo tail -f /var/log/nginx/lawtech-error.log
sudo tail -f /var/log/nginx/lawtech-access.log

# Логи Certbot
sudo tail -f /var/log/letsencrypt/letsencrypt.log
```

## Архитектура

```
Internet (HTTPS:443)
    ↓
Nginx на хосте (reverse proxy с SSL)
    ↓
Docker контейнер frontend (HTTP:80)
    ↓
Docker контейнер backend (HTTP:3001)
```

## Важные файлы

- `/etc/nginx/sites-available/lawtech` - конфигурация Nginx
- `/etc/letsencrypt/live/law-tech.online/` - SSL сертификаты
- `/var/log/nginx/` - логи Nginx
- `/var/www/certbot/` - директория для ACME challenge

## Обновление сертификата

Сертификаты Let's Encrypt действительны 90 дней. Автообновление настроено через cron, но можно обновить вручную:

```bash
sudo certbot renew
sudo systemctl reload nginx
```
