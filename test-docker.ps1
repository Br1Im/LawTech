# PowerShell скрипт для тестирования Docker контейнера
Write-Host "=== Тестирование Docker сборки LawTech ===" -ForegroundColor Cyan

# Остановка и удаление существующих контейнеров
Write-Host "Остановка существующих контейнеров..." -ForegroundColor Yellow
docker stop lawtech-app 2>$null
docker rm lawtech-app 2>$null

# Удаление старого образа
Write-Host "Удаление старого образа..." -ForegroundColor Yellow
docker rmi lawtech:latest 2>$null

# Сборка нового образа
Write-Host "Сборка нового образа..." -ForegroundColor Yellow
docker build -t lawtech:latest .

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Сборка успешна!" -ForegroundColor Green
    
    # Запуск контейнера
    Write-Host "Запуск контейнера..." -ForegroundColor Yellow
    docker run -d --name lawtech-app -p 10000:10000 lawtech:latest
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Контейнер запущен успешно!" -ForegroundColor Green
        Write-Host "🌐 Приложение доступно по адресу: http://localhost:10000" -ForegroundColor Cyan
        
        # Ожидание запуска сервисов
        Write-Host "Ожидание запуска сервисов..." -ForegroundColor Yellow
        Start-Sleep -Seconds 10
        
        # Проверка логов
        Write-Host "=== Логи контейнера ===" -ForegroundColor Cyan
        docker logs lawtech-app
        
        # Проверка доступности приложения
        Write-Host "Checking application availability..."
        Start-Sleep -Seconds 5

        try {
            $response = Invoke-WebRequest -Uri "http://localhost:10000" -UseBasicParsing
            Write-Host "Frontend is running! Status: $($response.StatusCode)"
            Write-Host "Response length: $($response.Content.Length) characters"
            if ($response.Content -like "*<!DOCTYPE html>*") {
                Write-Host "✓ Frontend HTML detected"
            } else {
                Write-Host "⚠ Unexpected response format"
            }
        } catch {
            Write-Host "Frontend check failed: $($_.Exception.Message)"
        }

        try {
            $apiResponse = Invoke-WebRequest -Uri "http://localhost:10000/api/health" -UseBasicParsing
            Write-Host "API Health check: $($apiResponse.StatusCode)"
            Write-Host "API Response: $($apiResponse.Content)"
        } catch {
            Write-Host "API health check failed: $($_.Exception.Message)"
        }

        try {
            $statusResponse = Invoke-WebRequest -Uri "http://localhost:10000/api/status" -UseBasicParsing
            Write-Host "API Status check: $($statusResponse.StatusCode)"
            Write-Host "Status Response: $($statusResponse.Content)"
        } catch {
            Write-Host "API status check failed: $($_.Exception.Message)"
        }
        
    } else {
        Write-Host "❌ Ошибка запуска контейнера" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "❌ Ошибка сборки образа" -ForegroundColor Red
    exit 1
}

Write-Host "`n=== Тестирование завершено ===" -ForegroundColor Cyan
Write-Host "Для остановки контейнера выполните: docker stop lawtech-app" -ForegroundColor Gray
Write-Host "Для удаления контейнера выполните: docker rm lawtech-app" -ForegroundColor Gray