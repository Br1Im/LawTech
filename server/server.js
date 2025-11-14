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
    'http://localhost:5174',
    'http://localhost:3000',
    'https://lawtech-p225.onrender.com',
    '*'
  ],
  credentials: true
}));

// Настройка middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Логирование всех запросов для отладки
app.use((req, res, next) => {
  console.log(`📝 ${req.method} ${req.url} - ${new Date().toISOString()}`);
  next();
});

// Отдача статических файлов фронтенда
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// Создание директории uploads если не существует
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Статические файлы для uploads
app.use('/uploads', express.static(uploadsDir));

// Импортируем необходимые модули
const { seedDefaultUsers } = require('./scripts/seed_default_users');

// Функция для проверки и создания необходимых полей в БД
const checkAndCreateDatabaseFields = async () => {
  console.log('✅ Пропускаем проверку БД - используем миграции');
  
  // Создаем тестовые аккаунты
  try {
    console.log('👤 Создание тестовых аккаунтов...');
    await seedDefaultUsers();
  } catch (userError) {
    console.error('❌ Ошибка при создании тестовых аккаунтов:', userError);
  }
};

// Health check endpoints
app.get('/api/status', (req, res) => {
  res.json({ message: 'LawTech API is running', status: 'healthy' });
});

app.get('/api/health', async (req, res) => {
  try {
    const db = require('./db');
    
    // Проверяем подключение к базе данных
     let dbStatus = 'unknown';
     try {
       const dbModule = require('./db');
       await dbModule.query('SELECT 1 as test');
       dbStatus = 'connected';
     } catch (dbError) {
       dbStatus = 'disconnected';
       console.error('Database health check failed:', dbError);
     }
    
    // Проверяем доступность GigaChat API
    let gigachatStatus = 'unknown';
    try {
      const gigachatService = require('./services/gigachat');
      // Простая проверка доступности сервиса (без реального запроса)
      gigachatStatus = 'configured';
    } catch (gigachatError) {
      gigachatStatus = 'not_configured';
    }
    
    const healthData = {
      status: dbStatus === 'connected' ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      services: {
        database: dbStatus,
        gigachat: gigachatStatus
      },
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: require('./package.json').version || '1.0.0'
    };
    
    res.json(healthData);
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
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
  
  // Проверка и создание необходимых полей в БД
  await checkAndCreateDatabaseFields();
  
  // Создаем тестовые аккаунты
  try {
    console.log('👤 Создание тестовых аккаунтов...');
    const { seedDefaultUsers } = require('./scripts/seed_default_users');
    await seedDefaultUsers();
    console.log('✅ Тестовые аккаунты созданы успешно');
  } catch (error) {
    console.error('❌ Ошибка при создании тестовых аккаунтов:', error);
  }
  
  // Инициализируем векторный поиск
  console.log('Initializing vector search...');
  try {
    await initializeVectorSearch();
    console.log('Vector search initialized successfully');
  } catch (error) {
    console.error('Error initializing vector search:', error);
  }
  
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