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

// CONTRACTS
export interface CrmContract {
  id: number;
  id_client: number;
  id_employee: number;
  office_id?: number | null;
  contract_date?: string | null;
  amount?: number | string | null;
  paid_amount?: number | string | null;
  status?: string | null;
  title?: string | null;
  description?: string | null;
  client_name?: string | null;
  client_phone?: string | null;
  client_email?: string | null;
  employee_name?: string | null;
  // New fields for type 1 / type 2 split
  contract_type?: 'docs' | 'court_rep' | string | null;
  expert_id?: number | null;
  docs_status?: 'pending' | 'ready' | string | null;
  lawyer_full_name?: string | null;
  lawyer_short?: string | null;
  expert_full_name?: string | null;
  expert_short?: string | null;
}

export const contractsApi = {
  list: () => unwrap<CrmContract[]>(apiInstance.get('/contracts')),
  update: (id: number, payload: Partial<CrmContract>) =>
    unwrap<CrmContract>(apiInstance.put(`/contracts/${id}`, payload)),
};

// Зарплата
export interface SalarySettings {
  office_id: number;
  lawyer_percent: number | string;
  lawyer_bonus_threshold: number | string;
  lawyer_bonus_percent: number | string;
  okk_percent: number | string;
  okk_bonus_threshold: number | string;
  okk_bonus_percent: number | string;
  manager_office_percent: number | string;
  representative_percent: number | string;
  admin_shift_rate: number | string;
  expert_per_doc_amount: number | string;
}

export interface EmployeeSalary {
  employee_id: number;
  base_salary: number | string;
  custom_percent?: number | string | null;
  custom_shift_rate?: number | string | null;
  custom_per_doc?: number | string | null;
}

export interface SalaryRow {
  employee_id: number;
  full_name: string;
  position?: string | null;
  role: string | null;
  role_label: string;
  base_salary: number;
  bonus: number;
  bonus_breakdown: { label: string; value: number }[];
  total: number;
  acts_sum_docs?: number;
  acts_count_docs?: number;
  acts_sum_court?: number;
  acts_count_court?: number;
  external?: boolean;
}

export interface SalaryCalcResult {
  office_id: number;
  date_from: string | null;
  date_to: string | null;
  office_cash: number;
  office_expenses?: number;
  office_profit?: number;
  settings: SalarySettings;
  rows: SalaryRow[];
}

export interface ShiftRecord {
  id: number;
  office_id: number;
  employee_id: number;
  shift_date: string;
  note?: string | null;
  employee_full_name?: string | null;
  position?: string | null;
}

export const salaryApi = {
  calculate: (params: { office_id?: number; date_from?: string; date_to?: string }) =>
    unwrap<SalaryCalcResult>(apiInstance.get('/salary', { params })),
  getSettings: (officeId: number) =>
    unwrap<SalarySettings>(apiInstance.get(`/offices/${officeId}/salary-settings`)),
  updateSettings: (officeId: number, payload: Partial<SalarySettings>) =>
    unwrap<SalarySettings>(apiInstance.put(`/offices/${officeId}/salary-settings`, payload)),
  getEmployeeSalary: (employeeId: number) =>
    unwrap<EmployeeSalary>(apiInstance.get(`/employees/${employeeId}/salary`)),
  upsertEmployeeSalary: (employeeId: number, payload: Partial<EmployeeSalary>) =>
    unwrap<EmployeeSalary>(apiInstance.put(`/employees/${employeeId}/salary`, payload)),
  listShifts: (params: { office_id?: number; date_from?: string; date_to?: string; employee_id?: number }) =>
    unwrap<ShiftRecord[]>(apiInstance.get('/shifts', { params })),
  createShift: (payload: { employee_id: number; shift_date: string; note?: string }) =>
    unwrap<{ ok: boolean }>(apiInstance.post('/shifts', payload)),
  removeShift: (id: number) => unwrap<{ id: number }>(apiInstance.delete(`/shifts/${id}`)),
};

// Акты — фиксация выполненных работ по договорам
export interface CrmAct {
  id: number;
  office_id: number;
  contract_id: number;
  act_date: string; // YYYY-MM-DD
  amount: number | string;
  type: 'docs' | 'court_rep' | string;
  responsible_id?: number | null;
  status: 'draft' | 'confirmed' | string;
  description?: string | null;
  confirmed_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  // join'ы
  office_name?: string | null;
  contract_title?: string | null;
  contract_amount?: number | string | null;
  client_id?: number | null;
  client_name?: string | null;
  client_phone?: string | null;
  client_email?: string | null;
  responsible_full_name?: string | null;
}

export interface ActsFilters {
  date_from?: string;
  date_to?: string;
  office_id?: number;
  responsible_id?: number;
  type?: 'docs' | 'court_rep';
  status?: 'draft' | 'confirmed';
  contract_id?: number;
  q?: string;
}

export const actsApi = {
  list: (filters: ActsFilters = {}) =>
    unwrap<CrmAct[]>(apiInstance.get('/acts', { params: filters })),
  get: (id: number) => unwrap<CrmAct>(apiInstance.get(`/acts/${id}`)),
  createForContract: (contractId: number, payload: Partial<CrmAct>) =>
    unwrap<CrmAct>(apiInstance.post(`/contracts/${contractId}/acts`, payload)),
  listForContract: (contractId: number) =>
    unwrap<CrmAct[]>(apiInstance.get(`/contracts/${contractId}/acts`)),
  update: (id: number, payload: Partial<CrmAct>) =>
    unwrap<CrmAct>(apiInstance.put(`/acts/${id}`, payload)),
  confirm: (id: number) => unwrap<CrmAct>(apiInstance.post(`/acts/${id}/confirm`, {})),
  remove: (id: number) => unwrap<{ id: number }>(apiInstance.delete(`/acts/${id}`)),
};

// Документы по договору (.doc/.docx) — хранятся в materials с contract_id
export interface ContractDocument {
  id: number;
  contract_id: number;
  name: string;
  file_url?: string | null;
  mime_type?: string | null;
  size_bytes?: number | null;
  created_at?: string | null;
  created_by?: number | null;
}

export const contractDocsApi = {
  list: (contractId: number) =>
    unwrap<ContractDocument[]>(apiInstance.get(`/contracts/${contractId}/documents`)),
  upload: (contractId: number, file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return unwrap<ContractDocument>(
      apiInstance.post(`/contracts/${contractId}/documents`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    );
  },
  remove: (contractId: number, docId: number) =>
    unwrap<{ id: number; docs_status: string }>(
      apiInstance.delete(`/contracts/${contractId}/documents/${docId}`)
    ),
  downloadUrl: (contractId: number, docId: number) =>
    `/api/contracts/${contractId}/documents/${docId}/download`,
};

// EMPLOYEES
export const employeesApi = {
  list: () => unwrap<CrmEmployee[]>(apiInstance.get('/employees')),
  create: (payload: Partial<CrmEmployee>) => unwrap<CrmEmployee>(apiInstance.post('/employees', payload)),
  update: (id: number, payload: Partial<CrmEmployee>) => unwrap<CrmEmployee>(apiInstance.put(`/employees/${id}`, payload)),
  remove: (id: number) => unwrap<{ id: number }>(apiInstance.delete(`/employees/${id}`)),
};
