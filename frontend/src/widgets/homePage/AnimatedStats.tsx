import styled from '@emotion/styled';
import { keyframes } from '@emotion/react';
import { useState, useEffect, useRef } from 'react';
import { Users, FolderCheck, Zap, Award } from 'lucide-react';

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
`;

const pulse = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
`;

const shimmer = keyframes`
  0% { background-position: -1000px 0; }
  100% { background-position: 1000px 0; }
`;

const Container = styled.section`
  background: transparent;
  padding: 120px 20px 80px;
  position: relative;
  overflow: hidden;

  @media (max-width: 768px) {
    padding: 80px 20px 60px;
  }
`;

const Content = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
`;

const Title = styled.h2`
  font-family: var(--font-display);
  text-align: center;
  font-size: clamp(30px, 4vw, 46px);
  font-weight: 800;
  background: var(--gradient-gold);
  background-size: 200% auto;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 48px;
  animation: ${shimmer} 4s linear infinite;

  @media (max-width: 768px) {
    margin-bottom: 32px;
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 40px;

  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 30px;
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 20px;
  }
`;

const StatCard = styled.div`
  text-align: center;
  padding: 36px 20px;
  background: var(--glass-bg);
  backdrop-filter: blur(14px) saturate(140%);
  -webkit-backdrop-filter: blur(14px) saturate(140%);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-md);
  transition: transform 0.35s var(--ease-out), box-shadow 0.35s var(--ease-out), border-color 0.35s var(--ease-out);
  position: relative;
  overflow: hidden;
  animation: ${fadeIn} 0.8s var(--ease-out) forwards;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: var(--gradient-gold);
    background-size: 200% auto;
    animation: ${shimmer} 3s linear infinite;
  }

  &:hover {
    transform: translateY(-8px);
    border-color: rgba(212, 175, 55, 0.45);
    box-shadow: var(--shadow-lg);
  }

  @media (max-width: 768px) {
    padding: 30px 20px;
  }
`;

const StatIcon = styled.div`
  margin: 0 auto 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: 16px;
  background: var(--gradient-gold);
  color: #1a1a1a;
  box-shadow: 0 10px 24px rgba(212, 175, 55, 0.3);
  animation: ${pulse} 2.4s ease-in-out infinite;

  svg {
    width: 28px;
    height: 28px;
    stroke-width: 2.2;
  }

  @media (max-width: 768px) {
    width: 48px;
    height: 48px;
    margin-bottom: 14px;
    svg {
      width: 24px;
      height: 24px;
    }
  }
`;

const StatNumber = styled.div`
  font-family: var(--font-display);
  font-size: clamp(34px, 4vw, 46px);
  font-weight: 800;
  background: var(--gradient-gold);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: 1;
  margin-bottom: 8px;
  letter-spacing: -0.02em;
`;

const StatLabel = styled.div`
  font-size: 13px;
  color: var(--color-text);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;

  @media (max-width: 768px) {
    font-size: 12px;
  }
`;

const StatDescription = styled.div`
  font-size: 14px;
  color: var(--color-muted);
  margin-top: 10px;
  line-height: 1.5;

  @media (max-width: 768px) {
    font-size: 13px;
  }
`;

interface StatItemProps {
  icon: React.ReactNode;
  end: number;
  suffix: string;
  label: string;
  description: string;
  duration?: number;
}

const StatItem = ({ icon, end, suffix, label, description, duration = 2000 }: StatItemProps) => {
  const [count, setCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.3 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    let startTime: number;
    let animationFrame: number;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      setCount(Math.floor(easeOutQuart * end));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [isVisible, end, duration]);

  return (
    <StatCard ref={ref}>
      <StatIcon>{icon}</StatIcon>
      <StatNumber>
        {count}{suffix}
      </StatNumber>
      <StatLabel>{label}</StatLabel>
      <StatDescription>{description}</StatDescription>
    </StatCard>
  );
};

const AnimatedStats = () => {
  const stats = [
    {
      icon: <Users />,
      end: 500,
      suffix: '+',
      label: 'Клиентов',
      description: 'Довольных пользователей по всей России'
    },
    {
      icon: <FolderCheck />,
      end: 10000,
      suffix: '+',
      label: 'Дел',
      description: 'Успешно обработанных дел'
    },
    {
      icon: <Zap />,
      end: 99,
      suffix: '%',
      label: 'Uptime',
      description: 'Стабильность и надежность системы'
    },
    {
      icon: <Award />,
      end: 15,
      suffix: '+',
      label: 'Наград',
      description: 'За инновации в юридической сфере'
    }
  ];

  return (
    <Container>
      <Content>
        <Title>Цифры, которые говорят сами за себя</Title>
        <StatsGrid>
          {stats.map((stat, index) => (
            <StatItem key={index} {...stat} />
          ))}
        </StatsGrid>
      </Content>
    </Container>
  );
};

export default AnimatedStats;
