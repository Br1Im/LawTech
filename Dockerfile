# Используем Node.js 18 Alpine для минимального размера
FROM node:18-alpine as build

# Собираем фронтенд
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

# Продакшн стадия
FROM node:18-alpine
WORKDIR /app

# Копируем package.json и package-lock.json сервера
COPY server/package*.json ./

# Устанавливаем зависимости сервера
RUN npm ci --only=production

# Копируем исходный код сервера
COPY server/ .

# Копируем собранный фронтенд
COPY --from=build /app/frontend/dist ./frontend/dist

# Создаем директорию для загрузок
RUN mkdir -p uploads

# Переменные окружения
ENV NODE_ENV=production
ENV JWT_SECRET=law-tech-secret-key
ENV PORT=10000

# Открываем порт
EXPOSE 10000

# Запускаем сервер
CMD ["npm", "start"]