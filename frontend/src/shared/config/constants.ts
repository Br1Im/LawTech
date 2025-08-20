/**
 * Константы приложения
 */

// Базовый URL API
// Для продакшена используем относительный путь, а при разработке - полный URL
export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
// Абсолютный адрес API для прямых запросов (резервный вариант)
export const API_SERVER_URL = 'https://lawtech-p225.onrender.com/api';

// Получение полного URL API
export const getApiUrl = (path: string) => {
  // Убираем двойной слеш, если path начинается со слеша
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
};

// Получение абсолютного URL API для крайних случаев
export const getAbsoluteApiUrl = (path: string) => {
  // Убираем двойной слеш, если path начинается со слеша
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_SERVER_URL}${normalizedPath}`;
};

// Локальное хранилище
export const LOCAL_STORAGE_KEYS = {
  TOKEN: 'token',
  USER: 'user',
};

// Роуты
export const ROUTES = {
  HOME: '/',
  AUTH: '/auth',
  WELCOME: '/welcome',
  CRM: '/crm',
  PROFILE: '/profile',
  JOIN: '/join',
  PENDING_REQUEST: '/pending-request',
};

// Константы для юридического чата
export const CHAT_CONSTANTS = {
  MAX_MESSAGE_LENGTH: 2000,
  SUPPORTED_FILE_TYPES: [
    'application/pdf', 
    'image/jpeg', 
    'image/png', 
    'text/plain', 
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10 МБ в байтах
};