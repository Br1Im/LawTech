import { useCallback } from 'react';
import { getOfficeById } from '../../api/office';

/**
 * Хук для загрузки данных офиса пользователя
 */
export const useOfficeLoader = () => {

  /**
   * Загружает данные офиса по ID и возвращает их
   * @param officeId ID офиса пользователя
   */
  const loadUserOffice = useCallback(async (officeId: number | string) => {
    try {
      if (!officeId) {
        console.warn('Office ID не предоставлен');
        return null;
      }

      console.log('Загружаем данные офиса:', officeId);
      const officeData = await getOfficeById(String(officeId));
      
      // Преобразуем данные офиса в формат, ожидаемый OfficeContext
      const transformedOffice = {
        id: officeData.id,
        title: officeData.name || officeData.title,
        description: officeData.description || '',
        revenue: officeData.revenue || 0,
        orders: officeData.orders || 0,
        employees: [],
        clients: [],
        expenses: [],
        documents: [],
        contracts: [],
        stats: {
          visits: 0,
          revenue: officeData.revenue || 0,
          orders: officeData.orders || 0,
          employees: officeData.employee_count || 0,
          clients: 0,
          expenses: 0,
          documents: 0
        }
      };

      console.log('Данные офиса загружены:', transformedOffice);
      
      return transformedOffice;
    } catch (error) {
      console.error('Ошибка при загрузке данных офиса:', error);
      return null;
    }
  }, []);

  return {
    loadUserOffice
  };
};