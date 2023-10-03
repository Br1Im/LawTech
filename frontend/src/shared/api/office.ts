import { apiInstance } from './instance';

export interface Office {
  id: string;
  name: string;
  title: string;
  description: string;
  address: string;
  contact_phone: string | null;
  website: string | null;
  online: boolean;
  lastActivity: string;
  employee_count: number;
  revenue: number;
  orders: number;
  data: number[];
}

export interface OfficeData {
  name: string;
  address?: string;
  contact_phone?: string;
  website?: string;
}

/**
 * API для работы с офисами
 */
export const officeAPI = {
  /**
   * Получить список всех офисов
   */
  getAll: async (): Promise<Office[]> => {
    const response = await apiInstance.get('/offices');
    return response.data;
  },

  /**
   * Получить данные офиса по ID
   * @param id ID офиса
   */
  getById: async (id: string): Promise<Office> => {
    const response = await apiInstance.get(`/offices/${id}`);
    return response.data;
  },

  /**
   * Создать новый офис
   * @param data Данные офиса
   */
  create: async (data: OfficeData): Promise<Office> => {
    const response = await apiInstance.post('/offices', data);
    return response.data;
  },

  /**
   * Обновить данные офиса
   * @param id ID офиса
   * @param data Данные офиса
   */
  update: async (id: string, data: OfficeData): Promise<Office> => {
    const response = await apiInstance.put(`/offices/${id}`, data);
    return response.data;
  },

  /**
   * Удалить офис
   * @param id ID офиса
   */
  delete: async (id: string): Promise<void> => {
    await apiInstance.delete(`/offices/${id}`);
  }
}; 