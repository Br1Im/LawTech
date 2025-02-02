export interface Office {
  id: string;
  name: string;
  address: string;
  contact_phone?: string;
  website?: string;
  ownerId: number;
  createdAt?: string;
}

export interface OfficeState {
  office: Office | null;
  isLoading: boolean;
  error: string | null;
} 