import { apiInstance } from './instance';
import { authAPI } from './auth';
import { chatAPI } from './chat';
import { officeAPI } from './office';
import { receptionAPI } from './reception';

export const api = {
  auth: authAPI,
  chat: chatAPI,
  office: officeAPI,
  reception: receptionAPI
};

export default api;
export { apiInstance }; 