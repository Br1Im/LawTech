import React from 'react';
import styled from 'styled-components';
import { Tooltip } from 'antd';

interface UserStatusIndicatorProps {
  isOnline: boolean;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

const sizeMap = {
  small: 8,
  medium: 10,
  large: 12,
};

const StatusDot = styled.span<{ $isOnline: boolean; $size: number }>`
  width: ${props => props.$size}px;
  height: ${props => props.$size}px;
  border-radius: 50%;
  background-color: ${props => (props.$isOnline ? '#52c41a' : '#d9d9d9')};
  transition: background-color 0.3s ease;
  display: inline-block;
`;

export const UserStatusIndicator: React.FC<UserStatusIndicatorProps> = ({
  isOnline,
  size = 'medium',
  className,
}) => {
  const tooltipText = isOnline ? 'В сети' : 'Не в сети';
  const dotSize = sizeMap[size];

  return (
    <Tooltip title={tooltipText}>
      <StatusDot $isOnline={isOnline} $size={dotSize} className={className} />
    </Tooltip>
  );
}; 