import React, { useEffect, useState } from 'react';
import styled from '@emotion/styled';
import { FiAlertCircle } from 'react-icons/fi';
import OfficeCard from '../../entities/office/ui/OfficeCard';
import api from '../../shared/api/api';
import type { Office } from '../../entities/office/model/types';
import type { User } from '../../shared/types';

interface OfficeInfoPageProps {
  user: User;
}

const Container = styled.div`
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
`;

const Title = styled.h1`
  font-size: 28px;
  font-weight: 600;
  color: var(--color-accent);
  margin-bottom: 24px;
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
`;

const LoadingState = styled.div`
  padding: 24px;
  text-align: center;
  color: var(--color-muted);
`;

export const OfficeInfoPage: React.FC<OfficeInfoPageProps> = ({ user }) => {
  const [office, setOffice] = useState<Office | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchOfficeData = async () => {
      try {
        setLoading(true);
        // Если у пользователя есть officeId, используем его, иначе получаем информацию о его офисе
        const officeId = user.officeId;
        const response = await api.office.getOffice(officeId);
        setOffice(response.office);
      } catch (err) {
        setError('Не удалось загрузить информацию об офисе');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchOfficeData();
  }, [user]);
  
  if (loading) {
    return (
      <Container>
        <Title>Информация об офисе</Title>
        <LoadingState>Загрузка информации об офисе...</LoadingState>
      </Container>
    );
  }
  
  if (error || !office) {
    return (
      <Container>
        <Title>Информация об офисе</Title>
        <ErrorMessage>
          <FiAlertCircle size={20} />
          {error || 'Не удалось загрузить информацию об офисе'}
        </ErrorMessage>
      </Container>
    );
  }
  
  const isOwner = user.id === office.ownerId;

  return (
    <Container>
      <Title>Информация об офисе</Title>
      <OfficeCard office={office} isOwner={isOwner} />
    </Container>
  );
};

export default OfficeInfoPage; 