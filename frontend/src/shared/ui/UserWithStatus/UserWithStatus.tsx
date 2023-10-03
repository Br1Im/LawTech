import React from 'react';
import styled from 'styled-components';
import { Avatar } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { UserStatusIndicator } from '../UserStatusIndicator';
import { useUserStatusContext } from '../../lib/context/UserStatusContext';

interface UserWithStatusProps {
  userId: string;
  username: string;
  avatarUrl?: string;
  className?: string;
}

const UserContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const UserInfo = styled.div`
  display: flex;
  flex-direction: column;
`;

const Username = styled.span`
  font-weight: 500;
`;

const StatusContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`;

const StatusText = styled.span`
  font-size: 12px;
  color: #8c8c8c;
`;

export const UserWithStatus: React.FC<UserWithStatusProps> = ({
  userId,
  username,
  avatarUrl,
  className,
}) => {
  const { usersStatus } = useUserStatusContext();
  const userStatus = usersStatus[userId];
  const isOnline = userStatus?.isOnline || false;

  return (
    <UserContainer className={className}>
      <Avatar src={avatarUrl} icon={!avatarUrl && <UserOutlined />} />
      <UserInfo>
        <Username>{username}</Username>
        <StatusContainer>
          <UserStatusIndicator isOnline={isOnline} size="small" />
          <StatusText>{isOnline ? 'В сети' : 'Не в сети'}</StatusText>
        </StatusContainer>
      </UserInfo>
    </UserContainer>
  );
}; 