import styled from '@emotion/styled';
import { keyframes } from '@emotion/react';
import { Link } from 'react-router-dom';
import { ArrowRight, Scale, Shield, Zap } from 'lucide-react';

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(24px); }
  to { opacity: 1; transform: translateY(0); }
`;

const Section = styled.section`
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 140px 24px 80px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;

  @media (max-width: 768px) {
    padding: 100px 20px 60px;
  }
`;

const Badge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 16px;
  border-radius: var(--radius-pill);
  background: var(--color-primary-light);
  color: var(--color-primary);
  font-size: 13px;
  font-weight: 600;
  font-family: var(--font-sans);
  margin-bottom: 24px;
  animation: ${fadeUp} 0.6s ease both;
`;

const Title = styled.h1`
  font-family: var(--font-display);
  font-size: clamp(36px, 5.5vw, 64px);
  font-weight: 800;
  line-height: 1.1;
  color: var(--color-text);
  margin-bottom: 20px;
  max-width: 800px;
  letter-spacing: -1.5px;
  animation: ${fadeUp} 0.6s ease 0.1s both;
`;

const Highlight = styled.span`
  color: var(--color-primary);
`;

const Subtitle = styled.p`
  font-size: clamp(16px, 2vw, 20px);
  color: var(--color-text-secondary);
  max-width: 560px;
  line-height: 1.6;
  margin-bottom: 36px;
  font-family: var(--font-sans);
  animation: ${fadeUp} 0.6s ease 0.2s both;
`;

const ButtonRow = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
  animation: ${fadeUp} 0.6s ease 0.3s both;

  @media (max-width: 480px) {
    flex-direction: column;
    width: 100%;
  }
`;

const PrimaryBtn = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: var(--color-primary);
  color: #fff;
  padding: 14px 28px;
  border-radius: var(--radius-md);
  font-size: 16px;
  font-weight: 600;
  text-decoration: none;
  font-family: var(--font-sans);
  transition: all 0.2s;
  border: none;

  &:hover {
    opacity: 0.9;
    transform: translateY(-2px);
    box-shadow: var(--shadow-lg);
  }

  svg { width: 18px; height: 18px; }

  @media (max-width: 480px) {
    width: 100%;
    justify-content: center;
  }
`;

const SecondaryBtn = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: transparent;
  color: var(--color-text);
  padding: 14px 28px;
  border-radius: var(--radius-md);
  font-size: 16px;
  font-weight: 600;
  text-decoration: none;
  font-family: var(--font-sans);
  border: 1px solid var(--color-border);
  transition: all 0.2s;

  &:hover {
    background: var(--color-bg-hover);
    border-color: var(--color-border-strong);
  }

  @media (max-width: 480px) {
    width: 100%;
    justify-content: center;
  }
`;

const TrustRow = styled.div`
  display: flex;
  gap: 32px;
  margin-top: 56px;
  animation: ${fadeUp} 0.6s ease 0.4s both;

  @media (max-width: 640px) {
    gap: 16px;
    flex-wrap: wrap;
    justify-content: center;
  }
`;

const TrustItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--color-text-secondary);
  font-size: 14px;
  font-family: var(--font-sans);
  font-weight: 500;

  svg {
    width: 18px;
    height: 18px;
    color: var(--color-primary);
    flex-shrink: 0;
  }
`;

const HeroSection = () => (
  <Section>
    <Badge>CRM для юридических фирм</Badge>
    <Title>
      Юридическая практика <Highlight>нового поколения</Highlight>
    </Title>
    <Subtitle>
      Управляйте клиентами, делами и документами в единой системе.
      AI-аналитика, автоматизация процессов и полный контроль финансов.
    </Subtitle>
    <ButtonRow>
      <PrimaryBtn to="/auth">
        Попробовать бесплатно <ArrowRight />
      </PrimaryBtn>
      <SecondaryBtn to="/auth">Демо-доступ</SecondaryBtn>
    </ButtonRow>
    <TrustRow>
      <TrustItem><Shield /> ФЗ-152 · данные в РФ</TrustItem>
      <TrustItem><Zap /> Ответ AI за 1.2 сек</TrustItem>
      <TrustItem><Scale /> E2E-шифрование</TrustItem>
    </TrustRow>
  </Section>
);

export default HeroSection;
