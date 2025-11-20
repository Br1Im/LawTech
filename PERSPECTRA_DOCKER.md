# Perspectra - Docker Setup

Perspectra успешно запущен через Docker! 🎉

## Что это?

Perspectra - инструмент для автоматической коррекции перспективы и обработки сканированных документов.

## Установка

Docker образ уже собран: `perspectra:latest`

## Использование

### Вариант 1: Прямой запуск через Docker

```bash
# Показать справку
docker run --rm perspectra:latest

# Корректировать перспективу документа
docker run --rm -v "${PWD}/perspectra-input:/work" perspectra:latest correct --binary=gauss-diff /work/document.jpg

# Найти углы документа
docker run --rm -v "${PWD}/perspectra-input:/work" perspectra:latest corners /work/document.jpg

# Бинаризация изображения
docker run --rm -v "${PWD}/perspectra-input:/work" perspectra:latest binarize --method=gauss-diff /work/document.jpg
```

### Вариант 2: Через docker-compose

```bash
# Показать справку
docker-compose -f docker-compose.perspectra.yml run --rm perspectra

# Корректировать перспективу
docker-compose -f docker-compose.perspectra.yml run --rm perspectra correct --binary=gauss-diff /input/document.jpg

# Найти углы документа
docker-compose -f docker-compose.perspectra.yml run --rm perspectra corners /input/document.jpg
```

## Структура папок

- `perspectra-input/` - поместите сюда изображения для обработки
- `perspectra-output/` - здесь будут сохранены результаты (опционально)

## Примеры команд

### Коррекция перспективы с бинаризацией
```bash
docker-compose -f docker-compose.perspectra.yml run --rm perspectra correct --binary=gauss-diff /input/receipt.jpg
```

### Коррекция в оттенках серого
```bash
docker-compose -f docker-compose.perspectra.yml run --rm perspectra correct --gray /input/document.jpg
```

### Определение углов документа (JSON)
```bash
docker-compose -f docker-compose.perspectra.yml run --rm perspectra corners /input/document.jpg
```

### Режим отладки
```bash
docker-compose -f docker-compose.perspectra.yml run --rm perspectra --debug correct /input/document.jpg
```

## Результаты тестирования

✅ **Docker образ собран** - Python 3.12, все зависимости установлены
✅ **Команда `correct`** - работает, корректирует перспективу
✅ **Команда `corners`** - работает, определяет углы документа
✅ **Монтирование томов** - работает корректно
✅ **Обработка изображений** - успешно обработано тестовое изображение

## Технические детали

- **Базовый образ**: python:3.12-slim
- **Размер образа**: ~500MB
- **Зависимости**: imageio, matplotlib, numpy, pandas, plotly, scikit-image
- **Исходный код**: https://github.com/ad-si/Perspectra

## Примечания

- Проект в режиме поддержки, дальнейшая разработка в [FlatCV](https://github.com/ad-si/FlatCV)
- Предупреждение RuntimeWarning можно игнорировать - это не влияет на работу
- Для лучших результатов используйте изображения 10-20 Mpx с четкими углами документа
