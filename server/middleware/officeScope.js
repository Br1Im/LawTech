/**
 * Middleware для определения активного офиса.
 *
 * Логика:
 * - Директор передаёт X-Office-Id в заголовке — проверяем, что он владелец.
 * - Остальные роли привязаны к office_id из users — берём его.
 * - Результат кладём в req.officeId (число или null).
 */
const db = require('../db');

const resolveOfficeScope = async (req, res, next) => {
  try {
    const user = req.user;
    if (!user) return next();

    const headerOfficeId = req.headers['x-office-id'];

    // Берём актуальные данные пользователя из БД
    const [rows] = await db.query(
      'SELECT office_id, role FROM users WHERE id = ? LIMIT 1',
      [user.id]
    );
    const dbUser = rows && rows[0];
    if (!dbUser) return next();

    const role = dbUser.role || user.role;

    if (role === 'director') {
      if (headerOfficeId) {
        // Проверяем, что директор владеет этим офисом
        const [offices] = await db.query(
          'SELECT id FROM offices WHERE id = ? AND owner_id = ?',
          [headerOfficeId, user.id]
        );
        if (offices.length === 0) {
          return res.status(403).json({
            success: false,
            message: 'У вас нет доступа к этому офису'
          });
        }
        req.officeId = Number(headerOfficeId);
      } else {
        // Если директор не передал заголовок — пробуем office_id из БД
        req.officeId = dbUser.office_id || null;
      }
    } else {
      // Для всех остальных ролей — жёстко привязанный офис
      req.officeId = dbUser.office_id || null;
    }

    // Обновляем user объект актуальными данными
    user.office_id = req.officeId;
    user.role = role;

    next();
  } catch (error) {
    console.error('officeScope middleware error:', error);
    next();
  }
};

module.exports = { resolveOfficeScope };
