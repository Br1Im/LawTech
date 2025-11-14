#!/bin/bash
# Скрипт для просмотра логов

if [ -z "$1" ]; then
  echo "📋 Просмотр логов всех контейнеров..."
  docker-compose logs -f
else
  echo "📋 Просмотр логов контейнера $1..."
  docker-compose logs -f $1
fi
