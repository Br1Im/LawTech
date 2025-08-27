# Скрипт для тестирования Docker контейнера локально на Windows

Write-Host "Сборка Docker образа..." -ForegroundColor Green
docker build -t lawtech-test .

if ($LASTEXITCODE -eq 0) {
    Write-Host "Запуск контейнера на порту 8080..." -ForegroundColor Green
    docker run -p 8080:10000 --name lawtech-container lawtech-test
} else {
    Write-Host "Ошибка при сборке образа" -ForegroundColor Red
}