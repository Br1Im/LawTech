# ✅ Авторизация работает!

## Проблема была решена

Проблема заключалась в том, что на порту 3001 висел старый процесс Node.js, который конфликтовал с новым сервером. После завершения старого процесса всё заработало.

## Текущий статус

✅ Backend сервер запущен на http://localhost:3001
✅ Frontend сервер запущен на http://localhost:5173
✅ Авторизация работает корректно

## Тестовые аккаунты

| Email | Пароль | Роль |
|-------|--------|------|
| admin@lawtech.ru | admin123 | admin |
| lawyer@lawtech.com | lawyer123 | lawyer |
| expert@lawtech.com | expert123 | expert |
| lawyer1@pravoved.ru | lawyer123 | lawyer |
| director@pravoved.ru | director123 | director |

## Тестирование

### 1. Через HTML файл
Откройте файл `test_auth.html` в браузере для быстрого тестирования авторизации.

### 2. Через Node.js скрипт
```bash
node test_login.js
```

### 3. Через PowerShell
```powershell
$body = @{
    email = "admin@lawtech.ru"
    password = "admin123"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3001/api/auth/login" -Method POST -ContentType "application/json" -Body $body
```

### 4. Через фронтенд приложение
Откройте http://localhost:5173 и войдите с любым из тестовых аккаунтов.

## Успешный ответ API

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "first_name": "Администратор",
    "last_name": "Системы",
    "email": "admin@lawtech.ru",
    "role": "admin",
    "office_id": 1
  }
}
```

## Что дальше?

Теперь вы можете:
1. Протестировать авторизацию через фронтенд
2. Проверить защищённые маршруты
3. Тестировать другие API endpoints
4. Разрабатывать новые функции

## Полезные команды

### Проверка запущенных процессов
```powershell
netstat -ano | Select-String ":3001"
netstat -ano | Select-String ":5173"
```

### Остановка процесса на порту (если нужно)
```powershell
# Найти PID процесса
netstat -ano | Select-String ":3001"

# Завершить процесс
taskkill /F /PID <PID>
```

### Перезапуск серверов
```bash
# Backend
cd server
node server.js

# Frontend
cd frontend
npm run dev
```
