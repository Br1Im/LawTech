import axios from 'axios';
import { API_BASE_URL } from '../config/constants';

export const apiInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Добавляем интерцептор для токена и активного офиса
apiInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Передаём активный офис для директоров
    const activeOfficeId = localStorage.getItem('activeOfficeId');
    if (activeOfficeId) {
      config.headers['X-Office-Id'] = activeOfficeId;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

apiInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiInstance;
