import { apiInstance } from './instance';

export interface CrmClient {
  id: number;
  name: string;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  notes?: string | null;
  status?: string | null;
  office_id?: number | null;
  contracts_count?: number;
  total_spent?: string | number;
  created_at?: string;
}

export interface CrmCase {
  id: number;
  office_id: number;
  client_id: number | null;
  employee_id: number | null;
  title: string;
  case_number: string | null;
  category: string | null;
  status: 'new' | 'in_progress' | 'waiting' | 'won' | 'lost' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  description?: string | null;
  start_date?: string | null;
  deadline?: string | null;
  client_name?: string | null;
  employee_name?: string | null;
}

export interface CrmExpense {
  id: number;
  office_id: number;
  category: string;
  amount: number | string;
  title: string;
  description?: string | null;
  spent_on: string;
  created_by_name?: string | null;
}

export interface CrmArrival {
  id: number;
  office_id: number;
  source: string;
  amount: number | string;
  title: string;
  description?: string | null;
  client_id?: number | null;
  contract_id?: number | null;
  received_on: string;
  client_name?: string | null;
  created_by_name?: string | null;
}

export interface CrmMaterial {
  id: number;
  office_id: number;
  name: string;
  category: string;
  description?: string | null;
  file_url?: string | null;
  case_id?: number | null;
  contract_id?: number | null;
  case_title?: string | null;
  created_at?: string;
}

export interface CrmEmployee {
  id: number;
  first_name: string;
  last_name: string;
  email?: string | null;
  phone?: string | null;
  position?: string | null;
  office_id?: number | null;
  user_role?: string | null;
}

type Envelope<T> = { success: boolean; data: T; message?: string };

async function unwrap<T>(p: Promise<{ data: Envelope<T> | T }>): Promise<T> {
  const { data } = await p;
  if (data && typeof data === 'object' && 'success' in (data as any) && 'data' in (data as any)) {
    return (data as Envelope<T>).data;
  }
  return data as T;
}

// CLIENTS
export const clientsApi = {
  list: () => unwrap<CrmClient[]>(apiInstance.get('/clients')),
  search: (q: string) => unwrap<CrmClient[]>(apiInstance.get('/clients/search', { params: { q } })),
  getById: (id: number) => unwrap<CrmClient>(apiInstance.get(`/clients/${id}`)),
  create: (payload: Partial<CrmClient>) => unwrap<CrmClient>(apiInstance.post('/clients', payload)),
  update: (id: number, payload: Partial<CrmClient>) => unwrap<CrmClient>(apiInstance.put(`/clients/${id}`, payload)),
  remove: (id: number) => unwrap<{ id: number }>(apiInstance.delete(`/clients/${id}`)),
};

// CASES
export const casesApi = {
  list: () => unwrap<CrmCase[]>(apiInstance.get('/cases')),
  create: (payload: Partial<CrmCase>) => unwrap<CrmCase>(apiInstance.post('/cases', payload)),
  update: (id: number, payload: Partial<CrmCase>) => unwrap<CrmCase>(apiInstance.put(`/cases/${id}`, payload)),
  remove: (id: number) => unwrap<{ id: number }>(apiInstance.delete(`/cases/${id}`)),
};

// EXPENSES
export const expensesApi = {
  list: () => unwrap<CrmExpense[]>(apiInstance.get('/expenses')),
  create: (payload: Partial<CrmExpense>) => unwrap<CrmExpense>(apiInstance.post('/expenses', payload)),
  update: (id: number, payload: Partial<CrmExpense>) => unwrap<CrmExpense>(apiInstance.put(`/expenses/${id}`, payload)),
  remove: (id: number) => unwrap<{ id: number }>(apiInstance.delete(`/expenses/${id}`)),
};

// ARRIVALS
export const arrivalsApi = {
  list: () => unwrap<CrmArrival[]>(apiInstance.get('/arrivals')),
  create: (payload: Partial<CrmArrival>) => unwrap<CrmArrival>(apiInstance.post('/arrivals', payload)),
  update: (id: number, payload: Partial<CrmArrival>) => unwrap<CrmArrival>(apiInstance.put(`/arrivals/${id}`, payload)),
  remove: (id: number) => unwrap<{ id: number }>(apiInstance.delete(`/arrivals/${id}`)),
};

// MATERIALS
export const materialsApi = {
  list: () => unwrap<CrmMaterial[]>(apiInstance.get('/materials')),
  create: (payload: Partial<CrmMaterial>) => unwrap<CrmMaterial>(apiInstance.post('/materials', payload)),
  update: (id: number, payload: Partial<CrmMaterial>) => unwrap<CrmMaterial>(apiInstance.put(`/materials/${id}`, payload)),
  remove: (id: number) => unwrap<{ id: number }>(apiInstance.delete(`/materials/${id}`)),
};

// EMPLOYEES
export const employeesApi = {
  list: () => unwrap<CrmEmployee[]>(apiInstance.get('/employees')),
  create: (payload: Partial<CrmEmployee>) => unwrap<CrmEmployee>(apiInstance.post('/employees', payload)),
  update: (id: number, payload: Partial<CrmEmployee>) => unwrap<CrmEmployee>(apiInstance.put(`/employees/${id}`, payload)),
  remove: (id: number) => unwrap<{ id: number }>(apiInstance.delete(`/employees/${id}`)),
};
