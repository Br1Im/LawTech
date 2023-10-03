import axios from 'axios';
import { apiInstance } from './instance';

export interface LoginData {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: {
    id: number;
    username: string;
    role: string;
  };
}

export interface UserProfile {
  id: number;
  username: string;
  role: string;
  email?: string;
}

export const authAPI = {
  /**
   * Аутентификация пользователя
   * @param credentials Логин и пароль
   */
  login: async (credentials: LoginData): Promise<LoginResponse> => {
    const response = await apiInstance.post('/auth/login', credentials);
    return response.data;
  },

  /**
   * Регистрация нового пользователя
   * @param userData Данные пользователя
   */
  register: async (userData: any) => {
    const response = await apiInstance.post('/register', userData);
    return response.data;
  },

  /**
   * Получение данных текущего пользователя
   */
  getCurrentUser: async (): Promise<UserProfile> => {
    const response = await apiInstance.get('/auth/me');
    return response.data.user;
  },

  /**
   * Выход из системы
   */
  logout: () => {
    localStorage.removeItem('token');
  }
}; 