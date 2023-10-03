import React from 'react';
import styled from '@emotion/styled';
import { ProfileWidget } from '../widgets/profile';

const PageWrapper = styled.div`
  min-height: 100vh;
  padding: 80px 20px 20px;
  background-color: var(--color-bg);
  color: var(--color-text);
`;

const ProfilePage: React.FC = () => {
  return (
    <PageWrapper>
      <ProfileWidget />
    </PageWrapper>
  );
};

export default ProfilePage; 