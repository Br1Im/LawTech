# Локальный запуск Frontend с Hot Reload ✅

## Что запущено:

### В Docker:
- ✅ Backend: `http://localhost:3001`
- ✅ База данных MySQL: `localhost:3307`
- ✅ FAISS Service: `http://localhost:5000`

### Локально:
- ✅ Frontend (Vite): `http://localhost:5173/`

## Преимущества:

1. **Hot Reload** - изменения CSS применяются мгновенно!
2. **Быстрая разработка** - не нужно перезапускать Docker
3. **Мгновенное обновление** - просто сохраните файл
4. **Удобная отладка** - все логи в консоли

## Как работать:

### 1. Откройте сайт:
```
http://localhost:5173/
```

### 2. Редактируйте CSS:
- Откройте `frontend/src/components/AITools/ChatInterface.css`
- Внесите изменения
- Сохраните файл (Ctrl+S)
- **Изменения применятся автоматически!** 🚀

### 3. Проверяйте в браузере:
- Страница обновится автоматически
- Не нужно очищать кэш
- Не нужно перезагружать страницу вручную

## Текущие процессы:

### Process ID 4: Docker Compose
```bash
docker-compose up -d backend db faiss-service
```

### Process ID 5: Frontend Dev Server
```bash
npm run dev
```
Запущен в папке `frontend/`

## Как остановить:

### Остановить Frontend:
```bash
# В терминале где запущен npm run dev
Ctrl + C
```

### Остановить Docker:
```bash
docker-compose down
```

## Порты:

- Frontend: `5173` (Vite dev server)
- Backend: `3001`
- MySQL: `3307`
- FAISS: `5000`

## Теперь можно:

1. ✅ Редактировать CSS файлы
2. ✅ Видеть изменения мгновенно
3. ✅ Не перезапускать Docker
4. ✅ Быстро итерировать дизайн

## Проверьте изменения:

1. Откройте `http://localhost:5173/`
2. Перейдите в "AI инструменты"
3. Переключите на тёмную тему
4. Проверьте:
   - ✅ Нет солнца на фоне
   - ✅ Золотая рамка вокруг чата
   - ✅ Правильная высота (не выходит за экран)

## Если нужно вернуться к Docker:

1. Остановите локальный frontend (Ctrl+C)
2. Запустите все в Docker:
```bash
docker-compose up -d
```

## Логи:

### Посмотреть логи frontend:
Они выводятся прямо в терминале где запущен `npm run dev`

### Посмотреть логи backend:
```bash
docker-compose logs -f backend
```
