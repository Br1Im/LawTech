/**
 * Централизованный обработчик ошибок
 */
const errorHandler = (err, req, res, next) => {
  console.error('❌ Error:', err);

  // Ошибка валидации JWT
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Недействительный токен'
    });
  }

  // Ошибка истекшего токена
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Токен истек'
    });
  }

  // Ошибка базы данных
  if (err.code && err.code.startsWith('ER_')) {
    return res.status(500).json({
      success: false,
      message: 'Ошибка базы данных',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }

  // Ошибка валидации Joi
  if (err.isJoi) {
    return res.status(400).json({
      success: false,
      message: 'Ошибка валидации',
      errors: err.details
    });
  }

  // Общая ошибка
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Внутренняя ошибка сервера',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
};

/**
 * Обработчик для несуществующих маршрутов
 */
const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    message: `Маршрут ${req.method} ${req.url} не найден`
  });
};

module.exports = {
  errorHandler,
  notFoundHandler
};
