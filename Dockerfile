# Dockerfile только для фронтенда
FROM node:18-alpine AS frontend-build

# Установка рабочей директории
WORKDIR /app/frontend

# Копирование package.json и package-lock.json
COPY frontend/package*.json ./

# Установка зависимостей
RUN npm ci

# Копирование исходного кода фронтенда
COPY frontend/ ./

# Сборка фронтенда
RUN npm run build

# Финальный образ с nginx
FROM nginx:alpine AS production

# Копирование собранного фронтенда
COPY --from=frontend-build /app/frontend/dist /usr/share/nginx/html

# Создание конфигурации nginx
RUN echo 'server {' > /etc/nginx/conf.d/default.conf && \
    echo '    listen 80;' >> /etc/nginx/conf.d/default.conf && \
    echo '    server_name localhost;' >> /etc/nginx/conf.d/default.conf && \
    echo '' >> /etc/nginx/conf.d/default.conf && \
    echo '    location / {' >> /etc/nginx/conf.d/default.conf && \
    echo '        root /usr/share/nginx/html;' >> /etc/nginx/conf.d/default.conf && \
    echo '        try_files $uri $uri/ /index.html;' >> /etc/nginx/conf.d/default.conf && \
    echo '    }' >> /etc/nginx/conf.d/default.conf && \
    echo '}' >> /etc/nginx/conf.d/default.conf

# Открытие порта
EXPOSE 80

# Запуск nginx
CMD ["nginx", "-g", "daemon off;"]