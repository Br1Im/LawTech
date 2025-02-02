import { useState, useEffect } from 'react';
import { authAPI, UserProfile, LoginData } from '../../api/auth';
import { useNavigate } from 'react-router-dom';

/**
 * Хук для управления аутентификацией пользователя
 */
export const useAuth = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Проверка статуса аутентификации при загрузке приложения
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setLoading(false);
          return;
        }

        const userData = await authAPI.getCurrentUser();
        setUser(userData);
      } catch (err) {
        console.error('Ошибка при проверке аутентификации:', err);
        // Очищаем токен, если он недействителен
        localStorage.removeItem('token');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  /**
   * Функция для входа пользователя
   * @param credentials Данные для входа (логин и пароль)
   */
  const login = async (credentials: LoginData) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await authAPI.login(credentials);
      
      // Сохраняем токен в localStorage
      localStorage.setItem('token', response.token);
      
      // Устанавливаем данные пользователя
      setUser(response.user);
      
      // Перенаправляем пользователя после успешного входа
      navigate('/welcome');
      
      return true;
    } catch (err: any) {
      console.error('Ошибка при входе:', err);
      setError(err.response?.data?.error || 'Произошла ошибка при входе');
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Функция для выхода пользователя
   */
  const logout = () => {
    authAPI.logout();
    setUser(null);
    navigate('/auth');
  };

  /**
   * Проверка, аутентифицирован ли пользователь
   */
  const isAuthenticated = !!user;

  return {
    user,
    loading,
    error,
    login,
    logout,
    isAuthenticated
  };
}; 