export interface User {
  id: number;
  name: string;
  email: string;
  userType: string;
  officeId?: string;
  officeName?: string;
  isNewOffice?: boolean;
}

export interface UserState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
} 