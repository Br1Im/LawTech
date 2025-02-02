/**
 * Главный файл сервера LawTech
 */
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const config = require('./config');
const apiRoutes = require('./routes/api');

// Инициализация приложения Express
const app = express();
const PORT = config.PORT;

// Логирование запросов
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.log('Headers:', JSON.stringify(req.headers));
  next();
});

// Настройка middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Настройка CORS
console.log('CORS конфигурация:', config.cors);
app.use(cors(config.cors));

// Обработка предварительных запросов (OPTIONS)
app.options('*', cors(config.cors));

// Статические файлы
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// Использование API маршрутов
app.use('/api', apiRoutes);

// Fallback для SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`Сервер запущен на порту: ${PORT}`);
  console.log(`JWT_SECRET: ${config.JWT_SECRET.substring(0, 3)}...`);
});

