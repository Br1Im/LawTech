import styled from '@emotion/styled';
import { keyframes } from '@emotion/react';
import { useState } from 'react';
import { Zap, Bot, BarChart3, Shield, Cloud, CalendarCheck } from 'lucide-react';

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
`;

const float = keyframes`
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-15px); }
`;

const glow = keyframes`
  0%, 100% { box-shadow: 0 0 20px rgba(212, 175, 55, 0.3); }
  50% { box-shadow: 0 0 40px rgba(212, 175, 55, 0.6); }
`;

const Container = styled.section`
  max-width: 1200px;
  width: 100%;
  padding: 80px 20px;
  margin: 0 auto;
  animation: ${fadeIn} 1s ease forwards;

  @media (max-width: 768px) {
    padding: 60px 20px;
  }
`;

const SectionTitle = styled.h2`
  text-align: center;
  font-size: 42px;
  font-weight: 800;
  background: linear-gradient(135deg, #d4af37, #f5d97b);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 20px;

  @media (max-width: 768px) {
    font-size: 32px;
  }
`;

const SectionSubtitle = styled.p`
  text-align: center;
  font-size: 18px;
  color: var(--color-muted);
  margin-bottom: 60px;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;

  @media (max-width: 768px) {
    font-size: 16px;
    margin-bottom: 40px;
  }
`;

const FeaturesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 30px;

  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 20px;
  }
`;

const FeatureCard = styled.div<{ isActive: boolean }>`
  background: ${props => props.isActive 
    ? 'linear-gradient(135deg, rgba(212, 175, 55, 0.1), rgba(245, 217, 123, 0.05))'
    : 'var(--color-bg-alt)'};
  border: 2px solid ${props => props.isActive ? '#d4af37' : 'var(--color-border)'};
  border-radius: 20px;
  padding: 30px;
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  animation: ${props => props.isActive ? glow : 'none'} 2s ease-in-out infinite;

  &::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(circle, rgba(212, 175, 55, 0.1), transparent 70%);
    opacity: ${props => props.isActive ? 1 : 0};
    transition: opacity 0.4s ease;
  }

  &:hover {
    transform: translateY(-10px) scale(1.02);
    border-color: #d4af37;
    box-shadow: 0 20px 40px rgba(212, 175, 55, 0.2);
  }

  @media (max-width: 768px) {
    padding: 20px;
  }
`;

const IconWrapper = styled.div<{ isActive: boolean }>`
  width: 70px;
  height: 70px;
  background: ${props => props.isActive
    ? 'linear-gradient(135deg, #d4af37, #f5d97b)'
    : 'var(--color-bg)'};
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
  transition: all 0.4s ease;
  animation: ${props => props.isActive ? float : 'none'} 3s ease-in-out infinite;
  box-shadow: ${props => props.isActive
    ? '0 10px 30px rgba(212, 175, 55, 0.4)'
    : '0 5px 15px rgba(0, 0, 0, 0.1)'};

  svg {
    width: 32px;
    height: 32px;
    color: ${props => props.isActive ? '#1a1a2e' : '#d4af37'};
  }

  @media (max-width: 768px) {
    width: 60px;
    height: 60px;
    svg {
      width: 28px;
      height: 28px;
    }
  }
`;

const FeatureTitle = styled.h3`
  font-size: 22px;
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: 12px;
  position: relative;
  z-index: 1;

  @media (max-width: 768px) {
    font-size: 18px;
  }
`;

const FeatureDescription = styled.p`
  font-size: 15px;
  color: var(--color-muted);
  line-height: 1.6;
  position: relative;
  z-index: 1;

  @media (max-width: 768px) {
    font-size: 14px;
  }
`;

const FeatureMetric = styled.div<{ isActive: boolean }>`
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid var(--color-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
  opacity: ${props => props.isActive ? 1 : 0.6};
  transition: opacity 0.4s ease;
`;

const MetricValue = styled.span`
  font-size: 24px;
  font-weight: 800;
  background: linear-gradient(135deg, #d4af37, #f5d97b);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;

  @media (max-width: 768px) {
    font-size: 20px;
  }
`;

const MetricLabel = styled.span`
  font-size: 12px;
  color: var(--color-muted);
  text-transform: uppercase;
  letter-spacing: 1px;
`;

const InteractiveFeatures = () => {
  const [activeCard, setActiveCard] = useState<number | null>(null);

  const features = [
    {
      icon: <Zap />,
      title: 'Молниеносная скорость',
      description: 'Обрабатывайте документы и дела в 10 раз быстрее благодаря автоматизации',
      metric: '10x',
      metricLabel: 'Быстрее'
    },
    {
      icon: <Bot />,
      title: 'AI-ассистент',
      description: 'Умный помощник анализирует документы и предлагает оптимальные решения',
      metric: '95%',
      metricLabel: 'Точность'
    },
    {
      icon: <BarChart3 />,
      title: 'Аналитика в реальном времени',
      description: 'Отслеживайте все метрики и KPI вашего офиса в одном месте',
      metric: '24/7',
      metricLabel: 'Мониторинг'
    },
    {
      icon: <Shield />,
      title: 'Максимальная безопасность',
      description: 'Шифрование данных и соответствие всем стандартам защиты информации',
      metric: '256-bit',
      metricLabel: 'Шифрование'
    },
    {
      icon: <Cloud />,
      title: 'Облачное хранилище',
      description: 'Доступ к данным из любой точки мира с любого устройства',
      metric: '99.9%',
      metricLabel: 'Uptime'
    },
    {
      icon: <CalendarCheck />,
      title: 'Умное планирование',
      description: 'Автоматическое распределение задач и оптимизация рабочего процесса',
      metric: '+40%',
      metricLabel: 'Эффективность'
    }
  ];

  return (
    <Container>
      <SectionTitle>Почему выбирают нас?</SectionTitle>
      <SectionSubtitle>
        Передовые технологии для современных юридических офисов
      </SectionSubtitle>
      
      <FeaturesGrid>
        {features.map((feature, index) => (
          <FeatureCard
            key={index}
            isActive={activeCard === index}
            onMouseEnter={() => setActiveCard(index)}
            onMouseLeave={() => setActiveCard(null)}
          >
            <IconWrapper isActive={activeCard === index}>
              {feature.icon}
            </IconWrapper>
            <FeatureTitle>{feature.title}</FeatureTitle>
            <FeatureDescription>{feature.description}</FeatureDescription>
            <FeatureMetric isActive={activeCard === index}>
              <div>
                <MetricValue>{feature.metric}</MetricValue>
                <br />
                <MetricLabel>{feature.metricLabel}</MetricLabel>
              </div>
            </FeatureMetric>
          </FeatureCard>
        ))}
      </FeaturesGrid>
    </Container>
  );
};

export default InteractiveFeatures;
