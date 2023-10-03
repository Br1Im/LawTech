import axios from 'axios';
import { API_BASE_URL, API_SERVER_URL, getApiUrl, getAbsoluteApiUrl } from '../config/constants';

// Проверяем, нужно ли использовать абсолютные URL
const shouldUseAbsoluteUrls = () => {
  return localStorage.getItem('useAbsoluteUrls') === 'true';
};

// Выбираем базовый URL в зависимости от настроек
const getBaseURL = () => {
  return shouldUseAbsoluteUrls() ? API_SERVER_URL : API_BASE_URL;
};

// Создаем экземпляр axios с базовыми настройками
const apiClient = axios.create({
  baseURL: getBaseURL(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Добавляем интерцептор для добавления токена к запросам
apiClient.interceptors.request.use(
  (config) => {
    // При каждом запросе обновляем baseURL на случай, если настройки изменились
    config.baseURL = getBaseURL();

    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Интерцептор для обработки ответов
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response) {
      // Если получаем 404, попробуем переключиться на абсолютный URL и повторить запрос
      if (error.response.status === 404 && !shouldUseAbsoluteUrls()) {
        localStorage.setItem('useAbsoluteUrls', 'true');
        
        // Повторяем запрос с новым baseURL
        const originalRequest = error.config;
        originalRequest.baseURL = API_SERVER_URL;
        
        try {
          return await axios(originalRequest);
        } catch (retryError) {
          return Promise.reject(retryError);
        }
      }
      
      // Проверяем, истек ли токен (ошибка 401)
      if (error.response.status === 401) {
        // Если токен истек, перенаправляем на страницу входа
        localStorage.removeItem('token');
        if (window.location.pathname !== '/auth') {
          window.location.href = '/auth';
        }
      }
    }
    return Promise.reject(error);
  }
);

// Функция для получения полного URL API с учетом настроек
export const getFullApiUrl = (path: string): string => {
  return shouldUseAbsoluteUrls() ? getAbsoluteApiUrl(path) : getApiUrl(path);
};

export default apiClient; 