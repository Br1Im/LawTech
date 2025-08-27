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

// Настройка CORS
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://lawtech-p225.onrender.com',
    '*'
  ],
  credentials: true
}));

// Настройка middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Отдача статических файлов фронтенда
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// Создание директории uploads если не существует
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Статические файлы для uploads
app.use('/uploads', express.static(uploadsDir));

// Health check endpoints
app.get('/api/status', (req, res) => {
  res.json({ message: 'LawTech API is running', status: 'healthy' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Использование API маршрутов
app.use('/api', apiRoutes);

// Обработчик для SPA - все неизвестные маршруты возвращают index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

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

// Инициализация векторного поиска при запуске
const initializeVectorSearch = async () => {
  try {
    console.log('Initializing vector search...');
    await vectorSearch.initialize();
    console.log('Vector search initialized successfully');
  } catch (error) {
    console.error('Failed to initialize vector search:', error);
    // Не останавливаем сервер, если векторный поиск не инициализировался
  }
};

// Запуск сервера
app.listen(PORT, '0.0.0.0', async () => {
  console.log(`🚀 LawTech Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📁 Uploads directory: ${uploadsDir}`);
  
  // Инициализируем векторный поиск
  await initializeVectorSearch();
  
  console.log('✅ Server is ready to accept requests');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

module.exports = app;