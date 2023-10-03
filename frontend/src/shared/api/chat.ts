import apiClient from './axios';

export interface Message {
  id: number;
  text: string;
  sender_id: number;
  receiver_id: number;
  is_read: boolean;
  created_at: string;
}

export interface Conversation {
  conversation_with_id: number;
  last_message_time: string;
  unread_count: number;
  user: {
    id: number;
    username: string;
    avatar: string | null;
  };
}

export interface UserInfo {
  id: number;
  username: string;
  avatar: string | null;
  status: {
    isOnline: boolean;
    lastActive: string;
  };
}

// Получить все диалоги пользователя
export const getUserConversations = async (): Promise<Conversation[]> => {
  const response = await apiClient.get<Conversation[]>('/conversations');
  return response.data;
};

// Получить сообщения с конкретным пользователем
export const getConversation = async (otherUserId: number): Promise<Message[]> => {
  const response = await apiClient.get<Message[]>(`/conversations/${otherUserId}`);
  return response.data;
};

// Отправить сообщение пользователю
export const sendMessage = async (receiverId: number, text: string): Promise<Message> => {
  const response = await apiClient.post<Message>(`/conversations/${receiverId}`, { text });
  return response.data;
};

// Пометить сообщения как прочитанные
export const markMessagesAsRead = async (senderId: number): Promise<void> => {
  await apiClient.put(`/conversations/${senderId}/read`);
};

// Удалить сообщение
export const deleteMessage = async (messageId: number): Promise<void> => {
  await apiClient.delete(`/messages/private/${messageId}`);
};

// Получить информацию о пользователе
export const getUserInfo = async (userId: number): Promise<UserInfo> => {
  const response = await apiClient.get<UserInfo>(`/users/${userId}/info`);
  return response.data;
}; 