import React, { useEffect, useState } from 'react';
import styled from '@emotion/styled';
import { FiLogIn, FiAlertCircle } from 'react-icons/fi';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../../../shared/api/api';

interface JoinOfficeFormProps {
  className?: string;
  prefillOfficeId?: string;
}

const FormContainer = styled.div`
  max-width: 500px;
  margin: 0 auto;
  padding: 24px;
  background-color: var(--color-bg-alt);
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
`;

const Title = styled.h2`
  font-size: 24px;
  font-weight: 600;
  color: var(--color-accent);
  margin: 0 0 24px 0;
  display: flex;
  align-items: center;
  gap: 12px;
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
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
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
`;

const Description = styled.p`
  color: var(--color-muted);
  font-size: 14px;
  margin-bottom: 20px;
  line-height: 1.5;
`;

export const JoinOfficeForm: React.FC<JoinOfficeFormProps> = ({ className, prefillOfficeId }) => {
  const [officeId, setOfficeId] = useState(prefillOfficeId || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  
  // Если есть query параметр officeId, используем его
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const id = queryParams.get('officeId');
    
    if (id) {
      setOfficeId(id);
    } else if (prefillOfficeId) {
      setOfficeId(prefillOfficeId);
    }
  }, [location, prefillOfficeId]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!officeId.trim()) {
      setError('Пожалуйста, введите ID офиса');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Отправляем заявку на присоединение к офису
      await api.office.joinOffice({ officeId: officeId.trim() });
      
      // Перенаправляем пользователя на страницу ожидания
      navigate('/pending-request');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Не удалось отправить заявку на присоединение к офису');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormContainer className={className}>
      <Title>
        <FiLogIn size={24} />
        Присоединиться к офису
      </Title>
      
      <Description>
        Введите ID офиса, к которому вы хотите присоединиться. После отправки заявки, собственник офиса должен будет одобрить ваше присоединение.
      </Description>
      
      {error && (
        <ErrorMessage>
          <FiAlertCircle size={16} />
          {error}
        </ErrorMessage>
      )}
      
      <Form onSubmit={handleSubmit}>
        <FormGroup>
          <Label htmlFor="officeId">ID офиса</Label>
          <Input
            id="officeId"
            type="text"
            value={officeId}
            onChange={(e) => setOfficeId(e.target.value)}
            placeholder="Введите ID офиса"
            disabled={loading || !!prefillOfficeId || !!location.search.includes('officeId')}
          />
        </FormGroup>
        
        <Button type="submit" disabled={loading}>
          {loading ? 'Отправка заявки...' : 'Отправить заявку на присоединение'}
        </Button>
      </Form>
    </FormContainer>
  );
};

export default JoinOfficeForm; 