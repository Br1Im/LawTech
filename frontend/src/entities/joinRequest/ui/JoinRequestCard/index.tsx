import React, { useState } from 'react';
import styled from '@emotion/styled';
import { FiUser, FiMail, FiCalendar, FiCheckCircle, FiXCircle } from 'react-icons/fi';
import type { JoinRequest } from '../../model/types';

interface JoinRequestCardProps {
  request: JoinRequest;
  onApprove: (requestId: number, role: string) => void;
  onReject: (requestId: number) => void;
  className?: string;
}

const CardContainer = styled.div`
  padding: 20px;
  background-color: var(--color-bg-alt);
  border-radius: 12px;
  border: 1px solid var(--color-accent-light);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
`;

const RequestHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
`;

const UserName = styled.h3`
  font-size: 18px;
  font-weight: 600;
  color: var(--color-accent);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const RequestDate = styled.div`
  font-size: 14px;
  color: var(--color-muted);
  display: flex;
  align-items: center;
  gap: 6px;
`;

const InfoList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
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
  min-width: 80px;
`;

const InfoValue = styled.span`
  color: var(--color-text);
  font-weight: 500;
`;

const ActionContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const RoleSelectContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const RoleLabel = styled.label`
  font-size: 14px;
  color: var(--color-muted);
  min-width: 80px;
`;

const RoleSelect = styled.select`
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid var(--color-accent-light);
  background-color: var(--color-bg);
  color: var(--color-text);
  font-size: 14px;
  flex: 1;
`;

const ButtonsContainer = styled.div`
  display: flex;
  gap: 12px;
`;

const Button = styled.button<{ variant: 'approve' | 'reject' }>`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: 8px;
  font-weight: 500;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  flex: 1;
  
  ${({ variant }) => 
    variant === 'approve' 
      ? `
        background-color: rgba(34, 197, 94, 0.2);
        color: rgb(34, 197, 94);
        border: 1px solid rgb(34, 197, 94);
        
        &:hover {
          background-color: rgba(34, 197, 94, 0.3);
        }
      `
      : `
        background-color: rgba(239, 68, 68, 0.2);
        color: rgb(239, 68, 68);
        border: 1px solid rgb(239, 68, 68);
        
        &:hover {
          background-color: rgba(239, 68, 68, 0.3);
        }
      `
  }
`;

export const JoinRequestCard: React.FC<JoinRequestCardProps> = ({
  request,
  onApprove,
  onReject,
  className,
}) => {
  const [selectedRole, setSelectedRole] = useState(request.role || 'lawyer');
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU');
  };

  return (
    <CardContainer className={className}>
      <RequestHeader>
        <UserName>
          <FiUser size={18} />
          {request.userName}
        </UserName>
        <RequestDate>
          <FiCalendar size={14} />
          {formatDate(request.requestDate)}
        </RequestDate>
      </RequestHeader>
      
      <InfoList>
        <InfoItem>
          <InfoLabel>
            <FiMail size={14} /> Email:
          </InfoLabel>
          <InfoValue>{request.userEmail}</InfoValue>
        </InfoItem>
      </InfoList>
      
      <ActionContainer>
        <RoleSelectContainer>
          <RoleLabel>Роль:</RoleLabel>
          <RoleSelect 
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
          >
            <option value="lawyer">Юрист</option>
            <option value="expert">Эксперт</option>
            <option value="assistant">Ассистент</option>
          </RoleSelect>
        </RoleSelectContainer>
        
        <ButtonsContainer>
          <Button 
            variant="approve"
            onClick={() => onApprove(request.id, selectedRole)}
          >
            <FiCheckCircle size={16} />
            Принять
          </Button>
          <Button 
            variant="reject"
            onClick={() => onReject(request.id)}
          >
            <FiXCircle size={16} />
            Отклонить
          </Button>
        </ButtonsContainer>
      </ActionContainer>
    </CardContainer>
  );
};

export default JoinRequestCard; 