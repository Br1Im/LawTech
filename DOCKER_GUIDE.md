# Руководство по запуску проекта с использованием Docker

## Требования

- Docker
- Docker Compose

## Запуск проекта

1. Клонируйте репозиторий:

```bash
git clone https://github.com/Br1Im/LawTech.git
cd LawTech
```

2. Запустите все сервисы с помощью Docker Compose:

```bash
docker-compose up -d
```

Эта команда запустит следующие сервисы:
- Frontend (React) - доступен по адресу http://localhost:80
- Backend (Node.js) - доступен по адресу http://localhost:3001
- FAISS Service (Python) - доступен по адресу http://localhost:5000
- MySQL Database - доступен по адресу localhost:3306

## Остановка проекта

```bash
docker-compose down
```

## Просмотр логов

```bash
# Все сервисы
docker-compose logs

# Конкретный сервис
docker-compose logs frontend
docker-compose logs backend
docker-compose logs faiss-service
docker-compose logs db
```

## Пересборка контейнеров

Если вы внесли изменения в код, вам нужно пересобрать контейнеры:

```bash
docker-compose build
docker-compose up -d
```

## Структура Docker файлов

- `docker-compose.yml` - основной файл для запуска всех сервисов
- `frontend/Dockerfile` - сборка и запуск frontend части
- `server/Dockerfile` - сборка и запуск backend части
- `server/scripts/Dockerfile` - сборка и запуск FAISS сервиса
- `frontend/nginx.conf` - конфигурация Nginx для frontend

## Переменные окружения

Все необходимые переменные окружения уже настроены в `docker-compose.yml`. Если вам нужно изменить какие-то настройки, отредактируйте соответствующие секции в этом файле.

## Работа с базой данных

Данные MySQL сохраняются в Docker volume `mysql-data`. Это означает, что ваши данные сохранятся даже после перезапуска контейнеров.

Для подключения к базе данных используйте следующие параметры:
- Хост: localhost
- Порт: 3306
- Пользователь: root
- Пароль: password
- База данных: lawtech

## Устранение неполадок

### Проблемы с подключением к сервисам

Если у вас возникают проблемы с подключением к сервисам, проверьте, что все контейнеры запущены:

```bash
docker-compose ps
```

### Проблемы с портами

Если порты уже заняты другими приложениями, вы можете изменить маппинг портов в `docker-compose.yml`.