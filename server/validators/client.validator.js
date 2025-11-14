const Joi = require('joi');

/**
 * Валидация создания клиента
 */
const createClientSchema = Joi.object({
  surname: Joi.string().required().min(2).max(50).messages({
    'string.empty': 'Фамилия обязательна',
    'string.min': 'Фамилия должна содержать минимум 2 символа'
  }),
  name: Joi.string().required().min(2).max(50).messages({
    'string.empty': 'Имя обязательно',
    'string.min': 'Имя должно содержать минимум 2 символа'
  }),
  middle_name: Joi.string().allow('').max(50),
  phone: Joi.string().required().pattern(/^[\d\s\+\-\(\)]+$/).messages({
    'string.empty': 'Телефон обязателен',
    'string.pattern.base': 'Неверный формат телефона'
  }),
  email: Joi.string().email().allow(''),
  address: Joi.string().allow('').max(255),
  passport_series: Joi.string().allow('').pattern(/^\d{4}$/),
  passport_number: Joi.string().allow('').pattern(/^\d{6}$/),
  passport_issued_by: Joi.string().allow('').max(255),
  passport_issue_date: Joi.date().allow(null),
  office_id: Joi.string().required(),
  status: Joi.string().valid('new', 'in_progress', 'completed', 'archived').default('new')
});

/**
 * Валидация обновления клиента
 */
const updateClientSchema = Joi.object({
  id: Joi.string().required(),
  surname: Joi.string().min(2).max(50),
  name: Joi.string().min(2).max(50),
  middle_name: Joi.string().allow('').max(50),
  phone: Joi.string().pattern(/^[\d\s\+\-\(\)]+$/),
  email: Joi.string().email().allow(''),
  address: Joi.string().allow('').max(255),
  passport_series: Joi.string().allow('').pattern(/^\d{4}$/),
  passport_number: Joi.string().allow('').pattern(/^\d{6}$/),
  passport_issued_by: Joi.string().allow('').max(255),
  passport_issue_date: Joi.date().allow(null),
  status: Joi.string().valid('new', 'in_progress', 'completed', 'archived')
});

module.exports = {
  createClientSchema,
  updateClientSchema
};
