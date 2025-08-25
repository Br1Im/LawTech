#!/usr/bin/env python3
"""
Скрипт для запуска FastAPI сервера
"""

import uvicorn
import os
from pathlib import Path

if __name__ == "__main__":
    # Устанавливаем рабочую директорию
    os.chdir(Path(__file__).parent)
    
    # Запускаем сервер
    port = int(os.getenv("PORT", 3001))
    
    print(f"🚀 Запуск FastAPI сервера на порту {port}")
    print(f"📁 Рабочая директория: {os.getcwd()}")
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=True,  # Автоперезагрузка при изменениях
        log_level="info"
    )