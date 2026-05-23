const path = require('path');
const https = require('https');

// Основные настройки
const config = {
  // Порт сервера
  PORT: process.env.PORT || 5000,
  
  // JWT секрет
  JWT_SECRET: process.env.JWT_SECRET || 'law-tech-secret-key',
  
  // Время жизни JWT токена
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',

  // Refresh-токен (длинный, для автоматического обновления access-токена)
  REFRESH_SECRET: process.env.REFRESH_SECRET || (process.env.JWT_SECRET ? process.env.JWT_SECRET + '_refresh' : 'law-tech-refresh-key'),
  REFRESH_EXPIRES_IN: process.env.REFRESH_EXPIRES_IN || '30d',
  
  // OCR API ключ
  OCR_API_KEY: process.env.OCR_API_KEY || 'K89514712488957',
  
  // Пути к директориям
  paths: {
    uploads: path.join(__dirname, '../uploads')
  },
  
  // Настройки CORS
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:5000', 'http://law-tech.online'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  },
  
  // GigaChat API настройки
  gigachat: {
    AUTH_KEY: process.env.GIGACHAT_AUTH_KEY || 'ZjFmODc3YWYtMzMzMC00ZWI5LTlmZTYtZjQ5ODYxM2YwZjM3OmI5NzZjYzcxLTViN2MtNDUyOC1hZDJlLTQ2NGRkOGU4ZTMyYg==',
    SCOPE: process.env.GIGACHAT_SCOPE || 'GIGACHAT_API_PERS',
    AUTH_URL: 'https://ngw.devices.sberbank.ru:9443/api/v2/oauth',
    API_URL: 'https://gigachat.devices.sberbank.ru/api/v1/chat/completions',
    httpsAgent: new https.Agent({
      rejectUnauthorized: false,
      timeout: 60000,
      keepAlive: true,
      maxSockets: 10,
      secureProtocol: 'TLSv1_2_method'
    })
  }
};

module.exports = config;