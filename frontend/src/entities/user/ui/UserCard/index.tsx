import React from 'react';
import styled from '@emotion/styled';
import { FiUser, FiMail, FiBriefcase, FiHome, FiPhone, FiInfo } from 'react-icons/fi';
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

const UserHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
`;

const Avatar = styled.div<{ $hasImage: boolean }>`
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background-color: ${props => props.$hasImage ? 'transparent' : 'var(--color-accent-light)'};
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  
  svg {
    width: 40px;
    height: 40px;
    color: var(--color-accent);
  }
`;

const UserInfo = styled.div`
  flex: 1;
`;

const UserName = styled.h3`
  font-size: 20px;
  font-weight: 600;
  color: var(--color-accent);
  margin: 0 0 4px 0;
`;

const UserRole = styled.div`
  font-size: 14px;
  color: var(--color-muted);
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

const BioSection = styled.div`
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--color-accent-light);
`;

const BioTitle = styled.h4`
  font-size: 16px;
  font-weight: 600;
  color: var(--color-accent);
  margin: 0 0 8px 0;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const BioText = styled.p`
  margin: 0;
  color: var(--color-text);
  font-size: 14px;
  line-height: 1.5;
`;

export const UserCard: React.FC<UserCardProps> = ({ user, className }) => {
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.name;
  
  return (
    <CardContainer className={className}>
      <UserHeader>
        <Avatar $hasImage={!!user.avatar}>
          {user.avatar ? (
            <img src={user.avatar} alt={`${fullName}'s avatar`} />
          ) : (
            <FiUser size={40} />
          )}
        </Avatar>
        <UserInfo>
          <UserName>{fullName}</UserName>
          <UserRole>{user.userType}</UserRole>
        </UserInfo>
      </UserHeader>
      
      <InfoList>
        <InfoItem>
          <InfoLabel>
            <FiMail size={16} /> Email:
          </InfoLabel>
          <InfoValue>{user.email}</InfoValue>
        </InfoItem>
        
        {user.phone && (
          <InfoItem>
            <InfoLabel>
              <FiPhone size={16} /> Телефон:
            </InfoLabel>
            <InfoValue>{user.phone}</InfoValue>
          </InfoItem>
        )}
        
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
      
      {user.bio && (
        <BioSection>
          <BioTitle>
            <FiInfo size={16} /> О себе
          </BioTitle>
          <BioText>{user.bio}</BioText>
        </BioSection>
      )}
    </CardContainer>
  );
};

export default UserCard; 