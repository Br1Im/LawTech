import styled from '@emotion/styled';
import { keyframes } from '@emotion/react';
import { Brain, Briefcase, Users, Workflow } from 'lucide-react';

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(24px); }
  to { opacity: 1; transform: translateY(0); }
`;

const Section = styled.section`
  width: 100%;
  background: var(--color-bg-alt);
  padding: 80px 24px;

  @media (max-width: 768px) {
    padding: 60px 20px;
  }
`;

const Inner = styled.div`
  max-width: 1200px;
  margin: 0 auto;
`;

const SectionHeader = styled.div`
  text-align: center;
  margin-bottom: 56px;
`;

const Eyebrow = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: var(--color-primary);
  text-transform: uppercase;
  letter-spacing: 1.5px;
  margin-bottom: 12px;
  font-family: var(--font-sans);
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
  max-width: 520px;
  margin: 0 auto;
  line-height: 1.5;
  font-family: var(--font-sans);
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;

  @media (max-width: 700px) {
    grid-template-columns: 1fr;
  }
`;

const Card = styled.div`
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 32px;
  display: flex;
  gap: 20px;
  transition: all 0.25s var(--ease-out);

  &:hover {
    transform: translateY(-4px);
    box-shadow: var(--shadow-lg);
    border-color: var(--color-primary);
  }

  @media (max-width: 500px) {
    flex-direction: column;
    padding: 24px;
  }
`;

const CardIcon = styled.div`
  width: 52px;
  height: 52px;
  min-width: 52px;
  border-radius: var(--radius-md);
  background: var(--color-primary-light);
  display: flex;
  align-items: center;
  justify-content: center;

  svg {
    width: 24px;
    height: 24px;
    color: var(--color-primary);
  }
`;

const CardBody = styled.div``;

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
`;

const items = [
  {
    icon: <Brain />,
    title: 'AI-аналитика',
    desc: 'Прогнозируйте исходы дел и анализируйте данные с помощью искусственного интеллекта. Система обучается на вашей практике.',
  },
  {
    icon: <Briefcase />,
    title: 'Управление делами',
    desc: 'Удобно организуйте и отслеживайте все дела с интуитивными инструментами. Полная история, задачи и сроки в одном месте.',
  },
  {
    icon: <Users />,
    title: 'Работа с клиентами',
    desc: 'Улучшайте коммуникацию через защищённые порталы, автоматические уведомления и историю взаимодействий.',
  },
  {
    icon: <Workflow />,
    title: 'Автоматизация процессов',
    desc: 'Автоматизируйте рутинные задачи с AI — шаблоны документов, напоминания, расчёты и отчётность.',
  },
];

const FeaturesSection = () => (
  <Section id="features">
    <Inner>
      <SectionHeader>
        <Eyebrow>Возможности</Eyebrow>
        <SectionTitle>Всё для вашей практики</SectionTitle>
        <SectionSub>
          Инструменты, которые помогут вашему офису работать эффективнее
        </SectionSub>
      </SectionHeader>
      <Grid>
        {items.map((item, i) => (
          <Card key={i}>
            <CardIcon>{item.icon}</CardIcon>
            <CardBody>
              <CardTitle>{item.title}</CardTitle>
              <CardDesc>{item.desc}</CardDesc>
            </CardBody>
          </Card>
        ))}
      </Grid>
    </Inner>
  </Section>
);

export default FeaturesSection;
