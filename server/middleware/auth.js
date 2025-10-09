const jwt = require('jsonwebtoken');
const config = require('../config');

/**
 * Middleware для проверки JWT токена
 * @param {Object} req - объект запроса Express
 * @param {Object} res - объект ответа Express
 * @param {Function} next - функция для передачи управления следующему middleware
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  console.log(`🔐 Auth check for ${req.method} ${req.url}`);
  console.log(`📋 Auth header: ${authHeader ? 'present' : 'missing'}`);
  console.log(`🎫 Token: ${token ? 'present' : 'missing'}`);

  if (!token) {
    console.log('❌ No token provided');
    return res.status(401).json({
      success: false,
      message: 'Токен доступа не предоставлен'
    });
  }

  jwt.verify(token, config.JWT_SECRET, (err, user) => {
    if (err) {
      console.log('❌ Token verification failed:', err.message);
      return res.status(403).json({
        success: false,
        message: 'Недействительный токен'
      });
    }
    
    console.log('✅ Token verified successfully for user:', user.id);
    req.user = user;
    next();
  });
};

module.exports = {
  authenticateToken
};