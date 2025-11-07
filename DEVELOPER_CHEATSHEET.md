# 🔧 Шпаргалка разработчика

## 🚀 Быстрые команды

### Запуск проекта
```bash
# Backend
cd server
npm start

# Frontend
cd frontend
npm run dev
```

### Остановка серверов
```bash
# Ctrl+C в терминале
```

---

## 📱 Адаптивные утилиты

### Контейнеры
```tsx
<div className="container-responsive">
  {/* Автоматические отступы */}
</div>
```

### Сетки
```tsx
<div className="grid-responsive grid-responsive-3">
  {/* 3 колонки → 2 → 1 */}
</div>
```

### Скрытие/Показ
```tsx
<div className="hide-mobile">Desktop only</div>
<div className="show-mobile">Mobile only</div>
```

### Flex
```tsx
<div className="flex-responsive flex-responsive-column-mobile">
  {/* Горизонтально → Вертикально */}
</div>
```

---

## 🔐 Авторизация

### Защита маршрута
```tsx
import ProtectedRoute from './components/ProtectedRoute';

<Route path="/new-page" element={
  <ProtectedRoute>
    <NewPage />
  </ProtectedRoute>
} />
```

### Проверка авторизации
```tsx
import { isAuthenticated, isTokenValid } from './shared/utils/authUtils';

if (!isAuthenticated()) {
  // Не авторизован
}

if (!isTokenValid()) {
  // Токен истек
}
```

### Выход из системы
```tsx
import { logout } from './shared/utils/authUtils';

const handleLogout = () => {
  logout(); // Автоматический редирект на /auth
};
```

### Получение данных пользователя
```tsx
import { getUserFromToken } from './shared/utils/authUtils';

const user = getUserFromToken();
console.log(user.name, user.email);
```

---

## 🎨 Breakpoints

```css
/* Small Mobile */
@media (max-width: 480px) { }

/* Mobile */
@media (max-width: 768px) { }

/* Tablet */
@media (max-width: 1024px) { }

/* Laptop */
@media (max-width: 1440px) { }
```

---

## 📦 Структура проекта

```
frontend/
├── src/
│   ├── components/
│   │   └── ProtectedRoute.tsx    # Защита маршрутов
│   ├── pages/
│   │   ├── CRM.tsx                # Главная страница
│   │   └── AuthPage.tsx           # Авторизация
│   ├── shared/
│   │   └── utils/
│   │       └── authUtils.ts       # Утилиты авторизации
│   ├── index.css                  # Глобальные стили
│   ├── responsive.css             # Адаптивные утилиты
│   └── main.tsx                   # Точка входа
```

---

## 🧪 Тестирование

### Адаптивность
```bash
# 1. Откройте http://localhost:5173
# 2. F12 → Ctrl+Shift+M
# 3. Выберите устройство
```

### Авторизация
```bash
# Тест 1: Без авторизации
# http://localhost:5173/crm → Редирект на /auth

# Тест 2: С авторизацией
# Войдите → http://localhost:5173/crm → Доступ разрешен

# Тест 3: Повторный вход
# Уже авторизован → http://localhost:5173/auth → Редирект на /crm
```

---

## 🔧 Полезные команды

### Git
```bash
git status
git add .
git commit -m "feat: добавлена адаптивность и защита авторизации"
git push
```

### npm
```bash
npm install          # Установка зависимостей
npm run dev          # Запуск в режиме разработки
npm run build        # Сборка для продакшена
npm run preview      # Предпросмотр сборки
```

---

## 📚 Документация

### Адаптивность
- `RESPONSIVE_GUIDE.md` - Полное руководство
- `RESPONSIVE_EXAMPLES.md` - Примеры
- `frontend/src/responsive.css` - Утилиты

### Авторизация
- `AUTH_PROTECTION_GUIDE.md` - Полное руководство
- `frontend/src/shared/utils/authUtils.ts` - Утилиты

### Общее
- `START_HERE.md` - Быстрый старт
- `SESSION_SUMMARY.md` - Полное резюме

---

## 🐛 Отладка

### Проблемы с авторизацией
```tsx
// Проверьте токен в localStorage
console.log(localStorage.getItem('token'));

// Проверьте валидность токена
import { isTokenValid } from './shared/utils/authUtils';
console.log(isTokenValid());

// Очистите localStorage
localStorage.clear();
```

### Проблемы с адаптивностью
```tsx
// Проверьте текущую ширину экрана
console.log(window.innerWidth);

// Добавьте индикатор размера
<div className="debug-responsive"></div>
```

---

## 🎯 Быстрые ссылки

- Frontend: http://localhost:5173
- Backend: http://localhost:3000
- DevTools: F12
- Device Toolbar: Ctrl+Shift+M

---

## 🔑 Тестовые аккаунты

```
admin@lawtech.ru / admin123
director@pravoved.ru / director123
lawyer1@pravoved.ru / lawyer123
```

---

## ✅ Чеклист перед коммитом

- [ ] Код работает без ошибок
- [ ] Адаптивность проверена на всех устройствах
- [ ] Авторизация работает корректно
- [ ] Нет console.log в продакшен коде
- [ ] Документация обновлена
- [ ] Тесты пройдены

---

**Сохраните эту шпаргалку для быстрого доступа!**
