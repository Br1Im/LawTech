const path = require('path');
const https = require('https');

// Основные настройки
const config = {
  // Порт сервера
  PORT: process.env.PORT || 5000,
  
  // JWT секрет
  JWT_SECRET: process.env.JWT_SECRET || 'law-tech-secret-key',
  
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
    AUTH_KEY: process.env.GIGACHAT_AUTH_KEY || 'ZjFmODc3YWYtMzMzMC00ZWI5LTlmZTYtZjQ5ODYxM2YwZjM3OjQzOWVlY2UzLTAxMjYtNDVkMy1iOWQ3LTg3OTI3M2NjMzI0Mw==',
    SCOPE: process.env.GIGACHAT_SCOPE || 'GIGACHAT_API_PERS',
    AUTH_URL: 'https://gigachat.devices.sberbank.ru/api/v1/token',
    API_URL: 'https://gigachat.devices.sberbank.ru/api/v1/chat/completions',
    httpsAgent: new https.Agent({
      rejectUnauthorized: false,
      timeout: 10000
    })
  }
};

module.exports = config; 