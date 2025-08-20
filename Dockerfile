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

# Создаем конфигурацию nginx
RUN cat > /etc/nginx/conf.d/default.conf << 'EOF'
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html index.htm;

    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    try_files $uri $uri/ /index.html;
}
EOF

# Создаем скрипт запуска
RUN echo '#!/bin/sh' > /start.sh && \
    echo 'echo "Starting Node.js server..."' >> /start.sh && \
    echo 'cd /app/server && node server.js &' >> /start.sh && \
    echo 'NODE_PID=$!' >> /start.sh && \
    echo 'echo "Starting nginx..."' >> /start.sh && \
    echo 'nginx &' >> /start.sh && \
    echo 'NGINX_PID=$!' >> /start.sh && \
    echo 'echo "Both services started"' >> /start.sh && \
    echo 'wait $NODE_PID $NGINX_PID' >> /start.sh && \
    chmod +x /start.sh

# Открываем порт 80
EXPOSE 80

# Запускаем оба сервиса
CMD ["/start.sh"]