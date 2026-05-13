import { apiInstance } from './instance';

export interface Message {
  id: string;
  text: string;
  sender: string;
  senderRole?: string;
  senderFirstName?: string;
  senderLastName?: string;
  timestamp: string;
  office_id: string;
  isRead: boolean;
  isMine: boolean;
  status: 'sent' | 'delivered' | 'read';
  createdAt: string;
  error?: boolean;
  fileUrl?: string | null;
  fileName?: string | null;
  fileType?: 'image' | 'video' | 'document' | null;
}

export type ChatChannel = 'reception' | 'call_center' | 'cc_internal';

export interface ChatParticipant {
  id: number;
  name: string;
  role: string;
  online: boolean;
}

export const receptionAPI = {
  getMessages: async (officeId: string, channel: ChatChannel = 'reception'): Promise<Message[]> => {
    const response = await apiInstance.get(`/offices/${officeId}/messages`, { params: { channel } });
    return response.data;
  },

  sendMessage: async (officeId: string, text: string, channel: ChatChannel = 'reception', file?: File): Promise<Message> => {
    if (file) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('text', text || '');
      formData.append('channel', channel);
      const response = await apiInstance.post(`/offices/${officeId}/messages`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    }
    const response = await apiInstance.post(`/offices/${officeId}/messages`, { text, channel });
    return response.data;
  },

  markAsRead: async (messageId: string): Promise<void> => {
    await apiInstance.put(`/messages/${messageId}/read`);
  },

  markAllAsRead: async (officeId: string, channel: ChatChannel = 'reception'): Promise<void> => {
    await apiInstance.post(`/offices/${officeId}/messages/read-all`, { channel });
  },

  getUnreadCounts: async (officeId: string): Promise<Record<string, number>> => {
    const response = await apiInstance.get(`/offices/${officeId}/messages/unread`);
    return response.data?.counts || {};
  },

  searchMessages: async (officeId: string, channel: ChatChannel, q: string): Promise<Message[]> => {
    const response = await apiInstance.get(`/offices/${officeId}/messages/search`, { params: { channel, q } });
    return response.data;
  },

  getParticipants: async (officeId: string, channel: ChatChannel = 'reception'): Promise<ChatParticipant[]> => {
    const response = await apiInstance.get('/chat/participants', { params: { officeId, channel } });
    return response.data?.participants || [];
  },

  deleteMessage: async (messageId: string): Promise<void> => {
    await apiInstance.delete(`/messages/${messageId}`);
  },
};
