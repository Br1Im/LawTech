# Stage 1: Сборка frontend
FROM node:18-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Сборка backend
FROM node:18-alpine AS backend-build
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --only=production
COPY server/ ./

# Stage 3: Финальный образ с nginx
FROM nginx:alpine AS production

# Установка Node.js для запуска backend
RUN apk add --no-cache nodejs npm

# Создание рабочих директорий
WORKDIR /app
RUN mkdir -p /var/log/nginx /var/lib/nginx/tmp

# Копирование собранного frontend
COPY --from=frontend-build /app/frontend/dist /usr/share/nginx/html

# Копирование backend
COPY --from=backend-build /app/server /app/server

# Копирование конфигурации nginx
COPY nginx.conf /etc/nginx/nginx.conf

# Создание start.sh скрипта
RUN echo '#!/bin/sh\n\
echo "Starting LawTech application..."\n\
echo "Current directory: $(pwd)"\n\
\n\
# Проверка наличия server.js\n\
if [ ! -f "/app/server/server.js" ]; then\n\
    echo "ERROR: server.js not found!"\n\
    exit 1\n\
fi\n\
\n\
# Запуск Node.js сервера в фоне\n\
echo "Starting Node.js server..."\n\
cd /app/server && node server.js &\n\
NODE_PID=$!\n\
echo "Node.js server started with PID: $NODE_PID"\n\
\n\
# Запуск nginx\n\
echo "Starting nginx..."\n\
nginx -g "daemon off;" &\n\
NGINX_PID=$!\n\
echo "Nginx started with PID: $NGINX_PID"\n\
\n\
# Ожидание завершения процессов\n\
wait $NODE_PID $NGINX_PID' > /app/start.sh

# Делаем скрипт исполняемым
RUN chmod +x /app/start.sh

# Создание директории для загрузок
RUN mkdir -p /app/server/uploads

# Установка переменных окружения
ENV NODE_ENV=production
ENV JWT_SECRET=law-tech-secret-key
ENV PORT=3001

# Открытие портов
EXPOSE 10000

# Запуск приложения
CMD ["/bin/sh", "/app/start.sh"]