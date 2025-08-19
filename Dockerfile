# Multi-stage build для LawTech приложения
# Stage 1: Сборка frontend
FROM node:18-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci --only=production
COPY frontend/ ./
RUN npm run build

# Stage 2: Сборка backend
FROM node:18-alpine AS backend-build
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --only=production
COPY server/ ./

# Stage 3: Python сервис для FAISS
FROM python:3.9-slim AS python-build
WORKDIR /app/scripts
COPY server/scripts/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY server/scripts/ ./

# Stage 4: Финальный образ с nginx для статики и node для API
FROM node:18-alpine AS production

# Установка nginx
RUN apk add --no-cache nginx python3 py3-pip

# Создание директорий
WORKDIR /app
RUN mkdir -p /var/log/nginx /var/lib/nginx/tmp /etc/nginx/conf.d

# Копирование собранного frontend
COPY --from=frontend-build /app/frontend/dist /usr/share/nginx/html

# Копирование backend
COPY --from=backend-build /app/server /app/server

# Копирование Python сервиса
COPY --from=python-build /app/scripts /app/scripts
COPY --from=python-build /usr/local/lib/python3.9/site-packages /usr/local/lib/python3.9/site-packages
COPY --from=python-build /usr/local/bin /usr/local/bin

# Конфигурация nginx
RUN echo 'server {\n\
    listen 80;\n\
    server_name localhost;\n\
    \n\
    # Статические файлы frontend\n\
    location / {\n\
        root /usr/share/nginx/html;\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
    \n\
    # Проксирование API запросов к backend\n\
    location /api/ {\n\
        proxy_pass http://localhost:3001;\n\
        proxy_http_version 1.1;\n\
        proxy_set_header Upgrade $http_upgrade;\n\
        proxy_set_header Connection "upgrade";\n\
        proxy_set_header Host $host;\n\
        proxy_set_header X-Real-IP $remote_addr;\n\
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n\
        proxy_set_header X-Forwarded-Proto $scheme;\n\
    }\n\
}' > /etc/nginx/conf.d/default.conf

# Создание startup скрипта
RUN echo '#!/bin/sh\n\
set -e\n\
\n\
# Запуск FAISS сервиса в фоне\n\
cd /app/scripts\n\
python3 faiss_service.py &\n\
FAISS_PID=$!\n\
\n\
# Запуск Node.js сервера в фоне\n\
cd /app/server\n\
node server.js &\n\
NODE_PID=$!\n\
\n\
# Запуск nginx\n\
nginx -g "daemon off;" &\n\
NGINX_PID=$!\n\
\n\
# Ожидание завершения любого процесса\n\
wait $FAISS_PID $NODE_PID $NGINX_PID' > /app/start.sh

RUN chmod +x /app/start.sh

# Переменные окружения
ENV NODE_ENV=production
ENV PORT=3001
ENV FAISS_SERVICE_URL=http://localhost:5000
ENV PYTHONUNBUFFERED=1

# Открытие портов
EXPOSE 80 3001 5000

# Запуск приложения
CMD ["/app/start.sh"]