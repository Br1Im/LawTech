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
    // Авто-ретраи для кратковременных сетевых ошибок / перезапусков бэка.
    const MAX_ATTEMPTS = 3;
    let lastError: unknown = null;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const response = await apiInstance.get('/offices', {
          params: { period },
          timeout: 15000,
        });

        if (response.data && response.data.success === false) {
          throw new Error(response.data.message || 'Ошибка получения данных');
        }

        let officesData: unknown;
        if (Array.isArray(response.data)) {
          officesData = response.data;
        } else if (response.data && Array.isArray(response.data.data)) {
          officesData = response.data.data;
        } else {
          officesData = [];
          console.warn('Сервер вернул данные в неожиданном формате', response.data);
        }

        return (officesData as Office[]) || [];
      } catch (error: any) {
        lastError = error;
        const status = error?.response?.status;
        // 401/403 — токен недействителен, ретраи не помогут
        if (status === 401 || status === 403) {
          console.warn('Offices: auth error', status);
          throw error;
        }
        // Для 5xx / network / timeout — пытаемся ещё.
        const isRetriable =
          !status || status >= 500 || error?.code === 'ECONNABORTED' || error?.code === 'ERR_NETWORK';
        if (!isRetriable || attempt === MAX_ATTEMPTS) {
          console.error('Ошибка при получении списка офисов:', error);
          throw error;
        }
        // backoff: 400ms, 1200ms
        await new Promise((r) => setTimeout(r, 400 * attempt * attempt));
      }
    }

    throw lastError || new Error('Ошибка загрузки офисов');
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

// Дополнительные именованные экспорты для предотвращения проблем с минификацией
export const getOfficeById = officeAPI.getById;
export const getAllOffices = officeAPI.getAll;
export const createOffice = officeAPI.create;
export const updateOffice = officeAPI.update;
export const deleteOffice = officeAPI.delete;