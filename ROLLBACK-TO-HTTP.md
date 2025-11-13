# Откат к HTTP (временное решение)

## Проблема
HTTPS настройка вызвала конфликты портов и сайт перестал работать.

## Решение - откат к HTTP

На сервере выполните:

```bash
# 1. Остановите Nginx на хосте (если установлен)
systemctl stop nginx
systemctl disable nginx

# 2. Перейдите в директорию проекта
cd ~/LawTech

# 3. Подтяните изменения
git pull

# 4. Перезапустите Docker контейнеры
docker-compose down
docker-compose up -d

# 5. Проверьте статус
docker-compose ps
```

## Проверка

Сайт должен работать на:
- http://law-tech.online

## Для настройки HTTPS позже

Когда будете готовы настроить HTTPS правильно:

1. Убедитесь что Nginx НЕ установлен на хосте или остановлен
2. Используйте Cloudflare или другой CDN с SSL
3. Или настройте reverse proxy отдельно от Docker

## Альтернатива - Cloudflare SSL

Самый простой способ получить HTTPS:

1. Зарегистрируйтесь на cloudflare.com
2. Добавьте домен law-tech.online
3. Измените NS записи у регистратора на Cloudflare NS
4. В Cloudflare включите SSL (Flexible или Full)
5. Готово! HTTPS будет работать автоматически

Преимущества Cloudflare:
- Бесплатный SSL сертификат
- CDN для ускорения сайта
- DDoS защита
- Не нужно настраивать ничего на сервере
