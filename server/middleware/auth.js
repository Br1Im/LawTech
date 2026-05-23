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

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Токен доступа не предоставлен'
    });
  }

  jwt.verify(token, config.JWT_SECRET, (err, user) => {
    if (err) {
      // Distinguish expired vs truly invalid for debugging
      const isExpired = err.name === 'TokenExpiredError';
      return res.status(401).json({
        success: false,
        message: isExpired ? 'Токен истёк' : 'Недействительный токен',
        code: isExpired ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID'
      });
    }
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
