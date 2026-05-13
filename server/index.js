/**
 * Константы приложения
 */

// Статусы контрактов
const CONTRACT_STATUS = {
  PENDING: 'pending',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};

// Роли пользователей
const USER_ROLES = {
  ADMIN: 'admin',
  ADMINISTRATOR: 'administrator',
  LAWYER: 'lawyer',
  MANAGER: 'manager',
  EMPLOYEE: 'employee',
  DIRECTOR: 'director',
  OKK: 'okk',
  EXPERT: 'expert'
};

// Типы документов
const DOCUMENT_TYPES = {
  CONTRACT: 'contract',
  AGREEMENT: 'agreement',
  POWER_OF_ATTORNEY: 'power_of_attorney',
  COURT_DECISION: 'court_decision',
  OTHER: 'other'
};

// Статусы клиентов
const CLIENT_STATUS = {
  NEW: 'new',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  ARCHIVED: 'archived'
};

// Лимиты
const LIMITS = {
  MAX_OFFICES: 3,
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_EMPLOYEES_PER_OFFICE: 50
};

module.exports = {
  CONTRACT_STATUS,
  USER_ROLES,
  DOCUMENT_TYPES,
  CLIENT_STATUS,
  LIMITS
};
