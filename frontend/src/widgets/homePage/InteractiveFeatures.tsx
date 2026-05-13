import styled from '@emotion/styled';
import { keyframes } from '@emotion/react';
import { useState } from 'react';
import { Zap, Bot, BarChart3, Shield, Cloud, CalendarCheck } from 'lucide-react';

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(24px); }
  to { opacity: 1; transform: translateY(0); }
`;

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
  font-family: var(--font-sans);
  line-height: 1.5;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;

  @media (max-width: 900px) {
    grid-template-columns: repeat(2, 1fr);
  }
  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

const Card = styled.div<{ $active: boolean }>`
  background: var(--color-bg-elevated);
  border: 1px solid ${({ $active }) => $active ? 'var(--color-primary)' : 'var(--color-border)'};
  border-radius: var(--radius-lg);
  padding: 28px;
  cursor: pointer;
  transition: all 0.25s var(--ease-out);

  &:hover {
    transform: translateY(-6px);
    box-shadow: var(--shadow-lg);
    border-color: var(--color-primary);
  }
`;

const IconBox = styled.div<{ $active: boolean }>`
  width: 52px;
  height: 52px;
  border-radius: var(--radius-md);
  background: ${({ $active }) => $active ? 'var(--color-primary)' : 'var(--color-primary-light)'};
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 18px;
  transition: all 0.25s;

  svg {
    width: 24px;
    height: 24px;
    color: ${({ $active }) => $active ? '#fff' : 'var(--color-primary)'};
    transition: color 0.25s;
  }
`;

const CardTitle = styled.h3`
  font-size: 18px;
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: 8px;
  font-family: var(--font-sans);
`;

const CardDesc = styled.p`
  font-size: 14px;
  color: var(--color-text-secondary);
  line-height: 1.6;
  font-family: var(--font-sans);
  margin-bottom: 18px;
`;

const Metric = styled.div`
  display: flex;
  align-items: baseline;
  gap: 6px;
  padding-top: 16px;
  border-top: 1px solid var(--color-border);
`;

const MetricVal = styled.span`
  font-size: 22px;
  font-weight: 800;
  color: var(--color-primary);
  font-family: var(--font-display);
`;

const MetricLabel = styled.span`
  font-size: 12px;
  color: var(--color-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-family: var(--font-sans);
`;

const features = [
  {
    icon: <Zap />,
    title: 'Молниеносная скорость',
    desc: 'Обрабатывайте документы и дела в 10 раз быстрее благодаря автоматизации',
    metric: '10x',
    metricLabel: 'Быстрее',
  },
  {
    icon: <Bot />,
    title: 'AI-ассистент',
    desc: 'Умный помощник анализирует документы и предлагает оптимальные решения',
    metric: '95%',
    metricLabel: 'Точность',
  },
  {
    icon: <BarChart3 />,
    title: 'Аналитика в реальном времени',
    desc: 'Отслеживайте все метрики и KPI вашего офиса в одном месте',
    metric: '24/7',
    metricLabel: 'Мониторинг',
  },
  {
    icon: <Shield />,
    title: 'Максимальная безопасность',
    desc: 'Шифрование данных и соответствие всем стандартам защиты информации',
    metric: '256-bit',
    metricLabel: 'Шифрование',
  },
  {
    icon: <Cloud />,
    title: 'Облачное хранилище',
    desc: 'Доступ к данным из любой точки мира с любого устройства',
    metric: '99.9%',
    metricLabel: 'Uptime',
  },
  {
    icon: <CalendarCheck />,
    title: 'Умное планирование',
    desc: 'Автоматическое распределение задач и оптимизация рабочего процесса',
    metric: '+40%',
    metricLabel: 'Эффективность',
  },
];

const InteractiveFeatures = () => {
  const [active, setActive] = useState<number | null>(null);

  return (
    <Section id="advantages">
      <SectionHeader>
        <SectionTitle>Почему выбирают нас</SectionTitle>
        <SectionSub>Передовые технологии для современных юридических офисов</SectionSub>
      </SectionHeader>
      <Grid>
        {features.map((f, i) => (
          <Card key={i} $active={active === i} onClick={() => setActive(active === i ? null : i)}>
            <IconBox $active={active === i}>{f.icon}</IconBox>
            <CardTitle>{f.title}</CardTitle>
            <CardDesc>{f.desc}</CardDesc>
            <Metric>
              <MetricVal>{f.metric}</MetricVal>
              <MetricLabel>{f.metricLabel}</MetricLabel>
            </Metric>
          </Card>
        ))}
      </Grid>
    </Section>
  );
};

export default InteractiveFeatures;
