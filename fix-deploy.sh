#!/bin/bash

# Скрипт для исправления проблем с деплоем
# Запустить один раз на сервере: bash fix-deploy.sh

echo "🔧 Исправляем проблемы с Git..."

cd ~/LawTech

# Сбрасываем все локальные изменения
git fetch origin
git reset --hard origin/main
git clean -fd

echo "✅ Git репозиторий очищен!"
echo "Теперь автодеплой будет работать нормально"
