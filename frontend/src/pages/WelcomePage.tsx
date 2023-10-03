import { useState, useEffect } from 'react';
import axios, { AxiosError } from 'axios';
import { useNavigate } from 'react-router-dom';
import styled from '@emotion/styled';
import NewOfficeSetup from './NewOfficeSetup';
import { buildApiUrl } from '../shared/utils/apiUtils';
import apiClient from '../shared/api/apiClient';

interface User {
  id: number;
  name: string;
  email: string;
  userType: string;
  isNewOffice: boolean;
}

interface ContainerProps {
  wide?: boolean;
}

interface TextProps {
  mb?: boolean;
}

const PageWrapper = styled.div`
  min-height: 100vh;
  width: 100vw;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  background-image: url('/src/assets/office-bg.png');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
`;

const Container = styled.div<ContainerProps>`
  max-width: ${props => props.wide ? '32rem' : '24rem'};
  margin: 2.5rem auto;
  padding: 1.5rem;
  background: var(--color-bg);
  border-radius: 0.5rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
`;

const Title = styled.h1`
  font-size: 1.5rem;
  font-weight: bold;
  color: var(--color-text);
  margin-bottom: 1.5rem;
`;

const Text = styled.p<TextProps>`
  color: var(--color-muted);
  margin-bottom: ${props => props.mb ? '1.5rem' : '0.5rem'};
`;

const ErrorMessage = styled.div`
  color: #ef4444;
  text-align: center;
  margin-top: 2.5rem;
`;

const LoadingMessage = styled.div`
  text-align: center;
  margin-top: 2.5rem;
  color: var(--color-text);
`;

const LogoutButton = styled.button`
  width: auto;
  padding: 0.5rem 1rem;
  background: var(--color-button-bg);
  color: var(--color-button-text);
  font-size: 1rem;
  border-radius: 0.375rem;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background-color 0.2s;
  &:hover {
    background: var(--color-accent-light);
  }
`;

const WelcomePage: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setError('Требуется авторизация');
          navigate('/auth');
          return;
        }

        const response = await apiClient.get('/profile');
        // Альтернативный вариант с axios
        // const response = await axios.get(buildApiUrl('/profile'), {
        //   headers: { Authorization: `Bearer ${token}` },
        // });

        console.log('Профиль:', response.data);
        setUser(response.data);

        // Перенаправление на CRM, если офис не новый
        if (!response.data.isNewOffice) {
          navigate('/crm');
        }
      } catch (err) {
        if (err instanceof AxiosError) {
          if (err.response?.status === 401 || err.response?.status === 403) {
            setError('Недействительный токен. Пожалуйста, войдите снова.');
            localStorage.removeItem('token');
            navigate('/auth');
          } else {
            setError('Ошибка загрузки профиля');
          }
        } else {
          setError('Неизвестная ошибка');
        }
        console.error('Ошибка:', err);
      }
    };

    fetchUserProfile();
  }, [navigate]);

  if (error) {
    return (
      <PageWrapper>
        <ErrorMessage>{error}</ErrorMessage>
      </PageWrapper>
    );
  }

  if (!user) {
    return (
      <PageWrapper>
        <LoadingMessage>Загрузка...</LoadingMessage>
      </PageWrapper>
    );
  }

  if (user.isNewOffice) {
    return <NewOfficeSetup />;
  }

  return (
    <PageWrapper>
      <Container>
        <Title>Добро пожаловать, {user.name}!</Title>
        <Text>Email: {user.email}</Text>
        <Text mb>Тип пользователя: {user.userType}</Text>
        <LogoutButton
          onClick={() => {
            localStorage.removeItem('token');
            navigate('/auth');
          }}
        >
          Выйти
        </LogoutButton>
      </Container>
    </PageWrapper>
  );
};

export default WelcomePage;