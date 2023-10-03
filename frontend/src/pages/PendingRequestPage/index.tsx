import React from 'react';
import styled from '@emotion/styled';
import { FiClock } from 'react-icons/fi';
import PendingRequestWidget from '../../widgets/pendingRequest/ui/PendingRequestWidget';

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

export const PendingRequestPage: React.FC = () => {
  return (
    <Container>
      <Header>
        <Title>
          <FiClock size={24} />
          Ожидание подтверждения
        </Title>
      </Header>
      
      <PendingRequestWidget />
    </Container>
  );
};

export default PendingRequestPage; 