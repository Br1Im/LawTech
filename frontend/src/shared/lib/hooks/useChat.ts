import { useState, useEffect, useCallback } from 'react';
import { 
  getUserConversations, 
  getConversation, 
  sendMessage, 
  markMessagesAsRead,
  deleteMessage,
  getUserInfo
} from '../../api/chat';
import type { Message, Conversation, UserInfo } from '../../api/chat';

// Интервал обновления сообщений в миллисекундах
const UPDATE_INTERVAL = 3000; // 3 секунды

export const useChat = (initialUserId?: number) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentMessages, setCurrentMessages] = useState<Message[]>([]);
  const [currentUserId, setCurrentUserId] = useState<number | null>(initialUserId || null);
  const [currentUserInfo, setCurrentUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Получение всех диалогов пользователя
  const fetchConversations = useCallback(async () => {
    try {
      const data = await getUserConversations();
      setConversations(data);
    } catch (err) {
      console.error('Ошибка при получении диалогов:', err);
      setError('Не удалось загрузить диалоги');
    }
  }, []);

  // Получение сообщений с конкретным пользователем
  const fetchMessages = useCallback(async (userId: number) => {
    if (!userId) return;
    
    try {
      setLoading(true);
      const data = await getConversation(userId);
      setCurrentMessages(data);
      
      // Помечаем сообщения как прочитанные
      await markMessagesAsRead(userId);
      
      setLoading(false);
    } catch (err) {
      console.error('Ошибка при получении сообщений:', err);
      setError('Не удалось загрузить сообщения');
      setLoading(false);
    }
  }, []);

  // Получение информации о пользователе
  const fetchUserInfo = useCallback(async (userId: number) => {
    if (!userId) return;
    
    try {
      const data = await getUserInfo(userId);
      setCurrentUserInfo(data);
    } catch (err) {
      console.error('Ошибка при получении информации о пользователе:', err);
      setError('Не удалось загрузить информацию о пользователе');
    }
  }, []);

  // Отправка сообщения
  const handleSendMessage = useCallback(async (text: string) => {
    if (!currentUserId || !text.trim()) return;
    
    try {
      const newMessage = await sendMessage(currentUserId, text);
      setCurrentMessages(prev => [...prev, newMessage]);
      
      // Обновляем список диалогов после отправки сообщения
      fetchConversations();
    } catch (err) {
      console.error('Ошибка при отправке сообщения:', err);
      setError('Не удалось отправить сообщение');
    }
  }, [currentUserId, fetchConversations]);

  // Удаление сообщения
  const handleDeleteMessage = useCallback(async (messageId: number) => {
    try {
      await deleteMessage(messageId);
      setCurrentMessages(prev => prev.filter(msg => msg.id !== messageId));
    } catch (err) {
      console.error('Ошибка при удалении сообщения:', err);
      setError('Не удалось удалить сообщение');
    }
  }, []);

  // Открытие чата с пользователем
  const openChat = useCallback((userId: number) => {
    setCurrentUserId(userId);
  }, []);

  // Эффект для загрузки диалогов при монтировании
  useEffect(() => {
    fetchConversations();
    
    // Настраиваем интервал для периодического обновления диалогов
    const intervalId = setInterval(fetchConversations, UPDATE_INTERVAL);
    
    return () => {
      clearInterval(intervalId);
    };
  }, [fetchConversations]);

  // Эффект для загрузки сообщений при изменении currentUserId
  useEffect(() => {
    if (currentUserId) {
      fetchMessages(currentUserId);
      fetchUserInfo(currentUserId);
      
      // Настраиваем интервал для периодического обновления сообщений
      const intervalId = setInterval(() => fetchMessages(currentUserId), UPDATE_INTERVAL);
      
      return () => {
        clearInterval(intervalId);
      };
    }
  }, [currentUserId, fetchMessages, fetchUserInfo]);

  return {
    conversations,
    currentMessages,
    currentUserId,
    currentUserInfo,
    loading,
    error,
    openChat,
    sendMessage: handleSendMessage,
    deleteMessage: handleDeleteMessage
  };
}; 