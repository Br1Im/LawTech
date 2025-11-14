#!/bin/bash

# Скрипт проверки авторизации

echo "🔍 Проверка авторизации..."
echo ""

echo "1️⃣ Логи backend (последние 50 строк):"
docker-compose logs --tail=50 backend | grep -E "auth|login|token|JWT|error|Error" || docker-compose logs --tail=50 backend

echo ""
echo "2️⃣ Проверка базы данных - пользователи:"
docker-compose exec db mysql -ulawtech_user -plawtech_password_2024 lawtech_crm -e "SELECT id, email, role FROM users LIMIT 5;"

echo ""
echo "3️⃣ Тест API авторизации:"
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"lawyer1@pravoved.ru","password":"password123"}' \
  -v 2>&1 | head -30

echo ""
echo "4️⃣ Проверка CORS настроек backend:"
docker-compose exec backend cat /app/server.js | grep -A 10 "cors"
