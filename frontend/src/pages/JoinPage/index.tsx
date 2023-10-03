import React, { useEffect, useState } from 'react';
import styled from '@emotion/styled';
import { FiUsers, FiAlertCircle } from 'react-icons/fi';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../../shared/api/api';

interface JoinPageProps {
  isAuthenticated: boolean;
}

const Container = styled.div`
  padding: 24px;
  max-width: 600px;
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

const Card = styled.div`
  padding: 24px;
  background-color: var(--color-bg-alt);
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Label = styled.label`
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text);
`;

const Input = styled.input`
  padding: 12px 16px;
  border-radius: 8px;
  border: 1px solid var(--color-accent-light);
  background-color: var(--color-bg);
  color: var(--color-text);
  font-size: 16px;
  transition: border-color 0.2s ease;
  
  &:focus {
    outline: none;
    border-color: var(--color-accent);
  }
  
  &::placeholder {
    color: var(--color-muted);
  }
`;

const Button = styled.button`
  padding: 14px;
  border-radius: 8px;
  background-color: var(--color-accent);
  color: white;
  font-size: 16px;
  font-weight: 500;
  border: none;
  cursor: pointer;
  transition: background-color 0.2s ease;
  
  &:hover {
    background-color: var(--color-accent-dark);
  }
  
  &:disabled {
    background-color: var(--color-muted);
    cursor: not-allowed;
  }
`;

const ErrorMessage = styled.div`
  padding: 12px;
  background-color: rgba(239, 68, 68, 0.1);
  border-radius: 8px;
  color: rgb(239, 68, 68);
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
`;

const LoadingState = styled.div`
  text-align: center;
  padding: 16px;
  color: var(--color-muted);
`;

const OfficeInfo = styled.div`
  padding: 16px;
  background-color: var(--color-bg);
  border-radius: 8px;
  margin-bottom: 24px;
`;

const OfficeName = styled.div`
  font-size: 18px;
  font-weight: 600;
  color: var(--color-accent);
  margin-bottom: 8px;
`;

const OfficeId = styled.div`
  font-size: 14px;
  color: var(--color-muted);
`;

export const JoinPage: React.FC<JoinPageProps> = ({ isAuthenticated }) => {
  const [officeId, setOfficeId] = useState('');
  const [officeName, setOfficeName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingOffice, setIsLoadingOffice] = useState(false);
  const [officeError, setOfficeError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const location = useLocation();
  const navigate = useNavigate();
  
  // Получаем officeId из query параметра
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const id = queryParams.get('officeId');
    
    if (id) {
      setOfficeId(id);
      fetchOfficeInfo(id);
    }
    
    // Если пользователь авторизован, перенаправляем на форму присоединения к офису
    if (isAuthenticated && id) {
      navigate(`/join-office?officeId=${id}`);
    }
  }, [location, isAuthenticated, navigate]);
  
  // Получаем информацию об офисе
  const fetchOfficeInfo = async (id: string) => {
    setIsLoadingOffice(true);
    setOfficeError(null);
    
    try {
      const response = await api.office.getOffice(id);
      if (response.office) {
        setOfficeName(response.office.name);
      } else {
        setOfficeError('Не удалось получить информацию об офисе');
      }
    } catch (err) {
      setOfficeError('Не удалось получить информацию об офисе');
      console.error(err);
    } finally {
      setIsLoadingOffice(false);
    }
  };
  
  // Обработчик регистрации
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !email || !password || !officeId) {
      setError('Пожалуйста, заполните все поля');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Регистрируем пользователя
      await api.auth.register({
        name,
        email,
        password,
        userType: 'employee',
        isNewOffice: false,
        officeId
      });
      
      // После успешной регистрации перенаправляем на страницу ожидания
      navigate('/pending-request');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ошибка при регистрации');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Container>
      <Header>
        <Title>Присоединение к офису</Title>
        {officeName ? (
          <Subtitle>Регистрация в офисе "{officeName}"</Subtitle>
        ) : (
          <Subtitle>Создайте аккаунт для присоединения к офису</Subtitle>
        )}
      </Header>
      
      {isLoadingOffice ? (
        <LoadingState>Проверка информации об офисе...</LoadingState>
      ) : officeError ? (
        <ErrorMessage>
          <FiAlertCircle size={16} />
          {officeError}
        </ErrorMessage>
      ) : officeName && (
        <OfficeInfo>
          <OfficeName>{officeName}</OfficeName>
          <OfficeId>ID: {officeId}</OfficeId>
        </OfficeInfo>
      )}
      
      <Card>
        {error && (
          <ErrorMessage>
            <FiAlertCircle size={16} />
            {error}
          </ErrorMessage>
        )}
        
        {isAuthenticated ? (
          <LoadingState>
            Вы уже авторизованы. Перенаправляем...
          </LoadingState>
        ) : (
          <Form onSubmit={handleRegister}>
            <FormGroup>
              <Label htmlFor="name">Имя</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Введите ваше имя"
                required
              />
            </FormGroup>
            
            <FormGroup>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Введите ваш email"
                required
              />
            </FormGroup>
            
            <FormGroup>
              <Label htmlFor="password">Пароль</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Создайте пароль"
                required
              />
            </FormGroup>
            
            <FormGroup>
              <Label htmlFor="officeId">ID офиса</Label>
              <Input
                id="officeId"
                type="text"
                value={officeId}
                onChange={(e) => setOfficeId(e.target.value)}
                placeholder="Введите ID офиса"
                readOnly={!!location.search.includes('officeId')}
                required
              />
            </FormGroup>
            
            <Button type="submit" disabled={loading}>
              {loading ? 'Регистрация...' : 'Зарегистрироваться'}
            </Button>
          </Form>
        )}
      </Card>
    </Container>
  );
};

export default JoinPage; 