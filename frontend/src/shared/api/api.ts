import axios from 'axios';
import type { JoinOfficeData, JoinRequestUpdateData } from '../types';
import { API_BASE_URL } from '../config/constants';

// const API_URL = 'http://localhost:5000/api';

const apiInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Добавляем интерцептор для добавления токена к запросам
apiInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const api = {
  auth: {
    login: async (email: string, password: string) => {
      const response = await apiInstance.post('/login', { email, password });
      return response.data;
    },
    register: async (userData: any) => {
      const response = await apiInstance.post('/register', userData);
      return response.data;
    },
  },
  profile: {
    getProfile: async () => {
      const response = await apiInstance.get('/profile');
      return response.data;
    },
    updateProfile: async (profileData: any) => {
      const response = await apiInstance.put('/profile', profileData);
      return response.data;
    },
  },
  office: {
    getOffice: async (officeId?: string) => {
      const url = officeId ? `/offices/${officeId}` : '/offices';
      const response = await apiInstance.get(url);
      return response.data;
    },
    setupOffice: async (officeData: any) => {
      const response = await apiInstance.post('/office', officeData);
      return response.data;
    },
    getEmployeeCount: async (officeId: string) => {
      const response = await apiInstance.get(`/office/employee-count/${officeId}`);
      return response.data;
    },
    getEmployees: async (officeId: string) => {
      const response = await apiInstance.get(`/office/${officeId}/employees`);
      return response.data;
    },
    joinOffice: async (joinData: JoinOfficeData) => {
      const response = await apiInstance.post('/office/join', joinData);
      return response.data;
    },
  },
  joinRequests: {
    getRequests: async (officeId: string) => {
      const response = await apiInstance.get(`/office/${officeId}/join-requests`);
      return response.data;
    },
    getUserRequestStatus: async () => {
      const response = await apiInstance.get('/office/join-request/status');
      return response.data;
    },
    updateRequestStatus: async (updateData: JoinRequestUpdateData) => {
      const response = await apiInstance.put(`/office/join-request/${updateData.requestId}`, {
        status: updateData.status,
        role: updateData.role,
      });
      return response.data;
    },
  },
  employees: {
    getAll: async (officeId: string) => {
      const response = await apiInstance.get(`/office/${officeId}/employees`);
      return response.data;
    },
    getById: async (employeeId: number) => {
      const response = await apiInstance.get(`/employees/${employeeId}`);
      return response.data;
    },
    update: async (employeeId: number, data: any) => {
      const response = await apiInstance.put(`/employees/${employeeId}`, data);
      return response.data;
    },
    remove: async (employeeId: number) => {
      const response = await apiInstance.delete(`/employees/${employeeId}`);
      return response.data;
    },
  },
  sales: {
    addSales: async (salesData: any) => {
      const response = await apiInstance.post('/sales', salesData);
      return response.data;
    },
    getSales: async (officeId: string, params = {}) => {
      const response = await apiInstance.get(`/sales/${officeId}`, { params });
      return response.data;
    },
  },
};

export default api; 