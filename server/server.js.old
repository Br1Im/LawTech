/**
 * Главный файл сервера LawTech
 */
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const config = require('./config');
const apiRoutes = require('./routes/api');
const vectorSearch = require('./services/vectorSearch');

// Инициализация приложения Express
const app = express();
const PORT = process.env.PORT || 3001;

// Настройка middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Статические файлы
app.use(express.static(path.join(__dirname, '../frontend/dist')));
app.use(express.static(path.join(__dirname, 'public')));

// Использование API маршрутов
app.use('/api', apiRoutes);

// Обработка 404 ошибки
app.use((req, res, next) => {
  res.status(404).json({ error: 'Not Found' });
});

// Обработка ошибок
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error'
    }
  });
});

// Fallback для SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

// Инициализация векторного поиска при запуске
const initializeVectorSearch = async () => {
  try {
    await vectorSearch.initialize();
    console.log('Vector search initialized successfully');
  } catch (error) {
    console.error('Failed to initialize vector search:', error);
  }
};

// Запуск сервера
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  
  // Инициализация векторного поиска
  await initializeVectorSearch();
});

