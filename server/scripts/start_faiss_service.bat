@echo off
SETLOCAL

:: Путь к скрипту
SET DIR=%~dp0

:: Установка виртуального окружения, если его нет
IF NOT EXIST "%DIR%venv\" (
    echo Setting up Python virtual environment...
    python -m venv "%DIR%venv"
    call "%DIR%venv\Scripts\activate.bat"
    pip install -r "%DIR%requirements.txt"
) ELSE (
    echo Activating virtual environment...
    call "%DIR%venv\Scripts\activate.bat"
)

:: Запуск FAISS сервиса
echo Starting FAISS service...
python "%DIR%faiss_service.py"

ENDLOCAL 