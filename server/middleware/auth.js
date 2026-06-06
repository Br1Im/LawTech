const jwt = require('jsonwebtoken');
const config = require('../config');
const db = require('../db');

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

  jwt.verify(token, config.JWT_SECRET, async (err, user) => {
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

    // Директор может переключать офис через заголовок X-Office-Id,
    // НО только на офисы, которыми он реально владеет (owner_id = его id).
    // Если запрошен чужой офис — заголовок игнорируется и остаётся родной
    // офис из токена. Это защищает от утечки данных между офисами, когда
    // в браузере остаётся устаревший activeOfficeId от другого аккаунта.
    const xOfficeId = req.headers['x-office-id'];
    if (xOfficeId && user.role === 'director') {
      const requestedOfficeId = parseInt(xOfficeId, 10) || null;
      if (requestedOfficeId && requestedOfficeId !== Number(user.office_id)) {
        try {
          const [offices] = await db.query(
            'SELECT id FROM offices WHERE id = ? AND owner_id = ? LIMIT 1',
            [requestedOfficeId, user.id]
          );
          if (offices && offices.length > 0) {
            // Директор владеет этим офисом — разрешаем переключение
            req.user.office_id = requestedOfficeId;
          } else {
            // Чужой офис — НЕ доверяем заголовку, оставляем родной офис.
            console.warn(
              `[auth] Директор ${user.id} запросил X-Office-Id=${requestedOfficeId}, ` +
              `которым не владеет. Заголовок проигнорирован, используется office_id=${user.office_id}.`
            );
          }
        } catch (e) {
          console.error('[auth] Ошибка проверки владения офисом:', e);
          // При ошибке проверки безопаснее оставить родной офис из токена.
        }
      } else if (requestedOfficeId) {
        // Запрошенный офис совпадает с родным офисом директора — ок.
        req.user.office_id = requestedOfficeId;
      }
    }

    next();
  });
};

module.exports = {
  authenticateToken
};
