FROM node:18-alpine

WORKDIR /app

# Копируем package.json и package-lock.json
COPY package*.json ./

# Устанавливаем зависимости
RUN npm install --only=production

# Копируем исходный код
COPY . .

# Создаем директорию для загрузок
RUN mkdir -p uploads

# Открываем порт
EXPOSE 3001

# Запускаем сервер (сначала ждем базу данных)
CMD ["sh", "-c", "node wait-for-db.js && node server.js"]