# Тестирование

В репозитории три независимых тест-стека:

- **backend** (Jest + Supertest + MySQL) — интеграция с реальной БД;
- **frontend unit** (Vitest + RTL) — логика компонентов и хелперов;
- **E2E** (Playwright) — браузерные тесты против собранного фронтенда + живого бэка.

Все три гоняются в `.github/workflows/test.yml` на каждый PR и push в `main`.

## Backend

### Что покрыто

- `__tests__/auth.test.js` — `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`. Проверяется: хеширование пароля в БД, JWT, обработка дубликатов, валидация полей, поведение токенов.
- `__tests__/clients.test.js` — CRUD `/api/clients`. Проверяется: запись в таблицу `clients`, изоляция по `office_id` (юрист офиса A не видит клиентов офиса B), валидация имени.
- `__tests__/crm-modules.test.js` — `POST /api/cases`, `POST /api/expenses`, `POST /api/employees`. Каждая запись валидируется чтением из таблицы напрямую (`SELECT * FROM ... WHERE id = ?`).
- `__tests__/salary.test.js` — `GET/PUT /api/offices/:id/salary-settings` (auto-create defaults + update), `POST/GET/DELETE /api/shifts` (CRUD + unique constraint).
- `__tests__/acts.test.js` — `POST /api/contracts/:id/acts` (создание акта с валидацией суммы + persist в БД), `GET /api/acts` (изоляция по офису).
- `__tests__/chat.test.js` — `GET /api/chat/channels` (видимость по роли), `POST/GET /api/offices/:officeId/messages` (отправка → persist → возврат).
- `__tests__/dashboard.test.js` — `GET /api/office/:officeId/dashboard` (структура fact/plan/lawyers_cash, 403 чужой офис), `PUT/GET /api/office/:officeId/plan`.
- `__tests__/uploads.test.js` — `POST /api/upload` (text → extract, unsupported ext → 400, no auth → 401), chat-attachments (`/api/offices/:officeId/messages` multipart с file_url/file_type persisted), `POST /api/contracts/:id/documents` (docx → materials row + физический файл на диске + `contracts.docs_status='ready'`, .txt → 4xx, DELETE удаляет файл).

Итого: 73 интеграционных теста, все ходят в реальный MySQL.

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

## E2E (Playwright)

### Что покрыто

- `frontend/e2e/landing.spec.ts` — главный экран рендерится, кнопка «Войти» ведёт на `/auth`.
- `frontend/e2e/theme-toggle.spec.ts` — переключение темы на `/`, персистентность через reload, тогл на `/auth`.
- `frontend/e2e/auth-flow.spec.ts` — регистрация через API → логин через UI (верификация 200 + токен в localStorage); логин с неверными кредами (401).
- `frontend/e2e/crm-flow.spec.ts` — director с офисом доходит до `/crm` с правильным сайдбаром; `?tab=Клиенты` активирует таб; `POST /api/clients` round-trip persistence через `GET /api/clients`; lawyer без офиса видит lawyer-сайдбар.

### Как это работает

`playwright.config.ts` автоматически поднимает два веб-сервера:
1. Бэкенд (`node server.js`) с `NODE_ENV=e2e` на `:3001`, с переключённой на `lawtech_test` БД.
2. Фронтенд (`npm run build && vite preview`) на `:5173`.

Перед тестами `e2e/global-setup.ts` вызывает `server/__tests__/setup/setup-db-cli.js` — это тот же реиниты, что и в Jest, поднимает `lawtech_test` из `schema.sql`.

### Запуск

```bash
cd frontend
npx playwright install --with-deps chromium  # один раз
npm run test:e2e        # прогон
npm run test:e2e:ui     # UI режим
```

## Load (autocannon)

Лёгкий нагрузочный смок на критичные ручки бэка. Цель — не полный perf-бенчмарк, а ловить регрессии в p95-латентности и error rate.

- `server/__tests__/load/run.js` — поднимает Express in-process против `lawtech_test`, прогоняет 3 сценария:
  - `GET /api/health` (роутинг, без middleware/DB) — ожидаемо 1000+ rps, p95 < 50 ms.
  - `GET /api/clients` (JWT + X-Office-Id + DB read с 25 записями) — ожидаемо 500+ rps, p95 < 100 ms.
  - `POST /api/auth/login` (bcrypt verify, медленнее) — ожидаемо 10-30 rps, p95 < 1500 ms.

Запуск:

```bash
cd server
DB_HOST=127.0.0.1 DB_PORT=33307 DB_USER=root DB_PASSWORD=testpass \
  DB_NAME=lawtech_test JWT_SECRET=test_secret \
  npm run test:load
```

Детальный README + переменные тюнинга: `server/__tests__/load/README.md`.

## CI

`.github/workflows/test.yml` поднимает MySQL 8 как service container и гоняет четыре job’а:

1. `backend` — `server/npm test` (Jest + MySQL).
2. `frontend` — `frontend/npm test` (Vitest).
3. `e2e` — `frontend/npm run test:e2e` (Playwright против живого стека). При падении загружает trace.zip в artifacts на 7 дней.
4. `load` — `server/npm run test:load` (autocannon, **non-blocking**: `continue-on-error: true`, чтобы не блокировать merge при шумных CI-runner'ах).

Каждый job самостоятельный, можно смотреть логи независимо.
