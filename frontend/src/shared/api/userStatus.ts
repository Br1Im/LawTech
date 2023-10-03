import apiClient from './axios';

export interface UserStatus {
  isOnline: boolean;
  lastActive: string;
}

export interface UserStatusMap {
  [userId: string]: UserStatus;
}

// Функция для обновления статуса пользователя (онлайн)
export const updateUserStatus = async (): Promise<void> => {
  await apiClient.post('/users/status');
};

// Функция для получения статусов всех пользователей
export const getUsersStatus = async (): Promise<UserStatusMap> => {
  const response = await apiClient.get<UserStatusMap>('/users/status');
  return response.data;
}; 