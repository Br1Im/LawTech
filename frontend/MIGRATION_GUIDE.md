# Руководство по миграции API URL

В проекте была проведена централизация управления API URL. Теперь вместо прямого использования хардкодных адресов (например `http://localhost:5000/api`), следует использовать централизованную конфигурацию.

## Изменения

1. Все API URL теперь хранятся в `src/shared/config/constants.ts`:
   - Базовый URL: `API_BASE_URL`
   - Функция для формирования полных URL: `getApiUrl(path)`

2. Созданы утилиты в `src/shared/utils/apiUtils.ts`:
   - `buildApiUrl(path)` - формирует полный URL для API запроса
   - `getFileUrl(filePath)` - создает URL для загрузки файлов
   - `getAuthHeaders()` - создает заголовки для авторизованного запроса

3. Создан единый клиент для работы с API в `src/shared/api/apiClient.ts`.

## Как мигрировать код

### 1. Прямые fetch/axios вызовы

**Было:**
```typescript
const response = await fetch('http://localhost:5000/api/login', { ... });
```

**Должно быть:**
```typescript
import { buildApiUrl } from 'src/shared/utils/apiUtils';

const response = await fetch(buildApiUrl('/login'), { ... });
```

### 2. Использование apiClient

**Было:**
```typescript
const response = await axios.post('http://localhost:5000/api/login', data);
```

**Должно быть:**
```typescript
import apiClient from 'src/shared/api/apiClient';

const response = await apiClient.post('/login', data);
```

### 3. Для URL файлов

**Было:**
```typescript
const downloadUrl = `http://localhost:5000/api/docx/${fileName}`;
```

**Должно быть:**
```typescript
import { getFileUrl } from 'src/shared/utils/apiUtils';

const downloadUrl = getFileUrl(`docx/${fileName}`);
```

## Преимущества централизации

1. Изменение базового URL (например при деплое) делается в одном месте
2. Единообразное обращение к API в коде
3. Упрощение переключения между окружениями разработки/продакшн

## Настройка окружений

- Для локальной разработки: 
  - Создайте файл `.env.local` с содержимым:
  ```
  VITE_API_URL=http://localhost:5000/api
  ```

- Для продакшн:
  - Используется значение по умолчанию `/api`, что позволяет работать 
    через относительные URL и проксирование через Nginx. 