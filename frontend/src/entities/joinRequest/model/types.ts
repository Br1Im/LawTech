export interface JoinRequest {
  id: number;
  userId: number;
  userName: string;
  userEmail: string;
  officeId: string;
  officeName?: string;
  requestDate: string;
  status: 'pending' | 'approved' | 'rejected';
  role?: string;
}

export interface JoinRequestState {
  requests: JoinRequest[];
  isLoading: boolean;
  error: string | null;
}

export interface JoinRequestUpdateData {
  requestId: number;
  status: 'approved' | 'rejected';
  role?: string;
} 