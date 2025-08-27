#!/bin/bash

# Скрипт для тестирования Docker контейнера локально

echo "Сборка Docker образа..."
docker build -t lawtech-test .

echo "Запуск контейнера..."
docker run -p 8080:10000 --name lawtech-container lawtech-test