import { api } from './api';

export const updateUserStatus = async (userId: number, isOnline: boolean) => {
  try {
    const response = await api.post('/users/status', { userId, isOnline });
    return response.data;
  } catch (error) {
    console.error('Ошибка при обновлении статуса:', error);
    throw error;
  }
};

export const getUserStatus = async (userId: number) => {
  try {
    const response = await api.get(`/users/${userId}/status`);
    return response.data;
  } catch (error) {
    console.error('Ошибка при получении статуса:', error);
    throw error;
  }
}; 