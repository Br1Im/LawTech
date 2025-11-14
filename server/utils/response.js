/**
 * Утилиты для стандартизированных ответов API
 */

/**
 * Успешный ответ
 */
const success = (res, data, message = 'Успешно', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data
  });
};

/**
 * Ответ с ошибкой
 */
const error = (res, message = 'Ошибка', statusCode = 500, errors = null) => {
  const response = {
    success: false,
    message
  };

  if (errors) {
    response.errors = errors;
  }

  return res.status(statusCode).json(response);
};

/**
 * Ответ с данными и пагинацией
 */
const paginated = (res, data, pagination, message = 'Успешно') => {
  return res.status(200).json({
    success: true,
    message,
    data,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: Math.ceil(pagination.total / pagination.limit)
    }
  });
};

/**
 * Ответ "не найдено"
 */
const notFound = (res, message = 'Ресурс не найден') => {
  return res.status(404).json({
    success: false,
    message
  });
};

/**
 * Ответ "не авторизован"
 */
const unauthorized = (res, message = 'Требуется авторизация') => {
  return res.status(401).json({
    success: false,
    message
  });
};

/**
 * Ответ "доступ запрещен"
 */
const forbidden = (res, message = 'Доступ запрещен') => {
  return res.status(403).json({
    success: false,
    message
  });
};

/**
 * Ответ "неверный запрос"
 */
const badRequest = (res, message = 'Неверный запрос', errors = null) => {
  return error(res, message, 400, errors);
};

module.exports = {
  success,
  error,
  paginated,
  notFound,
  unauthorized,
  forbidden,
  badRequest
};
