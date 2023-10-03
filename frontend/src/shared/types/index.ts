import React from 'react';
import type { IconType } from 'react-icons';

/**
 * Общие типы для приложения
 */

export type UserRole = 'admin' | 'user';

export interface User {
  id: number;
  username: string;
  role: UserRole;
}

/**
 * Тип для элемента навигации
 */
export interface NavItem {
  title: string;
  path: string;
  icon?: IconType;
}

/**
 * Тип сообщения в чате
 */
export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

/**
 * Типы для графиков
 */
export interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

export interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor?: string | string[];
  borderColor?: string;
  borderWidth?: number;
}

// Auth types
export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  userType: string;
  officeType?: string;
  isNewOffice?: boolean;
}

export interface AuthResponse {
  message: string;
  token: string;
  user: User;
}

// Profile types
export interface ProfileUpdateData {
  name?: string;
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  bio?: string;
}

export interface AvatarUploadResponse {
  message: string;
  user: User;
}

// Office types
export interface Office {
  id: string;
  name: string;
  address: string;
  contact_phone?: string;
  website?: string;
  ownerId: number;
}

export interface OfficeSetupData {
  officeName: string;
  officeAddress: string;
  contactPhone?: string;
  website?: string;
}

// Join Office Request
export interface JoinOfficeRequest {
  id: number;
  userId: number;
  userName: string;
  userEmail: string;
  officeId: string;
  requestDate: string;
  status: 'pending' | 'approved' | 'rejected';
  role?: string;
}

export interface JoinOfficeData {
  officeId: string;
  role?: string;
}

export interface JoinRequestUpdateData {
  requestId: number;
  status: 'approved' | 'rejected';
  role?: string;
}

// Employee types
export interface Employee {
  id: number;
  name: string;
  position?: string;
  office?: string;
  avatar?: string;
  email?: string;
  role: string;
  status: 'active' | 'pending' | 'rejected';
  joinDate?: string;
}

// Sales types
export interface SalesData {
  officeId: string;
  amount: number;
  periodType: 'daily' | 'weekly' | 'monthly';
  periodDate: string;
}

export interface SalesFilters {
  periodType?: 'daily' | 'weekly' | 'monthly';
  startDate?: string;
  endDate?: string;
}

export interface SalesEntry {
  amount: number;
  period_type: 'daily' | 'weekly' | 'monthly';
  period_date: string;
} 