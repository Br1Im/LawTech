import { useEffect, useState } from 'react';
import { apiInstance } from '../../api/instance';

export interface AuthUser {
  id: number;
  email: string;
  role?: string;
  position?: string | null;
  office_id?: number | null;
  officeId?: number | null;
  first_name?: string;
  last_name?: string;
  username?: string;
  name?: string;
  surname?: string;
}

interface UseAuthResult {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  refreshUser: () => Promise<void>;
}

const getStoredUser = (): AuthUser | null => {
  try {
    const rawUser = localStorage.getItem('user');
    if (rawUser) {
      const parsed = JSON.parse(rawUser) as AuthUser;
      if (parsed && parsed.role) {
        return parsed;
      }
    }

    const token = localStorage.getItem('token');
    if (!token) {
      return null;
    }

    const payload = JSON.parse(atob(token.split('.')[1])) as AuthUser;
    return payload;
  } catch (error) {
    console.error('Failed to read auth data:', error);
    return null;
  }
};

export const useAuth = (): UseAuthResult => {
  const [token] = useState<string | null>(() => localStorage.getItem('token'));
  const [user, setUser] = useState<AuthUser | null>(() => getStoredUser());
  const [loading, setLoading] = useState<boolean>(Boolean(token) && !getStoredUser());

  const refreshUser = async () => {
    const currentToken = localStorage.getItem('token');
    if (!currentToken) {
      setUser(null);
      return;
    }

    setLoading(true);
    try {
      const response = await apiInstance.get('/auth/me');
      const responseUser = response.data?.user ?? null;
      if (responseUser) {
        const normalizedUser: AuthUser = {
          ...responseUser,
          office_id: responseUser.office_id ?? responseUser.officeId ?? null,
          officeId: responseUser.officeId ?? responseUser.office_id ?? null,
          username:
            responseUser.username ||
            [responseUser.first_name, responseUser.last_name].filter(Boolean).join(' ').trim(),
          name: responseUser.name || responseUser.first_name,
          surname: responseUser.surname || responseUser.last_name
        };
        localStorage.setItem('user', JSON.stringify(normalizedUser));
        setUser(normalizedUser);
      }
    } catch (error) {
      console.error('Failed to refresh current user:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    if (!user) {
      refreshUser();
      return;
    }

    setLoading(false);
  }, [token]);

  return {
    user,
    token,
    isAuthenticated: Boolean(token),
    loading,
    refreshUser
  };
};

export default useAuth;
