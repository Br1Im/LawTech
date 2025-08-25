# Dockerfile для фронтенда и бэкенда
FROM node:18-alpine as build

# Устанавливаем рабочую директорию для фронтенда
WORKDIR /app/frontend

# Копируем package.json и package-lock.json фронтенда
COPY frontend/package*.json ./

# Устанавливаем зависимости фронтенда (включая devDependencies для сборки)
RUN npm ci

# Копируем исходный код фронтенда
COPY frontend/ .

# Собираем фронтенд
RUN npm run build

# Продакшн стадия с Python
FROM python:3.11-slim

# Устанавливаем nginx и системные зависимости
RUN apt-get update && apt-get install -y \
    nginx \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Создаем директории
RUN mkdir -p /var/log/nginx /var/lib/nginx/tmp /app/server

# Устанавливаем рабочую директорию для бэкенда
WORKDIR /app/server

# Копируем файл зависимостей Python
COPY server/requirements.txt ./

# Устанавливаем Python зависимости
RUN pip install --no-cache-dir -r requirements.txt

# Копируем исходный код бэкенда
COPY server/ .

# Копируем собранный фронтенд
COPY --from=build /app/frontend/dist /usr/share/nginx/html

# Копируем конфигурацию nginx
COPY nginx.conf /etc/nginx/nginx.conf

# Создаем директорию для загрузок
RUN mkdir -p uploads
RUN chmod 777 uploads

# Создаем скрипт запуска
RUN echo '#!/bin/bash' > /start.sh && \
    echo 'echo "Starting Python FastAPI server..."' >> /start.sh && \
    echo 'cd /app/server && gunicorn main:app --host 0.0.0.0 --port ${PORT:-10000} &' >> /start.sh && \
    echo 'PYTHON_PID=$!' >> /start.sh && \
    echo 'echo "Starting nginx..."' >> /start.sh && \
    echo 'nginx -g "daemon off;" &' >> /start.sh && \
    echo 'NGINX_PID=$!' >> /start.sh && \
    echo 'echo "Both services started"' >> /start.sh && \
    echo 'wait $PYTHON_PID $NGINX_PID' >> /start.sh && \
    chmod +x /start.sh

# Переменные окружения
ENV JWT_SECRET=law-tech-secret-key
ENV PORT=10000

# Открываем порт 10000
EXPOSE 10000

# Запускаем оба сервиса
CMD ["/start.sh"]