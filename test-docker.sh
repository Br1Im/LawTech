#!/bin/bash

# Тестовый скрипт для проверки Docker сборки
echo "=== Тестирование Docker сборки LawTech ==="

# Остановка и удаление существующих контейнеров
echo "Остановка существующих контейнеров..."
docker stop lawtech-app 2>/dev/null || true
docker rm lawtech-app 2>/dev/null || true

# Удаление старого образа
echo "Удаление старого образа..."
docker rmi lawtech:latest 2>/dev/null || true

# Сборка нового образа
echo "Сборка нового образа..."
docker build -t lawtech:latest .

if [ $? -eq 0 ]; then
    echo "✅ Сборка успешна!"
    
    # Запуск контейнера
    echo "Запуск контейнера..."
    docker run -d --name lawtech-app -p 10000:10000 lawtech:latest
    
    if [ $? -eq 0 ]; then
        echo "✅ Контейнер запущен успешно!"
        echo "🌐 Приложение доступно по адресу: http://localhost:10000"
        
        # Ожидание запуска сервисов
        echo "Ожидание запуска сервисов..."
        sleep 10
        
        # Проверка логов
        echo "=== Логи контейнера ==="
        docker logs lawtech-app
        
        # Проверка доступности
        echo "\n=== Проверка доступности ==="
        curl -f http://localhost:10000 >/dev/null 2>&1
        if [ $? -eq 0 ]; then
            echo "✅ Приложение отвечает на запросы!"
        else
            echo "❌ Приложение не отвечает"
        fi
        
    else
        echo "❌ Ошибка запуска контейнера"
        exit 1
    fi
else
    echo "❌ Ошибка сборки образа"
    exit 1
fi

echo "\n=== Тестирование завершено ==="
echo "Для остановки контейнера выполните: docker stop lawtech-app"
echo "Для удаления контейнера выполните: docker rm lawtech-app"