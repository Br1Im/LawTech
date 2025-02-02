import React from 'react';
import styled from '@emotion/styled';
import { FiUserPlus } from 'react-icons/fi';
import JoinRequestsWidget from '../../widgets/joinRequests/ui/JoinRequestsWidget';
import type { User } from '../../shared/types';

interface JoinRequestsPageProps {
  user: User;
}

const Container = styled.div`
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
`;

const Title = styled.h1`
  font-size: 28px;
  font-weight: 600;
  color: var(--color-accent);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 12px;
`;

const NoAccessMessage = styled.div`
  padding: 24px;
  background-color: var(--color-bg-alt);
  border-radius: 12px;
  text-align: center;
  color: var(--color-muted);
`;

export const JoinRequestsPage: React.FC<JoinRequestsPageProps> = ({ user }) => {
  // Проверяем, является ли пользователь собственником офиса
  const isOwner = user.role === 'owner';
  
  // Если пользователь не собственник, показываем сообщение о недостаточных правах
  if (!isOwner || !user.officeId) {
    return (
      <Container>
        <Header>
          <Title>
            <FiUserPlus size={24} />
            Заявки на присоединение
          </Title>
        </Header>
        <NoAccessMessage>
          У вас нет прав для просмотра заявок на присоединение к офису.
          Эта функция доступна только собственнику офиса.
        </NoAccessMessage>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <Title>
          <FiUserPlus size={24} />
          Заявки на присоединение
        </Title>
      </Header>
      
      <JoinRequestsWidget officeId={user.officeId} />
    </Container>
  );
};

export default JoinRequestsPage; 