# Тестирование

В репозитории два независимых тест-стека: backend (Jest + Supertest + MySQL) и frontend (Vitest + RTL). На GitHub оба гоняются автоматически в `.github/workflows/test.yml` на каждый PR и push в `main`.

## Backend

### Что покрыто

- `__tests__/auth.test.js` — `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`. Проверяется: хеширование пароля в БД, JWT, обработка дубликатов, валидация полей, поведение токенов.
- `__tests__/clients.test.js` — CRUD `/api/clients`. Проверяется: запись в таблицу `clients`, изоляция по `office_id` (юрист офиса A не видит клиентов офиса B), валидация имени.
- `__tests__/crm-modules.test.js` — `POST /api/cases`, `POST /api/expenses`, `POST /api/employees`. Каждая запись валидируется чтением из таблицы напрямую (`SELECT * FROM ... WHERE id = ?`).

Итого: 23 интеграционных теста, все ходят в реальный MySQL.

### Запуск локально

Подними MySQL 8 на 33307:

```bash
docker run -d --name mysql-test \
  -e MYSQL_ROOT_PASSWORD=testpass \
  -e MYSQL_DATABASE=lawtech_test \
  -p 33307:3306 \
  mysql:8.0
```

Подожди ~5 секунд, потом из `server/`:

```bash
npm install
npm test
```

Перед каждым тестом таблицы очищаются (`TRUNCATE`), перед всем прогоном `lawtech_test` пересоздаётся с нуля по фикстуре `server/__tests__/fixtures/schema.sql`.

### Запуск на сервере 138.124.14.157

Можно гонять прямо на проде — тесты ходят в отдельную схему `lawtech_test`, а helper жёстко отказывается работать с продовскими именами (`lawtech_crm`, `lawtech`).

```bash
ssh root@138.124.14.157
cd /opt/LawTech/server
npm install
DB_HOST=127.0.0.1 DB_PORT=3307 DB_PASSWORD=lawtech_root_password_2024 npm test
```

### Безопасность данных

`server/__tests__/setup/db.js` экспортирует `assertNotProtected(name)` — это первая строка обороны. Любой DROP/TRUNCATE против `lawtech_crm`, `lawtech`, `mysql`, `information_schema` бросает исключение до отправки SQL.

`DB_NAME` для тестов по умолчанию `lawtech_test`. Не меняй на `lawtech_crm`.

### Обновление схемы

Если в продовой БД появились новые таблицы или колонки, перегенерируй фикстуру:

```bash
ssh root@138.124.14.157 \
  'docker exec lawtech-db mysqldump \
     -uroot -plawtech_root_password_2024 \
     --no-data --routines --triggers \
     --skip-comments --no-tablespaces --set-gtid-purged=OFF \
     lawtech_crm' \
  > server/__tests__/fixtures/schema.sql
```

Почему фикстура, а не миграции: сырые `server/database/migrations/*.sql` используют MariaDB-синтаксис (`ADD COLUMN IF NOT EXISTS`) и `DELIMITER`-блоки, которые драйвер `mysql2` не парсит. Снапшот живой схемы убирает этот класс проблем и держит тесты в актуальном виде продовой структуры.

## Frontend

### Что покрыто

- `src/components/ui/ThemeToggle.test.tsx` — рендер, `aria-label`, чтение `localStorage`, переключение theme attribute на `<html>`, запись обратно в `localStorage`.

### Запуск

```bash
cd frontend
npm install
npm test          # одиночный прогон
npm run test:watch # watch-режим
```

## CI

`.github/workflows/test.yml` поднимает MySQL 8 как service container и гоняет:

1. `server/npm test` — все backend интеграционные тесты.
2. `frontend/npm test` — Vitest run.

Каждый job самостоятельный, можно смотреть логи независимо.
