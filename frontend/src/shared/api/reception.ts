import { apiInstance } from './instance';

export interface Message {
  id: string;
  text: string;
  sender: string;
  timestamp: string;
  office_id: string;
  isRead: boolean;
  isMine: boolean;
  createdAt: string;
}

/**
 * API для работы с чатом офиса (ресепшен)
 */
export const receptionAPI = {
  /**
   * Получить сообщения для выбранного офиса
   * @param officeId ID офиса
   */
  getMessages: async (officeId: string): Promise<Message[]> => {
    const response = await apiInstance.get(`/offices/${officeId}/messages`);
    return response.data;
  },

  /**
   * Отправить сообщение в чат офиса
   * @param officeId ID офиса
   * @param text Текст сообщения
   */
  sendMessage: async (officeId: string, text: string): Promise<Message> => {
    const response = await apiInstance.post(`/offices/${officeId}/messages`, { text });
    return response.data;
  },

  /**
   * Отметить сообщение как прочитанное
   * @param messageId ID сообщения
   */
  markAsRead: async (messageId: string): Promise<void> => {
    await apiInstance.put(`/messages/${messageId}/read`);
  },

  /**
   * Удалить сообщение
   * @param messageId ID сообщения
   */
  deleteMessage: async (messageId: string): Promise<void> => {
    await apiInstance.delete(`/messages/${messageId}`);
  }
}; 