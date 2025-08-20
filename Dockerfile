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

# Продакшн стадия
FROM node:18-alpine

# Устанавливаем nginx
RUN apk add --no-cache nginx

# Создаем директории
RUN mkdir -p /var/log/nginx /var/lib/nginx/tmp /app/server

# Устанавливаем рабочую директорию для бэкенда
WORKDIR /app/server

# Копируем package.json и package-lock.json бэкенда
COPY server/package*.json ./

# Устанавливаем зависимости бэкенда
RUN npm ci --only=production

# Копируем исходный код бэкенда
COPY server/ .

# Копируем собранный фронтенд
COPY --from=build /app/frontend/dist /usr/share/nginx/html

# Копируем конфигурацию nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Создаем скрипт запуска
RUN echo '#!/bin/sh' > /start.sh && \
    echo 'echo "Starting Node.js server..."' >> /start.sh && \
    echo 'cd /app/server && node server.js &' >> /start.sh && \
    echo 'NODE_PID=$!' >> /start.sh && \
    echo 'echo "Starting nginx..."' >> /start.sh && \
    echo 'nginx -g "daemon off;" &' >> /start.sh && \
    echo 'NGINX_PID=$!' >> /start.sh && \
    echo 'echo "Both services started"' >> /start.sh && \
    echo 'wait $NODE_PID $NGINX_PID' >> /start.sh && \
    chmod +x /start.sh

# Открываем порт 80
EXPOSE 80

# Запускаем оба сервиса
CMD ["/start.sh"]