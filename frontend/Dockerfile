FROM node:18-alpine as build

WORKDIR /app

# Копирование файлов зависимостей
COPY package*.json ./

# Установка зависимостей
RUN npm ci

# Копирование остальных файлов приложения
COPY . .
RUN npm install -g vite
# Сборка приложения
RUN npm run build

# Вторая стадия - использование nginx для раздачи статических файлов
FROM nginx:alpine

# Копирование собранного фронтенда из предыдущей стадии
COPY --from=build /app/dist /usr/share/nginx/html

# Копирование конфигурации nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Открываем порт
EXPOSE 80

# Запуск nginx
CMD ["nginx", "-g", "daemon off;"] 