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
const officeAPI = {
  /**
   * Получить список всех офисов
   */
  getAll: async (period: string = 'day'): Promise<Office[]> => {
    try {
      // Используем правильный путь к API с параметром period
      const response = await apiInstance.get('/offices', {
        params: { period }
      });
      
      // Обрабатываем ответ от бэкенда, который должен быть в формате {success: true, data: []}
      if (response.data && response.data.success === false) {
        throw new Error(response.data.message || 'Ошибка получения данных');
      }
      
      // Проверяем формат ответа и извлекаем данные
      let officesData;
      if (Array.isArray(response.data)) {
        officesData = response.data;
      } else if (response.data && response.data.success && Array.isArray(response.data.data)) {
        officesData = response.data.data;
      } else if (response.data && typeof response.data === 'object' && 'data' in response.data) {
        officesData = response.data.data;
      } else {
        officesData = [];
        console.warn('Сервер вернул данные в неожиданном формате');
      }
      
      // Проверяем, не пустой ли список офисов
      if (!officesData || officesData.length === 0) {
        console.warn('Сервер вернул пустой список офисов');
      }
      
      return officesData;
    } catch (error) {
      console.error('Ошибка при получении списка офисов:', error);
      throw new Error('Ошибка загрузки офисов');
    }
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

// Экспортируем API
export { officeAPI };
export default officeAPI;