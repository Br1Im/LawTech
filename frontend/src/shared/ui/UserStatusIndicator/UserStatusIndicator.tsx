import React from 'react';
import styled from '@emotion/styled';

interface UserStatusIndicatorProps {
  isOnline: boolean;
  lastActive?: Date;
  size?: 'small' | 'medium' | 'large';
  showText?: boolean;
}

const StatusDot = styled.span<{ isOnline: boolean; size: string }>`
  display: inline-block;
  width: ${props => (props.size === 'small' ? '8px' : props.size === 'medium' ? '12px' : '16px')};
  height: ${props => (props.size === 'small' ? '8px' : props.size === 'medium' ? '12px' : '16px')};
  border-radius: 50%;
  background-color: ${props => (props.isOnline ? '#4CAF50' : '#bdbdbd')};
  margin-right: ${props => (props.size === 'small' ? '4px' : '6px')};
`;

const StatusContainer = styled.div`
  display: flex;
  align-items: center;
  font-size: 14px;
`;

const StatusText = styled.span<{ isOnline: boolean }>`
  color: ${props => (props.isOnline ? '#4CAF50' : '#757575')};
`;

const LastActiveText = styled.span`
  font-size: 12px;
  color: #757575;
  margin-left: 8px;
`;

export const UserStatusIndicator: React.FC<UserStatusIndicatorProps> = ({
  isOnline,
  lastActive,
  size = 'medium',
  showText = true,
}) => {
  // Функция для форматирования времени последней активности
  const formatLastActive = (date: Date): string => {
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000); // разница в секундах

    if (diff < 60) {
      return 'только что';
    } else if (diff < 3600) {
      const minutes = Math.floor(diff / 60);
      return `${minutes} ${minutes === 1 ? 'минуту' : minutes < 5 ? 'минуты' : 'минут'} назад`;
    } else if (diff < 86400) {
      const hours = Math.floor(diff / 3600);
      return `${hours} ${hours === 1 ? 'час' : hours < 5 ? 'часа' : 'часов'} назад`;
    } else {
      return `${date.toLocaleString()}`;
    }
  };

  return (
    <StatusContainer>
      <StatusDot isOnline={isOnline} size={size} />
      
      {showText && (
        <>
          <StatusText isOnline={isOnline}>
            {isOnline ? 'В сети' : 'Не в сети'}
          </StatusText>
          
          {!isOnline && lastActive && (
            <LastActiveText>
              (был в сети {formatLastActive(lastActive)})
            </LastActiveText>
          )}
        </>
      )}
    </StatusContainer>
  );
}; 