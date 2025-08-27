# Быстрое исправление проблемы с корневым путем

## Проблема
По адресу `https://lawtech-p225.onrender.com/` отображается JSON ответ API вместо фронтенда.

## Причина
В `server/server.js` маршрут `app.get('/', ...)` перехватывает корневой путь.

## Решение
✅ **Уже исправлено в коде!**

Маршруты health check перенесены:
- `app.get('/', ...)` → `app.get('/api/status', ...)`
- `app.get('/health', ...)` → `app.get('/api/health', ...)`

## Следующие шаги

1. **Зафиксируйте изменения**:
   ```bash
   git add .
   git commit -m "Fix: Remove root route conflict, move health checks to /api/*"
   git push origin main
   ```

2. **Обновите на Render**:
   - Зайдите в Render Dashboard
   - Найдите сервис `lawtech-p225`
   - Нажмите "Manual Deploy" → "Deploy latest commit"

3. **Проверьте результат**:
   - ✅ `https://lawtech-p225.onrender.com/` - фронтенд
   - ✅ `https://lawtech-p225.onrender.com/api/health` - API health
   - ✅ `https://lawtech-p225.onrender.com/api/status` - API status
   - ✅ `https://lawtech-p225.onrender.com/crm` - CRM страница

## Время исправления
⏱️ ~5-10 минут после развертывания на Render