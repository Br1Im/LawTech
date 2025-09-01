FROM python:3.8-slim

WORKDIR /app

# Устанавливаем зависимости для сборки некоторых пакетов
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Копируем файл с зависимостями
COPY requirements.txt .

# Устанавливаем зависимости
RUN pip install --no-cache-dir -r requirements.txt

# Копируем исходный код
COPY . .

# Открываем порт
EXPOSE 5000

# Запускаем FAISS сервис
CMD ["python", "faiss_service.py"]