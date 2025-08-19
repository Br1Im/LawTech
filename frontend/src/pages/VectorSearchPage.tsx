import React from 'react';
import VectorSearch from '../components/VectorSearch';
import { MainLayout } from '../layouts/MainLayout';

const VectorSearchPage: React.FC = () => {
  return (
    <MainLayout>
      <div className="page">
        <VectorSearch />
      </div>
    </MainLayout>
  );
};

export default VectorSearchPage; 