export interface Employee {
  id: number;
  name: string;
  email: string;
  role: string; // Owner, Lawyer, Expert и т.д.
  status: 'active' | 'pending' | 'rejected';
  position?: string;
  avatar?: string;
  officeId: string;
  officeName?: string;
  joinDate?: string;
}

export interface EmployeeState {
  employee: Employee | null;
  isLoading: boolean;
  error: string | null;
}

export interface JoinRequest {
  id: number;
  userId: number;
  userName: string;
  userEmail: string;
  officeId: string;
  requestDate: string;
  status: 'pending' | 'approved' | 'rejected';
  role?: string;
} 