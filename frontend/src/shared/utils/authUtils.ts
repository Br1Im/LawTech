/**
 * Утилиты для работы с авторизацией
 */

/**
 * Проверяет, авторизован ли пользователь
 */
export const isAuthenticated = (): boolean => {
  const token = localStorage.getItem('token');
  return !!token;
};

/**
 * Получает токен из localStorage
 */
export const getToken = (): string | null => {
  return localStorage.getItem('token');
};

/**
 * Сохраняет токен в localStorage
 */
export const setToken = (token: string): void => {
  localStorage.setItem('token', token);
};

/**
 * Удаляет токен из localStorage
 */
export const removeToken = (): void => {
  localStorage.removeItem('token');
};

/**
 * Выполняет выход из системы
 */
export const logout = (): void => {
  // Удаляем токен
  removeToken();
  
  // Удаляем другие данные пользователя
  localStorage.removeItem('user');
  localStorage.removeItem('office_id');
  
  // Перенаправляем на страницу авторизации
  window.location.href = '/auth';
};

/**
 * Проверяет валидность токена (базовая проверка)
 */
export const isTokenValid = (): boolean => {
  const token = getToken();
  
  if (!token) {
    return false;
  }
  
  try {
    // Декодируем JWT токен (без проверки подписи)
    const parts = token.split('.');
    if (parts.length !== 3) {
      return false;
    }
    
    const payload = JSON.parse(atob(parts[1]));
    
    // Проверяем срок действия только если он указан
    if (payload.exp) {
      const expirationTime = payload.exp * 1000; // Конвертируем в миллисекунды
      const currentTime = Date.now();
      
      // Добавляем буфер в 10 секунд чтобы избежать проблем с синхронизацией времени
      if (currentTime >= (expirationTime - 10000)) {
        console.warn('Токен истек');
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error('Ошибка при проверке токена:', error);
    // Если не можем декодировать - считаем токен валидным (пусть сервер решает)
    return true;
  }
};

/**
 * Проверяет авторизацию и перенаправляет на /auth если не авторизован
 */
export const requireAuth = (): boolean => {
  if (!isAuthenticated() || !isTokenValid()) {
    logout();
    return false;
  }
  return true;
};

/**
 * Получает данные пользователя из токена
 */
export const getUserFromToken = (): any | null => {
  const token = getToken();
  
  if (!token) {
    return null;
  }
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload;
  } catch (error) {
    console.error('Ошибка при декодировании токена:', error);
    return null;
  }
};

/**
 * Настраивает перехватчик для автоматического выхода при 401 ошибке
 */
export const setupAuthInterceptor = (): void => {
  // Перехватываем все fetch запросы
  const originalFetch = window.fetch;
  
  window.fetch = async (...args) => {
    const response = await originalFetch(...args);
    
    // Если получили 401 - токен невалиден
    if (response.status === 401) {
      console.warn('Получен 401 ответ, выполняем выход из системы');
      logout();
    }
    
    return response;
  };
};
