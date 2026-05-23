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

// --- Refresh-механизм ---
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (token) prom.resolve(token);
    else prom.reject(error);
  });
  failedQueue = [];
};

// Добавляем интерцептор для добавления токена к запросам
apiClient.interceptors.request.use(
  (config) => {
    // При каждом запросе обновляем baseURL на случай, если настройки изменились
    config.baseURL = getBaseURL();

    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    const activeOfficeId = localStorage.getItem('activeOfficeId');
    if (activeOfficeId) {
      config.headers['X-Office-Id'] = activeOfficeId;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Интерцептор для обработки ответов
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response) {
      const status = error.response.status;
      const code = error.response.data?.code;

      // Отключаем автоматическое переключение на удаленный сервер в режиме разработки
      const isLocalDevelopment = import.meta.env.VITE_API_URL && import.meta.env.VITE_API_URL.includes('localhost');

      // Если получаем 404, попробуем переключиться на абсолютный URL и повторить запрос
      // НО только если мы НЕ в режиме локальной разработки
      if (status === 404 && !shouldUseAbsoluteUrls() && !isLocalDevelopment) {
        localStorage.setItem('useAbsoluteUrls', 'true');
        originalRequest.baseURL = API_SERVER_URL;
        try {
          return await axios(originalRequest);
        } catch (retryError) {
          return Promise.reject(retryError);
        }
      }

      // Access-токен истёк — пробуем обновить через refresh-токен
      if (status === 401 && code === 'TOKEN_EXPIRED' && !originalRequest._retry) {
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          }).then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          });
        }

        originalRequest._retry = true;
        isRefreshing = true;

        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          processQueue(error, null);
          isRefreshing = false;
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          if (window.location.pathname !== '/auth') window.location.href = '/auth';
          return Promise.reject(error);
        }

        try {
          const base = getBaseURL();
          const { data } = await axios.post(
            `${base}/auth/refresh`,
            { refreshToken },
            { headers: { 'Content-Type': 'application/json' } }
          );

          localStorage.setItem('token', data.token);
          if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);

          processQueue(null, data.token);
          originalRequest.headers.Authorization = `Bearer ${data.token}`;
          return apiClient(originalRequest);
        } catch (refreshError) {
          processQueue(refreshError, null);
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          if (window.location.pathname !== '/auth') window.location.href = '/auth';
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      }

      // Только реально сломанная авторизация (401, не expired) выкидывает на /auth.
      // 403 — это «нет прав», пользователь остаётся залогинен.
      if (status === 401 && code !== 'TOKEN_EXPIRED') {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        if (window.location.pathname !== '/auth') window.location.href = '/auth';
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
