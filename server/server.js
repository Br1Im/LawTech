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

// Функция для проверки и создания необходимых полей в БД
const checkAndCreateDatabaseFields = async () => {
  const db = require('./db');
  
  try {
    console.log('🔍 Проверка структуры базы данных...');
    
    // Проверяем существование таблицы users
    const [userTableExists] = await db.query(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='users'"
    );
    
    if (userTableExists.length === 0) {
      console.log('📋 Создание таблицы users...');
      await db.query(`
        CREATE TABLE users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username VARCHAR(255) NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          role VARCHAR(50) NOT NULL DEFAULT 'lawyer',
          office_id INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
    }
    
    // Проверяем существование таблицы offices
    const [officeTableExists] = await db.query(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='offices'"
    );
    
    if (officeTableExists.length === 0) {
      console.log('🏢 Создание таблицы offices...');
      await db.query(`
        CREATE TABLE offices (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name VARCHAR(255) NOT NULL,
          address TEXT,
          contact_phone VARCHAR(50),
          website VARCHAR(255),
          revenue DECIMAL(15,2) DEFAULT 0,
          orders INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
    }
    
    // Проверяем наличие колонки role в таблице users
    try {
      const [userColumns] = await db.query("PRAGMA table_info(users)");
      console.log('📋 Структура таблицы users:', userColumns);
      const hasRoleColumn = Array.isArray(userColumns) && userColumns.some(col => col.name === 'role');
      
      if (!hasRoleColumn) {
        console.log('➕ Добавляем колонку role в таблицу users...');
        await db.query('ALTER TABLE users ADD COLUMN role VARCHAR(50) NOT NULL DEFAULT "lawyer"');
        console.log('✅ Колонка role добавлена в таблицу users');
      } else {
        console.log('✅ Колонка role уже существует в таблице users');
      }
    } catch (error) {
      if (error.code === 'SQLITE_ERROR' && error.message.includes('duplicate column name')) {
        console.log('✅ Колонка role уже существует в таблице users');
      } else {
        throw error;
      }
    }
    
    // Проверяем существование таблицы calendar_events
    const [calendarTableExists] = await db.query(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='calendar_events'"
    );
    
    if (calendarTableExists.length === 0) {
      console.log('📅 Создание таблицы calendar_events...');
      await db.query(`
        CREATE TABLE calendar_events (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          date DATE NOT NULL,
          time TIME NOT NULL,
          type VARCHAR(50) NOT NULL,
          priority VARCHAR(20) NOT NULL,
          participants TEXT,
          location VARCHAR(255),
          created_by INTEGER NOT NULL,
          office_id INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (created_by) REFERENCES users(id),
          FOREIGN KEY (office_id) REFERENCES offices(id)
        )
      `);
      console.log('✅ Таблица calendar_events создана успешно');
    } else {
      console.log('✅ Таблица calendar_events уже существует');
    }
    
    console.log('✅ Проверка базы данных завершена успешно');
    
  } catch (error) {
    console.error('❌ Ошибка при проверке базы данных:', error);
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