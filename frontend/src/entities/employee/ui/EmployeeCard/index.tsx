import React from 'react';
import styled from '@emotion/styled';
import { FiUser, FiMail, FiBriefcase, FiCalendar } from 'react-icons/fi';
import type { Employee } from '../../model/types';

interface EmployeeCardProps {
  employee: Employee;
  className?: string;
}

const CardContainer = styled.div`
  padding: 20px;
  background-color: var(--color-bg-alt);
  border-radius: 12px;
  border: 1px solid var(--color-accent-light);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  gap: 16px;
`;

const AvatarContainer = styled.div`
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background-color: var(--color-accent);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
`;

const Avatar = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const DefaultAvatar = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 24px;
`;

const InfoContainer = styled.div`
  flex: 1;
`;

const EmployeeName = styled.h3`
  font-size: 18px;
  font-weight: 600;
  color: var(--color-accent);
  margin: 0 0 12px 0;
`;

const InfoList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const InfoItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
`;

const InfoLabel = styled.span`
  color: var(--color-muted);
  display: flex;
  align-items: center;
  gap: 6px;
`;

const InfoValue = styled.span`
  color: var(--color-text);
  font-weight: 500;
`;

const StatusBadge = styled.div<{ status: 'active' | 'pending' | 'rejected' }>`
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  
  ${({ status }) => {
    switch (status) {
      case 'active':
        return `
          background-color: rgba(34, 197, 94, 0.2);
          color: rgb(34, 197, 94);
        `;
      case 'pending':
        return `
          background-color: rgba(234, 179, 8, 0.2);
          color: rgb(234, 179, 8);
        `;
      case 'rejected':
        return `
          background-color: rgba(239, 68, 68, 0.2);
          color: rgb(239, 68, 68);
        `;
      default:
        return '';
    }
  }}
`;

export const EmployeeCard: React.FC<EmployeeCardProps> = ({ employee, className }) => {
  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'Активен';
      case 'pending':
        return 'Ожидает подтверждения';
      case 'rejected':
        return 'Отклонен';
      default:
        return status;
    }
  };
  
  const getRoleText = (role: string) => {
    switch (role) {
      case 'owner':
        return 'Собственник';
      case 'lawyer':
        return 'Юрист';
      case 'expert':
        return 'Эксперт';
      default:
        return role;
    }
  };

  return (
    <CardContainer className={className}>
      <AvatarContainer>
        {employee.avatar ? (
          <Avatar src={employee.avatar} alt={employee.name} />
        ) : (
          <DefaultAvatar>
            <FiUser />
          </DefaultAvatar>
        )}
      </AvatarContainer>
      
      <InfoContainer>
        <EmployeeName>{employee.name}</EmployeeName>
        
        <InfoList>
          <InfoItem>
            <InfoLabel>
              <FiMail size={14} /> Email:
            </InfoLabel>
            <InfoValue>{employee.email}</InfoValue>
          </InfoItem>
          
          <InfoItem>
            <InfoLabel>
              <FiBriefcase size={14} /> Роль:
            </InfoLabel>
            <InfoValue>{getRoleText(employee.role)}</InfoValue>
          </InfoItem>
          
          {employee.joinDate && (
            <InfoItem>
              <InfoLabel>
                <FiCalendar size={14} /> Дата присоединения:
              </InfoLabel>
              <InfoValue>
                {new Date(employee.joinDate).toLocaleDateString('ru-RU')}
              </InfoValue>
            </InfoItem>
          )}
          
          <InfoItem>
            <StatusBadge status={employee.status}>
              {getStatusText(employee.status)}
            </StatusBadge>
          </InfoItem>
        </InfoList>
      </InfoContainer>
    </CardContainer>
  );
};

export default EmployeeCard; 