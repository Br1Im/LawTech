import styled from '@emotion/styled';
import { keyframes } from '@emotion/react';
import { Link } from 'react-router-dom';
import { Scale, ArrowLeft, Home as HomeIcon } from 'lucide-react';

const fadeInUp = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const Wrapper = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  position: relative;
  overflow: hidden;
`;

const Card = styled.div`
  position: relative;
  z-index: 1;
  max-width: 520px;
  width: 100%;
  background: var(--glass-bg-strong);
  backdrop-filter: blur(18px) saturate(140%);
  -webkit-backdrop-filter: blur(18px) saturate(140%);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-xl);
  padding: 48px 40px;
  box-shadow: var(--shadow-xl);
  text-align: center;
  animation: ${fadeInUp} 0.6s var(--ease-out) forwards;

  @media (max-width: 560px) {
    padding: 36px 24px;
  }
`;

const Badge = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 68px;
  height: 68px;
  border-radius: 20px;
  background: var(--gradient-gold);
  color: #1a1a1a;
  box-shadow: 0 10px 28px rgba(212, 175, 55, 0.35);
  margin: 0 auto 20px;

  svg {
    width: 32px;
    height: 32px;
    stroke-width: 2.2;
  }
`;

const Code = styled.div`
  font-family: var(--font-display);
  font-size: clamp(72px, 14vw, 140px);
  font-weight: 800;
  line-height: 1;
  background: var(--gradient-gold);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: -0.02em;
  margin-bottom: 8px;
`;

const Title = styled.h1`
  font-family: var(--font-display);
  font-size: 26px;
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: 10px;
`;

const Description = styled.p`
  color: var(--color-text-secondary);
  font-size: 16px;
  line-height: 1.55;
  margin-bottom: 28px;
`;

const Actions = styled.div`
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
`;

const PrimaryLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 22px;
  border-radius: var(--radius-pill);
  background: var(--gradient-gold);
  color: #fff;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.25s var(--ease-out);
  box-shadow: 0 10px 24px rgba(212, 175, 55, 0.3);

  svg {
    width: 16px;
    height: 16px;
  }

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 14px 28px rgba(212, 175, 55, 0.4);
  }
`;

const GhostLink = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 11px 22px;
  border-radius: var(--radius-pill);
  background: transparent;
  color: var(--color-text);
  border: 1px solid var(--color-border-strong);
  font-family: var(--font-sans);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.25s var(--ease-out);

  svg {
    width: 16px;
    height: 16px;
  }

  &:hover {
    color: var(--color-accent);
    border-color: var(--color-accent);
  }
`;

const NotFoundPage = () => {
  return (
    <Wrapper>
      <Card>
        <Badge>
          <Scale />
        </Badge>
        <Code>404</Code>
        <Title>Страница не найдена</Title>
        <Description>
          Похоже, такой страницы не существует. Возможно, она была перемещена
          или вы ошиблись в адресе.
        </Description>
        <Actions>
          <PrimaryLink to="/">
            <HomeIcon /> На главную
          </PrimaryLink>
          <GhostLink type="button" onClick={() => window.history.back()}>
            <ArrowLeft /> Назад
          </GhostLink>
        </Actions>
      </Card>
    </Wrapper>
  );
};

export default NotFoundPage;
