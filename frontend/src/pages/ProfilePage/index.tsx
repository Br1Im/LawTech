import React, { useState, useEffect } from 'react';
import styled from '@emotion/styled';
import { useSelector } from 'react-redux';
import { PageLayout } from '../../widgets/PageLayout';
import { UserCard } from '../../entities/user/ui/UserCard';
import { ProfileEditForm } from '../../features/profile-edit/ui/ProfileEditForm';
import { api } from '../../shared/api/api';
import { selectUser } from '../../entities/user/model/selectors';
import { ProfileUpdateData } from '../../shared/types';
import { Spinner } from '../../shared/ui/Spinner';
import { useAppDispatch } from '../../shared/lib/hooks';
import { userActions } from '../../entities/user/model/slice';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 32px;
  max-width: 1000px;
  margin: 0 auto;
  padding: 24px;
`;

const Section = styled.section`
  background-color: var(--color-bg-alt);
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
`;

const SectionTitle = styled.h2`
  font-size: 24px;
  font-weight: 600;
  color: var(--color-accent);
  margin: 0 0 24px 0;
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 300px;
`;

export const ProfilePage: React.FC = () => {
  const dispatch = useAppDispatch();
  const user = useSelector(selectUser);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Если пользователь не загружен, загружаем его данные
    if (!user) {
      setIsLoading(true);
      api.profile.getProfile()
        .then(userData => {
          dispatch(userActions.setUser(userData));
        })
        .catch(err => {
          setError('Не удалось загрузить данные профиля');
          console.error('Failed to load profile:', err);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [dispatch, user]);

  const handleSaveProfile = async (data: ProfileUpdateData) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.profile.updateProfile(data);
      dispatch(userActions.setUser(response.user));
    } catch (err) {
      setError('Не удалось обновить профиль');
      console.error('Failed to update profile:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && !user) {
    return (
      <PageLayout>
        <LoadingContainer>
          <Spinner size={48} />
        </LoadingContainer>
      </PageLayout>
    );
  }

  if (error && !user) {
    return (
      <PageLayout>
        <Container>
          <div>{error}</div>
        </Container>
      </PageLayout>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <PageLayout>
      <Container>
        <Section>
          <SectionTitle>Мой профиль</SectionTitle>
          <UserCard user={user} />
        </Section>
        
        <Section>
          <SectionTitle>Настройки профиля</SectionTitle>
          <ProfileEditForm 
            user={user} 
            onSave={handleSaveProfile}
          />
        </Section>
      </Container>
    </PageLayout>
  );
};

export default ProfilePage; 