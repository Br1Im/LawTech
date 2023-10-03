import React, { useEffect, useState } from 'react';
import styled from '@emotion/styled';
import { FiArrowLeft } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { UserCard } from '../../../../entities/user/ui/UserCard';
import { ProfileEditForm } from '../../../../features/profile-edit/ui/ProfileEditForm';
import { Button } from '../../../../shared/ui/Button';
import { api } from '../../../../shared/api/api';
import type { User, ProfileUpdateData } from '../../../../shared/types';

interface ProfileWidgetProps {
  className?: string;
}

const WidgetContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--color-accent-light);
`;

const Title = styled.h1`
  font-size: 24px;
  font-weight: 600;
  color: var(--color-accent);
  margin: 0;
`;

const ContentWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const CardWrapper = styled.div`
  margin-bottom: 16px;
`;

const LoadingMessage = styled.div`
  text-align: center;
  padding: 40px;
  color: var(--color-muted);
`;

const ErrorMessage = styled.div`
  color: #ef4444;
  padding: 16px;
  border-radius: 6px;
  background-color: rgba(239, 68, 68, 0.1);
  margin: 24px 0;
  text-align: center;
`;

export const ProfileWidget: React.FC<ProfileWidgetProps> = ({ className }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const userData = await api.profile.getProfile();
      setUser(userData);
    } catch (err) {
      setError('Не удалось загрузить данные профиля');
      console.error('Ошибка загрузки профиля:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (data: ProfileUpdateData) => {
    try {
      await api.profile.updateProfile(data);
      await fetchUserProfile(); // Обновляем данные после успешного обновления
    } catch (err) {
      console.error('Ошибка обновления профиля:', err);
      throw err;
    }
  };

  if (loading) {
    return <LoadingMessage>Загрузка данных профиля...</LoadingMessage>;
  }

  if (error) {
    return <ErrorMessage>{error}</ErrorMessage>;
  }

  if (!user) {
    return <ErrorMessage>Не удалось загрузить информацию о пользователе</ErrorMessage>;
  }

  return (
    <WidgetContainer className={className}>
      <Header>
        <Button 
          variant="text" 
          icon={<FiArrowLeft />}
          onClick={() => navigate('/crm')}
        >
          Вернуться в CRM
        </Button>
        <Title>Профиль пользователя</Title>
      </Header>

      <ContentWrapper>
        <CardWrapper>
          <UserCard user={user} />
        </CardWrapper>
        
        <ProfileEditForm 
          user={user} 
          onSave={handleUpdateProfile} 
        />
      </ContentWrapper>
    </WidgetContainer>
  );
};

export default ProfileWidget; 