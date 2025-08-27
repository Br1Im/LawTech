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

# Продакшн стадия с Node.js
FROM node:18-alpine

# Устанавливаем nginx
RUN apk add --no-cache nginx

# Создаем директории
RUN mkdir -p /var/log/nginx /var/lib/nginx/tmp /app/server

# Устанавливаем рабочую директорию для бэкенда
WORKDIR /app/server

# Копируем файл зависимостей Node.js
COPY server/package*.json ./

# Устанавливаем Node.js зависимости
RUN npm ci --only=production

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
RUN echo '#!/bin/sh' > /start.sh && \
    echo 'echo "Starting Node.js server..."' >> /start.sh && \
    echo 'cd /app/server && npm start &' >> /start.sh && \
    echo 'NODE_PID=$!' >> /start.sh && \
    echo 'echo "Configuring nginx for port $PORT..."' >> /start.sh && \
    echo 'sed "s/\${PORT:-80}/$PORT/g" /etc/nginx/nginx.conf > /tmp/nginx.conf' >> /start.sh && \
    echo 'mv /tmp/nginx.conf /etc/nginx/nginx.conf' >> /start.sh && \
    echo 'echo "Starting nginx..."' >> /start.sh && \
    echo 'echo "Both services started"' >> /start.sh && \
    echo 'nginx -g "daemon off;"' >> /start.sh && \
    chmod +x /start.sh

# Переменные окружения
ENV JWT_SECRET=law-tech-secret-key
ENV PORT=10000

# Открываем порт 10000
EXPOSE 10000

# Запускаем оба сервиса
CMD ["/start.sh"]