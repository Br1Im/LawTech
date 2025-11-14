# Руководство по разработке

## Начало работы

### Требования

- Docker и Docker Compose
- Node.js 18+ (для локальной разработки)
- Git

### Первый запуск

```bash
# Клонирование репозитория
git clone https://github.com/Br1Im/LawTech.git
cd LawTech

# Запуск всех сервисов
docker-compose up -d --build

# Просмотр логов
docker-compose logs -f
```

## Разработка

### Работа с Frontend

```bash
# Вход в контейнер
docker exec -it lawtech-frontend sh

# Или локально
cd frontend
npm install
npm run dev
```

**Структура компонентов:**
- Используем функциональные компоненты с хуками
- TypeScript для типизации
- Ant Design для UI
- CSS Modules для стилей

### Работа с Backend

```bash
# Вход в контейнер
docker exec -it lawtech-backend sh

# Или локально
cd server
npm install
npm run dev
```

**Правила:**
- Используем async/await для асинхронного кода
- Валидация данных через middleware
- Обработка ошибок через try/catch
- JWT для аутентификации

### Работа с базой данных

```bash
# Подключение к MySQL
docker exec -it lawtech-db mysql -u root -p

# Создание миграции
cd server/database/migrations
# Создайте файл XXX_migration_name.sql
```

**Правила миграций:**
- Нумерация: 000_, 001_, 002_...
- Только SQL команды
- Обратная совместимость

### Работа с AI Service

```bash
# Вход в контейнер
docker exec -it lawtech-faiss sh

# Или локально
cd server/scripts
pip install -r requirements.txt
python faiss_service.py
```

## Полезные команды

### Docker

```bash
# Перезапуск всех сервисов
./scripts/restart.sh

# Остановка
./scripts/stop.sh

# Просмотр логов
./scripts/logs.sh [service_name]

# Полная очистка
./scripts/clean.sh
```

### Git

```bash
# Создание ветки для фичи
git checkout -b feature/название-фичи

# Коммит изменений
git add .
git commit -m "feat: описание изменений"

# Пуш в репозиторий
git push origin feature/название-фичи
```

## Стиль кода

### JavaScript/TypeScript

```typescript
// Используем const/let вместо var
const apiUrl = 'http://localhost:3001';

// Стрелочные функции
const fetchData = async () => {
  try {
    const response = await fetch(apiUrl);
    return await response.json();
  } catch (error) {
    console.error('Error:', error);
  }
};

// Деструктуризация
const { data, error } = await fetchData();
```

### React компоненты

```typescript
import { useState, useEffect } from 'react';

interface Props {
  title: string;
  onClose: () => void;
}

const MyComponent: React.FC<Props> = ({ title, onClose }) => {
  const [data, setData] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div>
      <h1>{title}</h1>
    </div>
  );
};

export default MyComponent;
```

## Тестирование

```bash
# Frontend тесты
cd frontend
npm run test

# Backend тесты
cd server
npm run test
```

## Отладка

### Frontend

```typescript
// Используем console.log для отладки
console.log('Debug:', data);

// React DevTools в браузере
```

### Backend

```javascript
// Используем console.log
console.log('Request:', req.body);

// Или debugger
debugger;
```

### Docker

```bash
# Просмотр логов контейнера
docker logs lawtech-backend -f

# Вход в контейнер
docker exec -it lawtech-backend sh
```

## Деплой

```bash
# Сборка для продакшена
docker-compose -f docker-compose.prod.yml up -d --build

# Проверка статуса
docker-compose ps
```

## Troubleshooting

### Проблема: Контейнеры не запускаются

```bash
# Проверка логов
docker-compose logs

# Пересборка
docker-compose down
docker-compose up -d --build
```

### Проблема: База данных не подключается

```bash
# Проверка статуса MySQL
docker exec -it lawtech-db mysql -u root -p

# Пересоздание volumes
docker-compose down -v
docker-compose up -d
```

### Проблема: Frontend не обновляется

```bash
# Очистка кэша
cd frontend
rm -rf node_modules dist
npm install
npm run build
```
