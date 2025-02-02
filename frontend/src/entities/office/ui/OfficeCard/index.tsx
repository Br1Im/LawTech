import React from 'react';
import styled from '@emotion/styled';
import { FiHome, FiMapPin, FiPhone, FiGlobe, FiInfo } from 'react-icons/fi';
import type { Office } from '../../model/types';

interface OfficeCardProps {
  office: Office;
  isOwner?: boolean;
  className?: string;
}

const CardContainer = styled.div`
  padding: 24px;
  background-color: var(--color-bg-alt);
  border-radius: 12px;
  border: 1px solid var(--color-accent-light);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
`;

const OfficeName = styled.h3`
  font-size: 20px;
  font-weight: 600;
  color: var(--color-accent);
  margin: 0 0 16px 0;
  display: flex;
  align-items: center;
  gap: 10px;
`;

const OfficeIdContainer = styled.div`
  background-color: var(--color-bg);
  border: 1px dashed var(--color-accent);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const OfficeIdLabel = styled.div`
  font-size: 14px;
  color: var(--color-muted);
  display: flex;
  align-items: center;
  gap: 6px;
`;

const OfficeIdValue = styled.div`
  font-size: 18px;
  font-weight: 600;
  color: var(--color-accent);
  font-family: monospace;
  letter-spacing: 1px;
`;

const InfoList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const InfoItem = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const InfoLabel = styled.span`
  color: var(--color-muted);
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 120px;
`;

const InfoValue = styled.span`
  color: var(--color-text);
  font-weight: 500;
`;

export const OfficeCard: React.FC<OfficeCardProps> = ({ 
  office, 
  isOwner = false,
  className 
}) => {
  return (
    <CardContainer className={className}>
      <OfficeName>
        <FiHome size={20} />
        {office.name}
      </OfficeName>
      
      <OfficeIdContainer>
        <OfficeIdLabel>
          <FiInfo size={14} /> 
          {isOwner ? 'ID вашего офиса (для приглашения сотрудников):' : 'ID офиса:'}
        </OfficeIdLabel>
        <OfficeIdValue>{office.id}</OfficeIdValue>
      </OfficeIdContainer>
      
      <InfoList>
        <InfoItem>
          <InfoLabel>
            <FiMapPin size={16} /> Адрес:
          </InfoLabel>
          <InfoValue>{office.address}</InfoValue>
        </InfoItem>
        
        {office.contact_phone && (
          <InfoItem>
            <InfoLabel>
              <FiPhone size={16} /> Телефон:
            </InfoLabel>
            <InfoValue>{office.contact_phone}</InfoValue>
          </InfoItem>
        )}
        
        {office.website && (
          <InfoItem>
            <InfoLabel>
              <FiGlobe size={16} /> Сайт:
            </InfoLabel>
            <InfoValue>{office.website}</InfoValue>
          </InfoItem>
        )}
      </InfoList>
    </CardContainer>
  );
};

export default OfficeCard; 