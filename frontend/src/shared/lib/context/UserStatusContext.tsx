import React, { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { useUserStatus } from '../hooks/useUserStatus';
import type { UserStatusMap } from '../../api/userStatus';

interface UserStatusContextType {
  usersStatus: UserStatusMap;
  loading: boolean;
  error: string | null;
}

const UserStatusContext = createContext<UserStatusContextType | undefined>(undefined);

interface UserStatusProviderProps {
  children: ReactNode;
}

export const UserStatusProvider: React.FC<UserStatusProviderProps> = ({ children }) => {
  const statusData = useUserStatus();
  
  return (
    <UserStatusContext.Provider value={statusData}>
      {children}
    </UserStatusContext.Provider>
  );
};

export const useUserStatusContext = (): UserStatusContextType => {
  const context = useContext(UserStatusContext);
  
  if (context === undefined) {
    throw new Error('useUserStatusContext must be used within a UserStatusProvider');
  }
  
  return context;
}; 