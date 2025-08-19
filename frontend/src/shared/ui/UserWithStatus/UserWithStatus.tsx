import React from 'react';
import styled from '@emotion/styled';
import { UserStatusIndicator } from '../UserStatusIndicator';
import { useUserStatus } from '../../lib/hooks/useUserStatus';

interface User {
  id: number;
  name: string;
  avatarUrl?: string;
}

interface UserWithStatusProps {
  user: User;
  size?: 'small' | 'medium' | 'large';
  showAvatar?: boolean;
  showStatus?: boolean;
}

const UserContainer = styled.div<{ size: string }>`
  display: flex;
  align-items: center;
  padding: ${props => (props.size === 'small' ? '4px 8px' : props.size === 'medium' ? '8px 12px' : '12px 16px')};
  border-radius: 4px;
  transition: background-color 0.2s;
  
  &:hover {
    background-color: #f5f5f5;
  }
`;

const UserAvatar = styled.div<{ size: string }>`
  width: ${props => (props.size === 'small' ? '30px' : props.size === 'medium' ? '40px' : '50px')};
  height: ${props => (props.size === 'small' ? '30px' : props.size === 'medium' ? '40px' : '50px')};
  border-radius: 50%;
  overflow: hidden;
  margin-right: 12px;
  background-color: #e0e0e0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 500;
  color: #757575;
`;

const UserImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const UserInfo = styled.div`
  flex: 1;
`;

const UserName = styled.div<{ size: string }>`
  font-weight: 500;
  font-size: ${props => (props.size === 'small' ? '14px' : props.size === 'medium' ? '16px' : '18px')};
  margin-bottom: 4px;
`;

export const UserWithStatus: React.FC<UserWithStatusProps> = ({
  user,
  size = 'medium',
  showAvatar = true,
  showStatus = true,
}) => {
  const { isOnline, lastActive } = useUserStatus({ userId: user.id });
  
  // Получаем инициалы из имени для отображения в аватаре (если нет URL)
  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <UserContainer size={size}>
      {showAvatar && (
        <UserAvatar size={size}>
          {user.avatarUrl ? (
            <UserImage src={user.avatarUrl} alt={user.name} />
          ) : (
            getInitials(user.name)
          )}
        </UserAvatar>
      )}
      
      <UserInfo>
        <UserName size={size}>{user.name}</UserName>
        {showStatus && <UserStatusIndicator isOnline={isOnline} lastActive={lastActive ? lastActive : undefined} size={size} />}
      </UserInfo>
    </UserContainer>
  );
}; 