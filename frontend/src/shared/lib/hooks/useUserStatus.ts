import { useState, useEffect } from 'react';
import { updateUserStatus, getUsersStatus } from '../../api/userStatus';
import type { UserStatusMap } from '../../api/userStatus';

// Интервал обновления статуса в миллисекундах
const UPDATE_INTERVAL = 1000; // 1 секунда

export const useUserStatus = () => {
  const [usersStatus, setUsersStatus] = useState<UserStatusMap>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Функция для обновления статуса текущего пользователя
  const updateStatus = async () => {
    try {
      await updateUserStatus();
    } catch (err) {
      console.error('Ошибка при обновлении статуса:', err);
    }
  };

  // Функция для получения статусов всех пользователей
  const fetchStatuses = async () => {
    try {
      const statuses = await getUsersStatus();
      setUsersStatus(statuses);
      setLoading(false);
    } catch (err) {
      console.error('Ошибка при получении статусов пользователей:', err);
      setError('Не удалось загрузить статусы пользователей');
      setLoading(false);
    }
  };

  useEffect(() => {
    // Обновляем статус при монтировании компонента
    updateStatus();

    // Получаем статусы всех пользователей
    fetchStatuses();

    // Настраиваем интервал для периодического обновления статуса
    const statusInterval = setInterval(updateStatus, UPDATE_INTERVAL);
    
    // Настраиваем интервал для получения статусов всех пользователей
    const fetchInterval = setInterval(fetchStatuses, UPDATE_INTERVAL * 2);

    // События для отслеживания активности пользователя
    const handleActivity = () => {
      updateStatus();
    };

    // События для отслеживания видимости страницы
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updateStatus();
      }
    };

    // Добавляем обработчики событий
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('click', handleActivity);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Очистка при размонтировании
    return () => {
      clearInterval(statusInterval);
      clearInterval(fetchInterval);
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return { usersStatus, loading, error };
}; 