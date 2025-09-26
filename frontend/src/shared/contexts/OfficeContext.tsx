import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useOfficeSync } from '../hooks/useOfficeSync';

// Интерфейсы
interface Employee {
  id: string;
  surname: string;
  name: string;
  middle_name: string;
  position: string;
  dailyContracts: number;
  totalRevenue14Days: number;
  periodRevenue: number;
  phone: string;
  pastRevenue: { [key: string]: number };
  closeRate: number;
}

interface Client {
  id: string;
  name: string;
  phone: string;
  email?: string;
  status: string;
  createdAt: string;
}

interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
}

interface Document {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadDate: string;
}

interface OfficeStats {
  visits: number;
  revenue: number;
  orders: number;
  employees: number;
  clients: number;
  expenses: number;
  documents: number;
}

interface Office {
  id: string;
  title: string;
  description: string;
  revenue: number;
  orders: number;
  employees: Employee[];
  clients: Client[];
  expenses: Expense[];
  documents: Document[];
  stats: OfficeStats;
  contracts?: any[]; // Added contracts property
}

// Контекст офиса
interface OfficeContextType {
  selectedOffice: Office | null;
  setSelectedOffice: (office: Office | null) => void;
  addClient: (client: Client) => void;
  addEmployee: (employee: Employee) => void;
  addExpense: (expense: Expense) => void;
  addDocument: (document: Document) => void;
  updateStats: (stats: Partial<OfficeStats>) => void;
  updateOffice: (updates: Partial<Office>) => void;
}

const OfficeContext = createContext<OfficeContextType | undefined>(undefined);

// Провайдер контекста
export const OfficeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [selectedOffice, setSelectedOfficeState] = useState<Office | null>(null);
  const { broadcast, subscribe } = useOfficeSync();

  // Подписка на события синхронизации
  useEffect(() => {
    const unsubscribers = [
      subscribe('office_selected', (office: Office) => {
        setSelectedOfficeState(office);
      }),
      
      subscribe('client_added', ({ officeId, client }: { officeId: string, client: Client }) => {
        if (selectedOffice?.id === officeId) {
          setSelectedOfficeState(prev => prev ? {
            ...prev,
            clients: [...prev.clients, client],
            stats: {
              ...prev.stats,
              clients: prev.stats.clients + 1,
              visits: prev.stats.visits + 1
            }
          } : null);
        }
      }),
      
      subscribe('employee_added', ({ officeId, employee }: { officeId: string, employee: Employee }) => {
        if (selectedOffice?.id === officeId) {
          setSelectedOfficeState(prev => prev ? {
            ...prev,
            employees: [...prev.employees, employee],
            stats: {
              ...prev.stats,
              employees: prev.stats.employees + 1
            }
          } : null);
        }
      }),
      
      subscribe('expense_added', ({ officeId, expense }: { officeId: string, expense: Expense }) => {
        if (selectedOffice?.id === officeId) {
          setSelectedOfficeState(prev => prev ? {
            ...prev,
            expenses: [...prev.expenses, expense],
            stats: {
              ...prev.stats,
              expenses: prev.stats.expenses + expense.amount
            }
          } : null);
        }
      }),
      
      subscribe('document_added', ({ officeId, document }: { officeId: string, document: Document }) => {
        if (selectedOffice?.id === officeId) {
          setSelectedOfficeState(prev => prev ? {
            ...prev,
            documents: [...prev.documents, document],
            stats: {
              ...prev.stats,
              documents: prev.stats.documents + 1
            }
          } : null);
        }
      }),
      
      subscribe('stats_updated', ({ officeId, stats }: { officeId: string, stats: Partial<OfficeStats> }) => {
        if (selectedOffice?.id === officeId) {
          setSelectedOfficeState(prev => prev ? {
            ...prev,
            stats: { ...prev.stats, ...stats }
          } : null);
        }
      }),
      
      subscribe('office_updated', ({ officeId, updates }: { officeId: string, updates: Partial<Office> }) => {
        if (selectedOffice?.id === officeId) {
          setSelectedOfficeState(prev => prev ? { ...prev, ...updates } : null);
        }
      })
    ];

    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }, [subscribe, selectedOffice?.id]);

  // Функции для обновления данных
  const setSelectedOffice = (office: Office | null) => {
    setSelectedOfficeState(office);
    if (office) {
      broadcast('office_selected', office.id, office);
    }
  };

  const addClient = (client: Client) => {
    if (selectedOffice) {
      broadcast('client_added', selectedOffice.id, { officeId: selectedOffice.id, client });
    }
  };

  const addEmployee = (employee: Employee) => {
    if (selectedOffice) {
      broadcast('employee_added', selectedOffice.id, { officeId: selectedOffice.id, employee });
    }
  };

  const addExpense = (expense: Expense) => {
    if (selectedOffice) {
      broadcast('expense_added', selectedOffice.id, { officeId: selectedOffice.id, expense });
    }
  };

  const addDocument = (document: Document) => {
    if (selectedOffice) {
      broadcast('document_added', selectedOffice.id, { officeId: selectedOffice.id, document });
    }
  };

  const updateStats = (stats: Partial<OfficeStats>) => {
    if (selectedOffice) {
      broadcast('stats_updated', selectedOffice.id, { officeId: selectedOffice.id, stats });
    }
  };

  const updateOffice = (updates: Partial<Office>) => {
    if (selectedOffice) {
      broadcast('office_updated', selectedOffice.id, { officeId: selectedOffice.id, updates });
    }
  };

  return (
    <OfficeContext.Provider value={{
      selectedOffice,
      setSelectedOffice,
      addClient,
      addEmployee,
      addExpense,
      addDocument,
      updateStats,
      updateOffice
    }}>
      {children}
    </OfficeContext.Provider>
  );
};

// Хук для использования контекста
export const useOffice = () => {
  const context = useContext(OfficeContext);
  if (context === undefined) {
    throw new Error('useOffice must be used within an OfficeProvider');
  }
  return context;
};