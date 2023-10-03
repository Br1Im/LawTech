import React, { useEffect, useState } from 'react';
import styled from '@emotion/styled';
import { FiAlertCircle } from 'react-icons/fi';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../../shared/api/api';
import { JoinOfficeForm } from '../../features/joinOffice';
import type { User } from '../../shared/types';

interface JoinOfficePageProps {
  user: User;
}

const Container = styled.div`
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
`;

const Header = styled.div`
  margin-bottom: 24px;
  text-align: center;
`;

const Title = styled.h1`
  font-size: 28px;
  font-weight: 600;
  color: var(--color-accent);
  margin-bottom: 8px;
`;

const Subtitle = styled.h2`
  font-size: 18px;
  font-weight: normal;
  color: var(--color-muted);
`;

const ErrorMessage = styled.div`
  padding: 16px;
  background-color: rgba(239, 68, 68, 0.1);
  border-radius: 8px;
  color: rgb(239, 68, 68);
  font-size: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
  max-width: 500px;
  margin-left: auto;
  margin-right: auto;
`;

const LoadingState = styled.div`
  padding: 24px;
  text-align: center;
  color: var(--color-muted);
`;

export const JoinOfficePage: React.FC<JoinOfficePageProps> = ({ user }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [officeId, setOfficeId] = useState<string | null>(null);
  
  const location = useLocation();
  const navigate = useNavigate();
  
  // Извлекаем officeId из URL параметров
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const id = queryParams.get('officeId');
    
    if (id) {
      setOfficeId(id);
    }
    
    // Если у пользователя уже есть офис, перенаправляем на страницу офиса
    if (user.officeId) {
      navigate('/office');
    }
  }, [location, user, navigate]);
  
  // Обработчик присоединения к офису
  const handleJoinOffice = async () => {
    if (!officeId) {
      setError('ID офиса не найден');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      await api.office.joinOffice({ officeId });
      navigate('/pending-request');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Не удалось отправить заявку на присоединение к офису');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) {
    return (
      <Container>
        <Header>
          <Title>Присоединение к офису</Title>
          <Subtitle>Отправка заявки на присоединение...</Subtitle>
        </Header>
        <LoadingState>Пожалуйста, подождите...</LoadingState>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <Title>Присоединение к офису</Title>
        <Subtitle>Отправьте заявку на присоединение к офису</Subtitle>
      </Header>
      
      {error && (
        <ErrorMessage>
          <FiAlertCircle size={20} />
          {error}
        </ErrorMessage>
      )}
      
      <JoinOfficeForm />
    </Container>
  );
};

export default JoinOfficePage; 