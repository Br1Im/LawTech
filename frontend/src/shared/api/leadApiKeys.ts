import { apiInstance } from './instance';

export interface LeadApiKey {
  id: number;
  office_id: number;
  provider: string;
  label: string | null;
  api_key_masked: string;
  is_active: number;
  last_verified_at: string | null;
  created_at: string;
}

export interface CreateLeadApiKeyPayload {
  apiKey?: string;
  email?: string;
  password?: string;
  label?: string;
  provider?: string;
}

/**
 * API для управления ключами поставщиков лидов (Правовед) текущего офиса.
 * Активный офис директора передаётся автоматически через X-Office-Id.
 */
const leadApiKeysAPI = {
  list: async (): Promise<LeadApiKey[]> => {
    const { data } = await apiInstance.get('/lead-api-keys');
    return data.data || [];
  },

  create: async (payload: CreateLeadApiKeyPayload) => {
    const { data } = await apiInstance.post('/lead-api-keys', payload);
    return data;
  },

  verify: async (id: number) => {
    const { data } = await apiInstance.post(`/lead-api-keys/${id}/verify`);
    return data;
  },

  toggle: async (id: number, isActive: boolean) => {
    const { data } = await apiInstance.patch(`/lead-api-keys/${id}`, { is_active: isActive });
    return data;
  },

  remove: async (id: number) => {
    const { data } = await apiInstance.delete(`/lead-api-keys/${id}`);
    return data;
  },
};

export default leadApiKeysAPI;
