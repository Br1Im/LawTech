import axios from 'axios';
import { API_BASE_URL } from '../config/constants';

// Базовый URL API
// const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Создаем экземпляр axios с базовыми настройками
export const apiInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Добавляем интерцептор для добавления токена к запросам
apiInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Интерцептор для обработки ответов
apiInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    // Проверяем, истек ли токен (ошибка 401)
    if (error.response && error.response.status === 401) {
      // Если токен истек, перенаправляем на страницу входа
      localStorage.removeItem('token');
      if (window.location.pathname !== '/auth') {
        window.location.href = '/auth';
      }
    }
    return Promise.reject(error);
  }
);

export default apiInstance; 