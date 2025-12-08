FROM python:3.11-slim

WORKDIR /app

# Устанавливаем зависимости
RUN pip install --no-cache-dir flask flask-cors

# Устанавливаем Perspectra
RUN pip install --no-cache-dir perspectra

# Создаем директории
RUN mkdir -p /input /output

# Копируем сервер
COPY server.py .

# Открываем порт
EXPOSE 5001

# Запускаем сервер
CMD ["python", "server.py"]
