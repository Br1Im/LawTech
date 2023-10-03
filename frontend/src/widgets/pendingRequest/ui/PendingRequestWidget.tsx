import React, { useEffect, useState } from 'react';
import styled from '@emotion/styled';
import { FiClock, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';
import api from '../../../shared/api/api';
import type { JoinRequest } from '../../../entities/joinRequest/model/types';

interface PendingRequestWidgetProps {
  className?: string;
}

const Container = styled.div`
  max-width: 600px;
  margin: 0 auto;
  padding: 24px;
  background-color: var(--color-bg-alt);
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  text-align: center;
`;

const IconContainer = styled.div<{ status: 'pending' | 'approved' | 'rejected' }>`
  width: 80px;
  height: 80px;
  margin: 0 auto 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  
  ${({ status }) => {
    switch (status) {
      case 'pending':
        return `
          background-color: rgba(234, 179, 8, 0.2);
          color: rgb(234, 179, 8);
        `;
      case 'approved':
        return `
          background-color: rgba(34, 197, 94, 0.2);
          color: rgb(34, 197, 94);
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

const Title = styled.h2`
  font-size: 24px;
  font-weight: 600;
  color: var(--color-accent);
  margin-bottom: 16px;
`;

const Description = styled.p`
  font-size: 16px;
  color: var(--color-text);
  margin-bottom: 24px;
  line-height: 1.5;
`;

const OfficeInfo = styled.div`
  margin-bottom: 24px;
  padding: 16px;
  background-color: var(--color-bg);
  border-radius: 8px;
`;

const OfficeName = styled.div`
  font-size: 18px;
  font-weight: 500;
  color: var(--color-accent);
  margin-bottom: 8px;
`;

const OfficeId = styled.div`
  font-size: 14px;
  color: var(--color-muted);
`;

const StatusBadge = styled.div<{ status: 'pending' | 'approved' | 'rejected' }>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 24px;
  
  ${({ status }) => {
    switch (status) {
      case 'pending':
        return `
          background-color: rgba(234, 179, 8, 0.2);
          color: rgb(234, 179, 8);
        `;
      case 'approved':
        return `
          background-color: rgba(34, 197, 94, 0.2);
          color: rgb(34, 197, 94);
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

export const PendingRequestWidget: React.FC<PendingRequestWidgetProps> = ({ className }) => {
  const [request, setRequest] = useState<JoinRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchRequestStatus = async () => {
      try {
        setLoading(true);
        const response = await api.joinRequests.getUserRequestStatus();
        setRequest(response.request);
      } catch (err) {
        setError('Не удалось получить информацию о заявке');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchRequestStatus();
    
    // Проверяем статус заявки каждые 30 секунд
    const intervalId = setInterval(fetchRequestStatus, 30000);
    
    return () => clearInterval(intervalId);
  }, []);
  
  if (loading) {
    return (
      <Container className={className}>
        <Title>Загрузка...</Title>
      </Container>
    );
  }
  
  if (error || !request) {
    return (
      <Container className={className}>
        <IconContainer status="rejected">
          <FiAlertCircle />
        </IconContainer>
        <Title>Ошибка</Title>
        <Description>
          {error || 'Не удалось получить информацию о заявке'}
        </Description>
      </Container>
    );
  }
  
  const getStatusIcon = () => {
    switch (request.status) {
      case 'pending':
        return <FiClock />;
      case 'approved':
        return <FiCheckCircle />;
      case 'rejected':
        return <FiAlertCircle />;
      default:
        return <FiClock />;
    }
  };
  
  const getStatusText = () => {
    switch (request.status) {
      case 'pending':
        return 'Ожидает рассмотрения';
      case 'approved':
        return 'Одобрена';
      case 'rejected':
        return 'Отклонена';
      default:
        return 'Неизвестный статус';
    }
  };
  
  const getDescription = () => {
    switch (request.status) {
      case 'pending':
        return 'Ваша заявка на присоединение к офису находится на рассмотрении. Собственник офиса должен подтвердить вашу заявку. Пожалуйста, проверьте статус позже.';
      case 'approved':
        return 'Поздравляем! Ваша заявка на присоединение к офису была одобрена. Теперь вы можете начать работу в системе.';
      case 'rejected':
        return 'К сожалению, ваша заявка на присоединение к офису была отклонена. Пожалуйста, свяжитесь с собственником офиса для получения дополнительной информации.';
      default:
        return '';
    }
  };

  return (
    <Container className={className}>
      <IconContainer status={request.status}>
        {getStatusIcon()}
      </IconContainer>
      
      <Title>
        Заявка на присоединение к офису
      </Title>
      
      <OfficeInfo>
        <OfficeName>Офис: {request.officeName || 'Неизвестный офис'}</OfficeName>
        <OfficeId>ID: {request.officeId}</OfficeId>
      </OfficeInfo>
      
      <StatusBadge status={request.status}>
        {getStatusIcon()} {getStatusText()}
      </StatusBadge>
      
      <Description>
        {getDescription()}
      </Description>
    </Container>
  );
};

export default PendingRequestWidget; 