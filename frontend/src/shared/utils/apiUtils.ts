import { API_BASE_URL, getApiUrl as getConfigApiUrl, getAbsoluteApiUrl as getConfigAbsoluteApiUrl } from '../config/constants';

/**
 * Возвращает полный URL для API запроса
 * Если нужно использование API_BASE_URL в прямых fetch или axios запросах
 * @param path Путь к API endpoint
 * @returns Полный URL для запроса
 */
export const buildApiUrl = (path: string): string => {
  if (path.startsWith('http')) {
    // Если путь уже включает полный URL (например http://...), возвращаем как есть
    return path;
  }
  
  // Используем helper из constants.ts
  return getConfigApiUrl(path);
};

/**
 * Возвращает абсолютный URL для API запроса
 * Используется для обхода проблем с CORS или когда относительные URL не работают
 * @param path Путь к API endpoint
 * @returns Абсолютный URL для запроса
 */
export const buildAbsoluteApiUrl = (path: string): string => {
  if (path.startsWith('http')) {
    // Если путь уже включает полный URL (например http://...), возвращаем как есть
    return path;
  }
  
  // Используем helper из constants.ts для создания абсолютного URL
  return getConfigAbsoluteApiUrl(path);
};

/**
 * Создает URL для загрузки файла
 * @param filePath Путь к файлу
 * @returns URL для загрузки файла
 */
export const getFileUrl = (filePath: string): string => {
  return buildApiUrl(`/uploads/${filePath}`);
};

/**
 * Создает заголовки для авторизованного запроса
 * @returns Объект с заголовками, включая Authorization если есть токен
 */
export const getAuthHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
}; 