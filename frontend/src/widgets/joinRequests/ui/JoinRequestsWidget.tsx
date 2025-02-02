import React, { useEffect, useState } from 'react';
import styled from '@emotion/styled';
import { FiUsers, FiAlertCircle } from 'react-icons/fi';
import JoinRequestCard from '../../../entities/joinRequest/ui/JoinRequestCard';
import api from '../../../shared/api/api';
import type { JoinRequest } from '../../../entities/joinRequest/model/types';

interface JoinRequestsWidgetProps {
  officeId: string;
  className?: string;
}

const Container = styled.div`
  width: 100%;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
`;

const Title = styled.h2`
  font-size: 24px;
  font-weight: 600;
  color: var(--color-accent);
  margin: 0;
`;

const RequestsCount = styled.span`
  background-color: var(--color-accent);
  color: white;
  border-radius: 16px;
  padding: 4px 12px;
  font-size: 14px;
  font-weight: 500;
`;

const RequestsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 40px 0;
  color: var(--color-muted);
`;

const ErrorState = styled.div`
  text-align: center;
  padding: 40px 0;
  color: var(--color-error);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
`;

const ErrorIcon = styled.div`
  font-size: 32px;
  color: var(--color-error);
`;

export const JoinRequestsWidget: React.FC<JoinRequestsWidgetProps> = ({ 
  officeId,
  className 
}) => {
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const fetchRequests = async () => {
    try {
      setLoading(true);
      const response = await api.joinRequests.getRequests(officeId);
      setRequests(response.requests);
      setError(null);
    } catch (err) {
      setError('Не удалось загрузить заявки на присоединение');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchRequests();
    
    // Обновляем список заявок каждую минуту
    const intervalId = setInterval(fetchRequests, 60000);
    
    return () => clearInterval(intervalId);
  }, [officeId]);
  
  const handleApprove = async (requestId: number, role: string) => {
    try {
      await api.joinRequests.updateRequestStatus({
        requestId,
        status: 'approved',
        role
      });
      
      // Обновляем список заявок
      fetchRequests();
    } catch (err) {
      setError('Не удалось обработать заявку');
      console.error(err);
    }
  };
  
  const handleReject = async (requestId: number) => {
    try {
      await api.joinRequests.updateRequestStatus({
        requestId,
        status: 'rejected'
      });
      
      // Обновляем список заявок
      fetchRequests();
    } catch (err) {
      setError('Не удалось обработать заявку');
      console.error(err);
    }
  };
  
  if (loading) {
    return (
      <Container className={className}>
        <Header>
          <Title>Заявки на присоединение</Title>
        </Header>
        <div>Загрузка...</div>
      </Container>
    );
  }
  
  if (error) {
    return (
      <Container className={className}>
        <Header>
          <Title>Заявки на присоединение</Title>
        </Header>
        <ErrorState>
          <ErrorIcon>
            <FiAlertCircle />
          </ErrorIcon>
          {error}
        </ErrorState>
      </Container>
    );
  }
  
  // Фильтруем только заявки со статусом "pending"
  const pendingRequests = requests.filter(request => request.status === 'pending');

  return (
    <Container className={className}>
      <Header>
        <Title>Заявки на присоединение</Title>
        {pendingRequests.length > 0 && (
          <RequestsCount>{pendingRequests.length}</RequestsCount>
        )}
      </Header>
      
      {pendingRequests.length === 0 ? (
        <EmptyState>
          <FiUsers size={40} />
          <p>Нет новых заявок на присоединение к офису</p>
        </EmptyState>
      ) : (
        <RequestsList>
          {pendingRequests.map(request => (
            <JoinRequestCard
              key={request.id}
              request={request}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          ))}
        </RequestsList>
      )}
    </Container>
  );
};

export default JoinRequestsWidget; 