import React, { createContext, useContext, useState, useEffect } from 'react';
import { buildApiUrl } from '../shared/utils/apiUtils';

interface Office {
  id: string;
  title: string;
  description: string;
  revenue: number;
  orders: number;
  address?: string;
  employee_count?: number;
  work_phone?: string | null;
  work_phone2?: string | null;
  previousRevenue?: number;
  previousVisits?: number;
  ip_surname?: string;
  ip_name?: string;
  ip_middle_name?: string;
  inn?: string;
  ogrn?: string;
}

interface OfficeContextType {
  currentOffice: Office | null;
  setCurrentOffice: (office: Office | null) => void;
  loading: boolean;
  error: string | null;
  refreshOffice: () => Promise<void>;
}

const OfficeContext = createContext<OfficeContextType | undefined>(undefined);

export const useOffice = () => {
  const context = useContext(OfficeContext);
  if (context === undefined) {
    throw new Error('useOffice must be used within an OfficeProvider');
  }
  return context;
};

export const OfficeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentOffice, setCurrentOffice] = useState<Office | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOfficeData = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Требуется авторизация');
      }

      // Получаем данные профиля пользователя
      const profileResponse = await fetch(buildApiUrl('/profile'), {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!profileResponse.ok) {
        throw new Error('Не удалось получить данные профиля');
      }

      const profileData = await profileResponse.json();
      const officeId = profileData.officeId;

      if (!officeId) {
        throw new Error('Офис не найден');
      }

      // Получаем данные офиса
      const officeResponse = await fetch(buildApiUrl(`/offices/${officeId}`), {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!officeResponse.ok) {
        throw new Error('Не удалось получить данные офиса');
      }

      const officeData = await officeResponse.json();
      setCurrentOffice(officeData);
    } catch (err) {
      console.error('Ошибка при получении данных офиса:', err);
      setError((err as Error).message || 'Не удалось загрузить данные офиса');
      setCurrentOffice(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOfficeData();
  }, []);

  const value = {
    currentOffice,
    setCurrentOffice,
    loading,
    error,
    refreshOffice: fetchOfficeData
  };

  return (
    <OfficeContext.Provider value={value}>
      {children}
    </OfficeContext.Provider>
  );
};