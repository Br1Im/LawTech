import styled from '@emotion/styled';
import { keyframes } from '@emotion/react';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';

const shine = keyframes`
  0%   { background-position: 0% 50%; }
  100% { background-position: 200% 50%; }
`;

const Section = styled.section`
  width: 100%;
  padding: 120px 24px;
  display: flex;
  justify-content: center;
  position: relative;
  z-index: 1;

  @media (max-width: 768px) {
    padding: 80px 20px;
  }
`;

const Card = styled.div`
  max-width: 1040px;
  width: 100%;
  position: relative;
  padding: 72px 56px;
  border-radius: var(--radius-xl);
  background:
    radial-gradient(circle at 85% 15%, rgba(212, 175, 55, 0.38), transparent 55%),
    radial-gradient(circle at 10% 110%, rgba(0, 113, 227, 0.32), transparent 55%),
    linear-gradient(145deg, #0c0d10 0%, #17191f 100%);
  color: #fff;
  overflow: hidden;
  text-align: center;
  box-shadow:
    0 40px 80px rgba(15, 23, 42, 0.28),
    inset 0 0 0 1px rgba(255, 255, 255, 0.06);

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px);
    background-size: 48px 48px;
    mask-image: radial-gradient(ellipse at 50% 0%, black 40%, transparent 80%);
    -webkit-mask-image: radial-gradient(ellipse at 50% 0%, black 40%, transparent 80%);
    opacity: 0.7;
    pointer-events: none;
  }

  @media (max-width: 768px) {
    padding: 56px 28px;
  }
`;

const Inner = styled.div`
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 22px;
`;

const Eyebrow = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  border-radius: var(--radius-pill);
  background: rgba(212, 175, 55, 0.14);
  border: 1px solid rgba(212, 175, 55, 0.35);
  color: #f5d97b;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;

  svg { width: 14px; height: 14px; }
`;

const Title = styled.h2`
  font-family: var(--font-display);
  font-size: clamp(36px, 5vw, 64px);
  font-weight: 800;
  line-height: 1.05;
  letter-spacing: -0.03em;
  margin: 0;
  max-width: 780px;

  em {
    font-style: italic;
    background: linear-gradient(135deg, #d4af37, #f5d97b, #d4af37);
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: ${shine} 5s linear infinite;
  }
`;

const Subtitle = styled.p`
  font-size: 18px;
  line-height: 1.55;
  color: rgba(255, 255, 255, 0.72);
  margin: 0;
  max-width: 580px;
`;

const Actions = styled.div`
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
  justify-content: center;
  margin-top: 8px;
`;

const Primary = styled(Link)`
  padding: 16px 34px;
  border-radius: var(--radius-pill);
  background: var(--gradient-gold);
  background-size: 200% auto;
  color: #111;
  font-weight: 700;
  font-size: 16px;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  box-shadow: 0 14px 32px rgba(212, 175, 55, 0.42);
  transition: all 0.3s var(--ease-out);

  &:hover {
    transform: translateY(-3px);
    background-position: right center;
    box-shadow: 0 20px 40px rgba(212, 175, 55, 0.55);
  }

  svg { width: 18px; height: 18px; }
`;

const Secondary = styled.a`
  padding: 15px 28px;
  border-radius: var(--radius-pill);
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  font-weight: 600;
  font-size: 15px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  text-decoration: none;
  transition: all 0.3s var(--ease-out);

  &:hover {
    background: rgba(255, 255, 255, 0.14);
    border-color: rgba(212, 175, 55, 0.5);
  }
`;

const TrustRow = styled.div`
  display: flex;
  gap: 28px;
  flex-wrap: wrap;
  justify-content: center;
  padding-top: 14px;
  color: rgba(255, 255, 255, 0.55);
  font-size: 13px;

  span::before {
    content: '· ';
    color: var(--color-accent);
    margin-right: 6px;
  }

  span:first-of-type::before {
    content: '✓ ';
  }
`;

const FinalCTA = () => {
  return (
    <Section>
      <Card>
        <Inner>
          <Eyebrow>
            <Sparkles /> Готовы попробовать?
          </Eyebrow>
          <Title>
            Перестаньте жить в Excel. <em>Начните работать</em> в LawTech.
          </Title>
          <Subtitle>
            Бесплатные 14 дней, миграция под ключ, обучение команды.
            Первые результаты — уже к концу недели.
          </Subtitle>
          <Actions>
            <Primary to="/auth">
              Начать бесплатно <ArrowRight />
            </Primary>
            <Secondary href="#product">Посмотреть продукт</Secondary>
          </Actions>
          <TrustRow>
            <span>Без карты</span>
            <span>Миграция бесплатно</span>
            <span>Отмена в 1 клик</span>
          </TrustRow>
        </Inner>
      </Card>
    </Section>
  );
};

export default FinalCTA;
