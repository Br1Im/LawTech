import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from '@emotion/styled';
import NewOfficeSetup from './NewOfficeSetup';
import apiClient from '../shared/api/apiClient';

const PageWrapper = styled.div`
  min-height: 100vh;
  width: 100vw;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  background: var(--color-bg-secondary, #f5f5f5);
`;

const LoadingMessage = styled.div`
  text-align: center;
  margin-top: 2.5rem;
  color: var(--color-text);
`;

const ErrorMessage = styled.div`
  color: #ef4444;
  text-align: center;
  margin-top: 2.5rem;
`;

const WelcomePage: React.FC = () => {
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkUser = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/auth');
          return;
        }

        const response = await apiClient.get('/auth/me');
        const user = response.data?.user;

        if (!user) {
          navigate('/auth');
          return;
        }

        // Если директор без офисов — показываем форму создания
        if (user.role === 'director' && (user.needs_office_setup || !user.offices || user.offices.length === 0)) {
          setNeedsSetup(true);
        } else {
          // У пользователя уже есть офис — сразу в CRM
          if (user.role === 'director' && user.offices?.length > 0) {
            localStorage.setItem('activeOfficeId', String(user.offices[0].id));
          }
          navigate('/crm');
        }
      } catch (err: any) {
        if (err.response?.status === 401 || err.response?.status === 403) {
          localStorage.removeItem('token');
          navigate('/auth');
        } else {
          setError('Ошибка загрузки профиля');
        }
      }
    };

    checkUser();
  }, [navigate]);

  if (error) {
    return <PageWrapper><ErrorMessage>{error}</ErrorMessage></PageWrapper>;
  }

  if (needsSetup === null) {
    return <PageWrapper><LoadingMessage>Загрузка...</LoadingMessage></PageWrapper>;
  }

  return <NewOfficeSetup />;
};

export default WelcomePage;
