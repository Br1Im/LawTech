const Joi = require('joi');

/**
 * Валидация создания офиса
 */
const createOfficeSchema = Joi.object({
  officeName: Joi.string().required().min(2).max(100).messages({
    'string.empty': 'Название офиса обязательно',
    'string.min': 'Название офиса должно содержать минимум 2 символа',
    'string.max': 'Название офиса не должно превышать 100 символов'
  }),
  officeAddress: Joi.string().allow('').max(255),
  contactPhone: Joi.string().allow('').pattern(/^[\d\s\+\-\(\)]+$/),
  work_phone2: Joi.string().allow('').pattern(/^[\d\s\+\-\(\)]+$/),
  inn: Joi.string().required().pattern(/^\d{10,12}$/).messages({
    'string.empty': 'ИНН обязателен',
    'string.pattern.base': 'ИНН должен содержать 10 или 12 цифр'
  }),
  ogrn: Joi.string().required().pattern(/^\d{13,15}$/).messages({
    'string.empty': 'ОГРН обязателен',
    'string.pattern.base': 'ОГРН должен содержать 13 или 15 цифр'
  }),
  ipSurname: Joi.string().required().min(2).max(50),
  ipName: Joi.string().required().min(2).max(50),
  ipMiddleName: Joi.string().allow('').max(50),
  owner_id: Joi.number().integer().positive()
});

/**
 * Валидация обновления офиса
 */
const updateOfficeSchema = Joi.object({
  id: Joi.string().required(),
  officeName: Joi.string().min(2).max(100),
  officeAddress: Joi.string().allow('').max(255),
  contactPhone: Joi.string().allow('').pattern(/^[\d\s\+\-\(\)]+$/),
  work_phone2: Joi.string().allow('').pattern(/^[\d\s\+\-\(\)]+$/),
  inn: Joi.string().pattern(/^\d{10,12}$/),
  ogrn: Joi.string().pattern(/^\d{13,15}$/),
  ipSurname: Joi.string().min(2).max(50),
  ipName: Joi.string().min(2).max(50),
  ipMiddleName: Joi.string().allow('').max(50)
});

module.exports = {
  createOfficeSchema,
  updateOfficeSchema
};
