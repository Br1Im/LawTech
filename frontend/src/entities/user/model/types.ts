export interface User {
  id: number;
  name: string;
  email: string;
  userType: string;
  officeId?: string;
  officeName?: string;
  isNewOffice?: boolean;
  avatar?: string | null;
  firstName?: string;
  lastName?: string;
  phone?: string;
  bio?: string;
}

export interface UserState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
} 