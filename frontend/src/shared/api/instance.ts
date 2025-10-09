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
    // Просто передаем ошибку дальше, пусть компоненты сами решают что делать
    // Автоматический редирект убран, чтобы не конфликтовать с логикой компонентов
    return Promise.reject(error);
  }
);

export default apiInstance;