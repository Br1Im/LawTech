const jwt = require('jsonwebtoken');
const config = require('../config');
require('dotenv').config();

/**
 * Middleware для проверки токена аутентификации
 * @param {Object} req - объект запроса Express
 * @param {Object} res - объект ответа Express
 * @param {Function} next - функция перехода к следующему обработчику
 */
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({ error: 'Требуется авторизация' });
  }
  
  const token = authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Требуется авторизация' });
  }
  
  try {
    // Используем секретный ключ из конфигурации для совместимости с другими middleware
    const decoded = jwt.verify(token, config.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Ошибка проверки токена:', error);
    return res.status(403).json({ error: 'Недействительный или устаревший токен' });
  }
};

module.exports = authMiddleware; 