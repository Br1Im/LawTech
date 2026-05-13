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
  const xAuthToken = req.headers['x-auth-token'];
  let token = null;
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (xAuthToken) {
    token = xAuthToken;
  }

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

    // Директор может переключать офис через заголовок X-Office-Id
    const xOfficeId = req.headers['x-office-id'];
    if (xOfficeId && user.role === 'director') {
      req.user.office_id = parseInt(xOfficeId, 10) || null;
    }

    next();
  });
};

module.exports = {
  authenticateToken
};