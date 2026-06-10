const jwt = require('jsonwebtoken');
const config = require('../config');
const db = require('../db');

/**
 * Middleware для проверки JWT токена.
 * 
 * Поддержка X-Office-Id:
 *  - Директор: может переключаться на любой офис, которым он владеет (owner_id).
 *  - Мульти-офисный сотрудник: может переключаться на любой офис из user_offices.
 *  - Остальные: заголовок игнорируется, используется office_id из токена.
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

  jwt.verify(token, config.JWT_SECRET, async (err, user) => {
    if (err) {
      const isExpired = err.name === 'TokenExpiredError';
      return res.status(401).json({
        success: false,
        message: isExpired ? 'Токен истёк' : 'Недействительный токен',
        code: isExpired ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID'
      });
    }
    req.user = user;

    const xOfficeId = req.headers['x-office-id'];
    if (xOfficeId) {
      const requestedOfficeId = parseInt(xOfficeId, 10) || null;

      if (requestedOfficeId && requestedOfficeId !== Number(user.office_id)) {
        try {
          if (user.role === 'director') {
            // Директор — проверяем owner_id
            const [offices] = await db.query(
              'SELECT id FROM offices WHERE id = ? AND owner_id = ? LIMIT 1',
              [requestedOfficeId, user.id]
            );
            if (offices && offices.length > 0) {
              req.user.office_id = requestedOfficeId;
            } else {
              console.warn(
                `[auth] Директор ${user.id} запросил X-Office-Id=${requestedOfficeId}, ` +
                `которым не владеет. Заголовок проигнорирован, используется office_id=${user.office_id}.`
              );
            }
          } else {
            // Мульти-офисный сотрудник — проверяем user_offices
            const [uoRows] = await db.query(
              'SELECT 1 FROM user_offices WHERE user_id = ? AND office_id = ? LIMIT 1',
              [user.id, requestedOfficeId]
            );
            if (uoRows && uoRows.length > 0) {
              req.user.office_id = requestedOfficeId;
            } else {
              console.warn(
                `[auth] Пользователь ${user.id} запросил X-Office-Id=${requestedOfficeId}, ` +
                `не назначен на этот офис. Заголовок проигнорирован.`
              );
            }
          }
        } catch (e) {
          console.error('[auth] Ошибка проверки доступа к офису:', e);
        }
      } else if (requestedOfficeId) {
        req.user.office_id = requestedOfficeId;
      }
    }

    next();
  });
};

module.exports = {
  authenticateToken
};
