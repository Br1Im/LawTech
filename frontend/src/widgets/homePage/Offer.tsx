import styled from '@emotion/styled';
import { keyframes } from '@emotion/react';
import { Link } from 'react-router-dom';
import { Check, ArrowRight } from 'lucide-react';

const Section = styled.section`
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 80px 24px;

  @media (max-width: 768px) {
    padding: 60px 20px;
  }
`;

const SectionHeader = styled.div`
  text-align: center;
  margin-bottom: 56px;
`;

const SectionTitle = styled.h2`
  font-family: var(--font-display);
  font-size: clamp(28px, 3.5vw, 40px);
  font-weight: 800;
  color: var(--color-text);
  margin-bottom: 12px;
  letter-spacing: -0.8px;
`;

const SectionSub = styled.p`
  font-size: 16px;
  color: var(--color-text-secondary);
  max-width: 500px;
  margin: 0 auto;
  line-height: 1.5;
  font-family: var(--font-sans);
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  align-items: start;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
    max-width: 480px;
    margin: 0 auto;
  }
`;

const PlanCard = styled.div<{ $featured?: boolean }>`
  background: ${({ $featured }) => $featured ? 'var(--color-primary)' : 'var(--color-bg-elevated)'};
  border: 1px solid ${({ $featured }) => $featured ? 'var(--color-primary)' : 'var(--color-border)'};
  border-radius: var(--radius-lg);
  padding: 32px 28px;
  position: relative;
  transition: all 0.25s var(--ease-out);

  &:hover {
    transform: translateY(-6px);
    box-shadow: var(--shadow-xl);
  }
`;

const PlanBadge = styled.div`
  position: absolute;
  top: -12px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--color-warning);
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  padding: 4px 14px;
  border-radius: var(--radius-pill);
  font-family: var(--font-sans);
  white-space: nowrap;
`;

const PlanName = styled.h3<{ $light?: boolean }>`
  font-size: 20px;
  font-weight: 700;
  color: ${({ $light }) => $light ? '#fff' : 'var(--color-text)'};
  margin-bottom: 4px;
  font-family: var(--font-sans);
`;

const PlanDesc = styled.p<{ $light?: boolean }>`
  font-size: 14px;
  color: ${({ $light }) => $light ? 'rgba(255,255,255,0.8)' : 'var(--color-text-secondary)'};
  margin-bottom: 20px;
  font-family: var(--font-sans);
`;

const PlanPrice = styled.div<{ $light?: boolean }>`
  font-size: 36px;
  font-weight: 800;
  color: ${({ $light }) => $light ? '#fff' : 'var(--color-text)'};
  font-family: var(--font-display);
  margin-bottom: 4px;
  letter-spacing: -1px;

  span {
    font-size: 16px;
    font-weight: 500;
    color: ${({ $light }) => $light ? 'rgba(255,255,255,0.7)' : 'var(--color-muted)'};
  }
`;

const PlanPeriod = styled.div<{ $light?: boolean }>`
  font-size: 13px;
  color: ${({ $light }) => $light ? 'rgba(255,255,255,0.6)' : 'var(--color-muted)'};
  margin-bottom: 24px;
  font-family: var(--font-sans);
`;

const FeatureList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0 0 24px;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const FeatureItem = styled.li<{ $light?: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  color: ${({ $light }) => $light ? 'rgba(255,255,255,0.9)' : 'var(--color-text-secondary)'};
  font-family: var(--font-sans);

  svg {
    width: 16px;
    height: 16px;
    color: ${({ $light }) => $light ? '#fff' : 'var(--color-success)'};
    flex-shrink: 0;
  }
`;

const PlanButton = styled(Link)<{ $light?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 12px;
  border-radius: var(--radius-md);
  font-size: 15px;
  font-weight: 600;
  text-decoration: none;
  font-family: var(--font-sans);
  transition: all 0.2s;
  border: none;
  background: ${({ $light }) => $light ? '#fff' : 'var(--color-primary)'};
  color: ${({ $light }) => $light ? 'var(--color-primary)' : '#fff'};

  &:hover {
    opacity: 0.9;
    transform: translateY(-1px);
  }

  svg { width: 16px; height: 16px; }
`;

const plans = [
  {
    name: 'Старт',
    desc: 'Для небольших практик',
    price: 'Бесплатно',
    period: 'До 3 сотрудников',
    features: ['Управление клиентами', 'Базовая аналитика', 'Документооборот', '1 ГБ хранилище'],
  },
  {
    name: 'Бизнес',
    desc: 'Самый популярный',
    price: '4 990 ₽',
    priceSuffix: '/мес',
    period: 'До 20 сотрудников',
    featured: true,
    badge: 'Популярный',
    features: ['Всё из «Старт»', 'AI-ассистент', 'Расширенная аналитика', '50 ГБ хранилище', 'Приоритетная поддержка'],
  },
  {
    name: 'Корпорация',
    desc: 'Для крупных фирм',
    price: 'По запросу',
    period: 'Безлимит сотрудников',
    features: ['Всё из «Бизнес»', 'Выделенный сервер', 'SLA 99.9%', 'Интеграция с 1C', 'Персональный менеджер'],
  },
];

const Offer = () => (
  <Section>
    <SectionHeader>
      <SectionTitle>Тарифы</SectionTitle>
      <SectionSub>Выберите план, который подходит вашей практике</SectionSub>
    </SectionHeader>
    <Grid>
      {plans.map((p, i) => (
        <PlanCard key={i} $featured={p.featured}>
          {p.badge && <PlanBadge>{p.badge}</PlanBadge>}
          <PlanName $light={p.featured}>{p.name}</PlanName>
          <PlanDesc $light={p.featured}>{p.desc}</PlanDesc>
          <PlanPrice $light={p.featured}>
            {p.price}{p.priceSuffix && <span>{p.priceSuffix}</span>}
          </PlanPrice>
          <PlanPeriod $light={p.featured}>{p.period}</PlanPeriod>
          <FeatureList>
            {p.features.map((f, fi) => (
              <FeatureItem key={fi} $light={p.featured}><Check />{f}</FeatureItem>
            ))}
          </FeatureList>
          <PlanButton to="/auth" $light={p.featured}>
            Начать <ArrowRight />
          </PlanButton>
        </PlanCard>
      ))}
    </Grid>
  </Section>
);

export default Offer;
