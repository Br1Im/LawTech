FROM node:18-alpine

WORKDIR /app

# Установка зависимостей
COPY package*.json ./
RUN npm ci

# Копирование остальных файлов приложения
COPY . .

# Создание директории для загрузок
RUN mkdir -p uploads
RUN chmod 777 uploads

# Переменные окружения будут переданы из docker-compose.yml
ENV GIGACHAT_AUTH_KEY=ZjFmODc3YWYtMzMzMC00ZWI5LTlmZTYtZjQ5ODYxM2YwZjM3OjQzOWVlY2UzLTAxMjYtNDVkMy1iOWQ3LTg3OTI3M2NjMzI0Mw==
ENV GIGACHAT_SCOPE=GIGACHAT_API_PERS
ENV JWT_SECRET=law-tech-secret-key
ENV OCR_API_KEY=K89514712488957

# Открываем порт, который использует приложение
EXPOSE 5000

# Запуск приложения
CMD ["node", "server.js"] 