#!/bin/bash

# Путь к скрипту
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Установка виртуального окружения, если его нет
if [ ! -d "$DIR/venv" ]; then
  echo "Setting up Python virtual environment..."
  python3 -m venv "$DIR/venv"
  source "$DIR/venv/bin/activate"
  pip install -r "$DIR/requirements.txt"
else
  echo "Activating virtual environment..."
  source "$DIR/venv/bin/activate"
fi

# Запуск FAISS сервиса
echo "Starting FAISS service..."
python "$DIR/faiss_service.py" 