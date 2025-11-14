/**
 * Middleware для валидации данных с использованием Joi схем
 */
const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false, // Показать все ошибки, а не только первую
      stripUnknown: true // Удалить неизвестные поля
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        success: false,
        message: 'Ошибка валидации данных',
        errors
      });
    }

    // Заменяем req.body на валидированные данные
    req.body = value;
    next();
  };
};

module.exports = validate;
