FROM python:3.11-slim

WORKDIR /app

# Установка системных зависимостей
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Копирование файла зависимостей
COPY requirements.txt .

# Установка Python зависимостей
RUN pip install --no-cache-dir -r requirements.txt

# Копирование остальных файлов приложения
COPY . .

# Создание директории для загрузок
RUN mkdir -p uploads
RUN chmod 777 uploads

# Переменные окружения
ENV JWT_SECRET=law-tech-secret-key
ENV PORT=3001

# Открываем порт
EXPOSE 3001

# Запуск приложения
CMD ["python", "main.py"]