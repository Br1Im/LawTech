import React from 'react';
import styled from '@emotion/styled';
import { FiUser, FiMail, FiBriefcase, FiHome } from 'react-icons/fi';
import type { User } from '../../model/types';

interface UserCardProps {
  user: User;
  className?: string;
}

const CardContainer = styled.div`
  padding: 20px;
  background-color: var(--color-bg-alt);
  border-radius: 12px;
  border: 1px solid var(--color-accent-light);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
`;

const UserName = styled.h3`
  font-size: 20px;
  font-weight: 600;
  color: var(--color-accent);
  margin: 0 0 16px 0;
  display: flex;
  align-items: center;
  gap: 10px;
`;

const InfoList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const InfoItem = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const InfoLabel = styled.span`
  color: var(--color-muted);
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 120px;
`;

const InfoValue = styled.span`
  color: var(--color-text);
  font-weight: 500;
`;

export const UserCard: React.FC<UserCardProps> = ({ user, className }) => {
  return (
    <CardContainer className={className}>
      <UserName>
        <FiUser size={20} />
        {user.name}
      </UserName>
      
      <InfoList>
        <InfoItem>
          <InfoLabel>
            <FiMail size={16} /> Email:
          </InfoLabel>
          <InfoValue>{user.email}</InfoValue>
        </InfoItem>
        
        <InfoItem>
          <InfoLabel>
            <FiBriefcase size={16} /> Роль:
          </InfoLabel>
          <InfoValue>{user.userType}</InfoValue>
        </InfoItem>
        
        {user.officeName && (
          <InfoItem>
            <InfoLabel>
              <FiHome size={16} /> Офис:
            </InfoLabel>
            <InfoValue>{user.officeName}</InfoValue>
          </InfoItem>
        )}
      </InfoList>
    </CardContainer>
  );
};

export default UserCard; 