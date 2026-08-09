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

export type ChatChannel = string;

export interface ChatParticipant {
  id: number;
  name: string;
  role: string;
  online: boolean;
  source?: 'office' | 'call_center' | 'manual' | 'migration';
  callCenterId?: number | null;
  callCenterName?: string | null;
}

export interface ChatChannelInfo {
  key: string;
  label: string;
  isSystem?: boolean;
  createdBy?: number | null;
  memberCount?: number;
}

export interface ChatCandidate extends ChatParticipant {
  isMember: boolean;
}

export const receptionAPI = {
  getMessages: async (officeId:string,channel:ChatChannel='reception',before?:string):Promise<{messages:Message[];hasMore:boolean}> => {
    const response=await apiInstance.get(`/offices/${officeId}/messages`,{params:{channel,limit:50,before}});
    const data=response.data;
    return Array.isArray(data)?{messages:data,hasMore:false}:{messages:data?.messages||[],hasMore:!!data?.hasMore};
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

  getChannels: async (officeId: string): Promise<{ channels: ChatChannelInfo[]; canManage: boolean }> => {
    const response = await apiInstance.get('/chat/channels', { params: { officeId } });
    return { channels: response.data?.channels || [], canManage: !!response.data?.canManage };
  },

  getParticipants: async (officeId: string, channel: ChatChannel = 'reception'): Promise<{ participants: ChatParticipant[]; canManage: boolean }> => {
    const response = await apiInstance.get('/chat/participants', { params: { officeId, channel } });
    return { participants: response.data?.participants || [], canManage: !!response.data?.canManage };
  },

  getCandidates: async (officeId: string, channel: string): Promise<ChatCandidate[]> => {
    const response = await apiInstance.get('/chat/candidates', { params: { officeId, channel } });
    return response.data?.candidates || [];
  },

  createChannel: async (officeId: string, name: string, memberIds: number[]): Promise<ChatChannelInfo> => {
    const response = await apiInstance.post('/chat/channels', { officeId, name, memberIds });
    return response.data.channel;
  },

  renameChannel: async (officeId: string, channel: string, name: string): Promise<void> => {
    await apiInstance.patch(`/chat/channels/${encodeURIComponent(channel)}`, { officeId, name });
  },

  archiveChannel: async (officeId: string, channel: string): Promise<void> => {
    await apiInstance.delete(`/chat/channels/${encodeURIComponent(channel)}`, { data: { officeId } });
  },

  addMember: async (officeId: string, channel: string, userId: number): Promise<void> => {
    await apiInstance.post('/chat/members', { officeId, channel, userId });
  },

  removeMember: async (officeId: string, channel: string, userId: number): Promise<void> => {
    await apiInstance.delete('/chat/members', { data: { officeId, channel, userId } });
  },

  deleteMessage: async (messageId: string): Promise<void> => {
    await apiInstance.delete(`/messages/${messageId}`);
  },
};
