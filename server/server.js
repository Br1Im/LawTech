/**
 * Главный файл сервера LawTech
 */
const express = require('express');
const http = require('http');
const cors = require('cors');
const compression = require('compression');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const config = require('./config');
const apiRoutes = require('./routes/api');
const vectorSearch = require('./services/vectorSearch');
const socketManager = require('./socketManager');

// Инициализация приложения Express
const app = express();
const server = http.createServer(app);
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

// Gzip-сжатие всех ответов
app.use(compression({ level: 6, threshold: 1024 }));

// Настройка middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Отдача статических файлов фронтенда с кэшированием
app.use(express.static(path.join(__dirname, '../frontend/dist'), {
  maxAge: '7d',
  etag: true,
  lastModified: true,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  }
}));

// Создание директории uploads если не существует
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Статические файлы для uploads (с проверкой JWT)
const jwt = require('jsonwebtoken');
app.use('/uploads', (req, res, next) => {
  // Проверяем JWT из query-параметра или заголовка Authorization
  const token = req.query.token
    || (req.headers.authorization && req.headers.authorization.replace('Bearer ', ''));
  if (!token) {
    return res.status(401).json({ success: false, message: 'Требуется авторизация для доступа к файлам' });
  }
  try {
    jwt.verify(token, process.env.JWT_SECRET || require('./config').JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Недействительный токен' });
  }
}, express.static(uploadsDir));

// Импортируем необходимые модули
const { seedDefaultUsers } = require('./scripts/seed_default_users');

// Функция для применения миграций изоляции офисов
const applyOfficeIsolationMigrations = async () => {
  const db = require('./db');

  const addColumnIfNotExists = async (table, column, definition) => {
    const [cols] = await db.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
      [table, column]
    );
    if (cols.length === 0) {
      console.log(`📦 Добавляем ${column} в ${table}...`);
      await db.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
      return true;
    }
    return false;
  };

  try {
    // 1. owner_id в offices
    const ownerAdded = await addColumnIfNotExists('offices', 'owner_id', 'INT NULL AFTER id');
    if (ownerAdded) {
      await db.query(`
        UPDATE offices o
        INNER JOIN users u ON u.office_id = o.id AND u.role = 'director'
        SET o.owner_id = u.id
        WHERE o.owner_id IS NULL
      `);
    }

    // 2. office_id в clients
    const clientOfficeAdded = await addColumnIfNotExists('clients', 'office_id', 'INT NULL');
    if (clientOfficeAdded) {
      await db.query(`
        UPDATE clients cl
        INNER JOIN contracts c ON c.id_client = cl.id
        INNER JOIN employees e ON e.id = c.id_employee
        SET cl.office_id = e.office_id
        WHERE cl.office_id IS NULL AND e.office_id IS NOT NULL
      `);
    }

    // 3. office_id в contracts
    const contractOfficeAdded = await addColumnIfNotExists('contracts', 'office_id', 'INT NULL');
    if (contractOfficeAdded) {
      await db.query(`
        UPDATE contracts c
        INNER JOIN employees e ON e.id = c.id_employee
        SET c.office_id = e.office_id
        WHERE c.office_id IS NULL AND e.office_id IS NOT NULL
      `);
    }

    // 4. Индексы для ускорения запросов
    const indexes = [
      { table: 'offices', column: 'owner_id', name: 'idx_offices_owner' },
      { table: 'clients', column: 'office_id', name: 'idx_clients_office' },
      { table: 'contracts', column: 'office_id', name: 'idx_contracts_office' },
      { table: 'employees', column: 'office_id', name: 'idx_employees_office' },
      { table: 'employee_stats', column: 'employee_id', name: 'idx_empstats_emp' },
      { table: 'office_stats', column: 'office_id', name: 'idx_officestats_office' },
    ];
    for (const idx of indexes) {
      try {
        await db.query(`CREATE INDEX ${idx.name} ON ${idx.table}(${idx.column})`);
      } catch (_) { /* index already exists */ }
    }

    console.log('✅ Миграции изоляции офисов применены');
  } catch (error) {
    console.error('❌ Ошибка миграций изоляции офисов:', error);
  }
};

// Функция для проверки и создания необходимых полей в БД
const checkAndCreateDatabaseFields = async () => {
  console.log('✅ Пропускаем проверку БД - используем миграции');
  
  // Применяем миграции изоляции офисов
  await applyOfficeIsolationMigrations();
  
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

// Инициализация Socket.IO
socketManager.init(server);

// Запуск сервера
server.listen(PORT, '0.0.0.0', async () => {
  console.log(`🚀 LawTech Server running on port ${PORT} (with WebSocket)`);
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

  // Gainnet integration
  try {
    const gainnetService = require('./services/gainnetService');
    await gainnetService.init();
    console.log('✅ Gainnet integration initialized');
  } catch (error) {
    console.error('❌ Gainnet init error:', error);
  }
  
  try { require('./services/deadlineNotifications').startScheduler(); } catch (e) { console.error('deadline scheduler:', e.message); }
  try { require('./services/workflowEngine').startScheduler(); } catch (e) { console.error('workflow scheduler:', e.message); }
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