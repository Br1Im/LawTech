# Load tests

Лёгкий нагрузочный смок на бэк LawTech на базе [autocannon](https://github.com/mcollina/autocannon).
Не полный perf-бенчмарк — задача: за ~15 секунд понять, что критичные ручки не упёрлись в регрессию (p95 не разнесло, ошибок нет).

## Что тестируется

Три сценария, последовательно:

| Сценарий | Что покрывает | Reasonable baseline |
|---|---|---|
| `GET /api/health` | роутинг, app-warmup, нет middleware/DB | 1000+ rps, p95 < 50 ms |
| `GET /api/clients` | auth (JWT) + X-Office-Id + DB read (25 строк) | 500+ rps, p95 < 100 ms |
| `POST /api/auth/login` | bcrypt verify (rounds=10) + JWT sign | 10-30 rps, p95 < 1500 ms |

## Пороги (fail условия)

| Метрика | Default | Override env |
|---|---|---|
| p95 latency (health/clients) | < 500 ms | `LOAD_P95_LATENCY` |
| p95 latency (login) | < 1500 ms | (хард-кодед — bcrypt медленный) |
| error rate (non-2xx + errors + timeouts) | < 1 % | `LOAD_MAX_ERR_RATIO` |

Если хотя бы один сценарий упёрся в порог — `npm run test:load` возвращает exit code 1.

## Локальный запуск

```bash
cd server
DB_HOST=127.0.0.1 DB_PORT=33307 \
DB_USER=root DB_PASSWORD=testpass \
DB_NAME=lawtech_test JWT_SECRET=test_secret \
npm run test:load
```

## Tuning

```bash
LOAD_DURATION=15 LOAD_CONNECTIONS=20 LOAD_PIPELINING=4 \
  npm run test:load
```

| Env var | Default | Что делает |
|---|---|---|
| `LOAD_DURATION` | 5 сек | длительность каждого сценария |
| `LOAD_CONNECTIONS` | 10 | конкурентные соединения |
| `LOAD_PIPELINING` | 1 | HTTP pipelining factor |
| `LOAD_P95_LATENCY` | 500 (ms) | порог p95 для health/clients |
| `LOAD_MAX_ERR_RATIO` | 0.01 (1%) | порог error rate |
| `LOAD_PROGRESS` | (off) | показывать live progress autocannon |
| `LOAD_VERBOSE` | (off) | не глушить внутренние console.log сервера |

## Safety

Скрипт перед запуском дёргает `assertNotProtected(DB_NAME)` — если кто-то случайно укажет `lawtech_crm` (продовое имя), произойдёт hard-fail до того, как поднимется test-server. Truncate бьёт только по `lawtech_test`.

## CI

Запускается отдельным non-blocking job в `.github/workflows/test.yml` (`Backend Load (autocannon)`). На медленных CI-машинах пороги дополнительно поднимаются через env. Если падает — это сигнал, что регрессия в производительности, но не блок мержа.
