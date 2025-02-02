# Скрипт для изменения дат создания и изменения файлов на 4 месяца назад
# Получаем дату 4 месяца назад
$fourMonthsAgo = (Get-Date).AddMonths(-4)
$baseDate = $fourMonthsAgo
$random = New-Object System.Random

Write-Host "Базовая дата для модификации файлов: $($baseDate.ToString('yyyy-MM-dd HH:mm:ss'))"

# Функция для получения случайной даты в пределах 2 недель от базовой даты
function Get-RandomDate {
    param (
        [Parameter(Mandatory=$true)]
        [DateTime]$BaseDate,
        
        [Parameter(Mandatory=$false)]
        [int]$RangeInDays = 14
    )
    
    # Генерируем случайное смещение в пределах указанного диапазона дней
    $randomOffset = $random.Next(-$RangeInDays, $RangeInDays)
    $randomHours = $random.Next(0, 24)
    $randomMinutes = $random.Next(0, 60)
    $randomSeconds = $random.Next(0, 60)
    
    # Создаем новую дату с случайным смещением
    $randomDate = $BaseDate.AddDays($randomOffset).AddHours($randomHours).AddMinutes($randomMinutes).AddSeconds($randomSeconds)
    
    return $randomDate
}

# Функция для установки даты для всех файлов в директории
function Set-DirectoryFileDates {
    param (
        [Parameter(Mandatory=$true)]
        [string]$Path,
        
        [Parameter(Mandatory=$true)]
        [DateTime]$BaseDate,
        
        [Parameter(Mandatory=$false)]
        [string[]]$ExcludeDirs = @(".git", "node_modules"),

        [Parameter(Mandatory=$false)]
        [int]$RangeInDays = 14
    )
    
    # Получаем все файлы в текущей директории
    Get-ChildItem -Path $Path -File | ForEach-Object {
        Try {
            # Генерируем случайную дату для этого файла
            $randomDate = Get-RandomDate -BaseDate $BaseDate -RangeInDays $RangeInDays
            
            # Устанавливаем дату модификации и создания
            $_.CreationTime = $randomDate
            $_.LastWriteTime = $randomDate
            $_.LastAccessTime = $randomDate
            
            Write-Host "Обработан файл: $($_.FullName) -> $($randomDate.ToString('yyyy-MM-dd HH:mm:ss'))" -ForegroundColor Green
        }
        Catch {
            Write-Host "Ошибка обработки файла $($_.FullName): $_" -ForegroundColor Red
        }
    }
    
    # Рекурсивно обрабатываем поддиректории
    Get-ChildItem -Path $Path -Directory | Where-Object { $ExcludeDirs -notcontains $_.Name } | ForEach-Object {
        Write-Host "Обработка директории: $($_.FullName)" -ForegroundColor Yellow
        Set-DirectoryFileDates -Path $_.FullName -BaseDate $BaseDate -ExcludeDirs $ExcludeDirs -RangeInDays $RangeInDays
    }
}

# Запускаем обработку из корневой директории проекта
$projectRoot = "."
$rangeInDays = 14 # Диапазон вариации дат в пределах 2 недель

Set-DirectoryFileDates -Path $projectRoot -BaseDate $baseDate -RangeInDays $rangeInDays

Write-Host "Обработка завершена. Все файлы датированы в пределах $rangeInDays дней от базовой даты: $($baseDate.ToString('yyyy-MM-dd'))" -ForegroundColor Cyan 