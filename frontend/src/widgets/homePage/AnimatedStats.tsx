import styled from '@emotion/styled';
import { keyframes } from '@emotion/react';
import { useState, useEffect, useRef } from 'react';

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
  background: linear-gradient(135deg, rgba(212, 175, 55, 0.05), rgba(245, 217, 123, 0.02));
  padding: 80px 20px;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: 
      radial-gradient(circle at 20% 50%, rgba(212, 175, 55, 0.1) 0%, transparent 50%),
      radial-gradient(circle at 80% 50%, rgba(245, 217, 123, 0.1) 0%, transparent 50%);
    pointer-events: none;
  }

  @media (max-width: 768px) {
    padding: 60px 20px;
  }
`;

const Content = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
`;

const Title = styled.h2`
  text-align: center;
  font-size: 42px;
  font-weight: 800;
  background: linear-gradient(135deg, #d4af37 0%, #f5d97b 50%, #d4af37 100%);
  background-size: 200% auto;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 60px;
  animation: ${shimmer} 3s linear infinite;

  @media (max-width: 768px) {
    font-size: 32px;
    margin-bottom: 40px;
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
  padding: 40px 20px;
  background: var(--color-bg-alt);
  border-radius: 20px;
  border: 2px solid transparent;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  animation: ${fadeIn} 0.8s ease forwards;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, #d4af37, #f5d97b, #d4af37);
    background-size: 200% auto;
    animation: ${shimmer} 3s linear infinite;
  }

  &:hover {
    transform: translateY(-10px);
    border-color: #d4af37;
    box-shadow: 0 20px 40px rgba(212, 175, 55, 0.2);
  }

  @media (max-width: 768px) {
    padding: 30px 20px;
  }
`;

const StatIcon = styled.div`
  font-size: 48px;
  margin-bottom: 20px;
  animation: ${pulse} 2s ease-in-out infinite;

  @media (max-width: 768px) {
    font-size: 40px;
    margin-bottom: 15px;
  }
`;

const StatNumber = styled.div`
  font-size: 48px;
  font-weight: 800;
  background: linear-gradient(135deg, #d4af37, #f5d97b);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 10px;
  font-family: 'Arial', sans-serif;

  @media (max-width: 768px) {
    font-size: 36px;
  }
`;

const StatLabel = styled.div`
  font-size: 16px;
  color: var(--color-muted);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;

  @media (max-width: 768px) {
    font-size: 14px;
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
  icon: string;
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
      icon: '👥',
      end: 500,
      suffix: '+',
      label: 'Клиентов',
      description: 'Довольных пользователей по всей России'
    },
    {
      icon: '📁',
      end: 10000,
      suffix: '+',
      label: 'Дел',
      description: 'Успешно обработанных дел'
    },
    {
      icon: '⚡',
      end: 99,
      suffix: '%',
      label: 'Uptime',
      description: 'Стабильность и надежность системы'
    },
    {
      icon: '🏆',
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
