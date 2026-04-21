import { useEffect, useRef } from 'react';
import styled from '@emotion/styled';
import { keyframes } from '@emotion/react';
import Rocket from '../../assets/Header/Rocket.png';
import Bag from '../../assets/Header/Bag.png';
import UserArrow from '../../assets/Header/User Arrows.png';
import CircleLayer from '../../assets/Header/Circle Layer.png';

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const Section = styled.section`
  width: 100%;
  max-width: 1200px;
  margin: 120px auto;
  padding: 0 20px;
  box-sizing: border-box;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 48px;
  align-items: center;
  overflow: hidden;
  opacity: 0;
  transform: translateY(20px);

  &.fade-in {
    animation: ${fadeIn} 1s var(--ease-out) forwards;
  }

  @media (max-width: 960px) {
    grid-template-columns: 1fr;
    margin: 80px auto;
    text-align: center;
  }
`;

const TextContainer = styled.div`
  opacity: 0;
  transform: translateY(20px);

  &.fade-in {
    animation: ${fadeIn} 1s var(--ease-out) 0.2s forwards;
  }
`;

const Tagline = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--color-accent-light);
  color: var(--color-accent-dark);
  padding: 6px 14px;
  border-radius: var(--radius-pill);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-bottom: 18px;
  border: 1px solid rgba(212, 175, 55, 0.3);
`;

const Title = styled.h2`
  font-family: var(--font-display);
  font-size: clamp(32px, 4.2vw, 52px);
  font-weight: 800;
  line-height: 1.08;
  margin-bottom: 18px;
  color: var(--color-text);

  em {
    font-style: normal;
    background: var(--gradient-gold);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
`;

const Description = styled.p`
  font-size: 17px;
  margin-bottom: 24px;
  color: var(--color-text-secondary);
  max-width: 440px;
  line-height: 1.6;

  @media (max-width: 960px) {
    margin-left: auto;
    margin-right: auto;
  }
`;

const CardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 18px;
  opacity: 0;
  transform: translateY(20px);

  &.fade-in {
    animation: ${fadeIn} 1s var(--ease-out) 0.4s forwards;
  }

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

const Card = styled.div`
  background: var(--glass-bg);
  backdrop-filter: blur(14px) saturate(140%);
  -webkit-backdrop-filter: blur(14px) saturate(140%);
  border-radius: var(--radius-lg);
  padding: 24px 20px;
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-md);
  transition: transform 0.35s var(--ease-out), box-shadow 0.35s var(--ease-out), border-color 0.35s var(--ease-out);
  position: relative;
  overflow: hidden;
  text-align: left;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: var(--gradient-gold);
    opacity: 0;
    transition: opacity 0.3s var(--ease-out);
  }

  &:hover {
    transform: translateY(-8px);
    border-color: rgba(212, 175, 55, 0.45);
    box-shadow: var(--shadow-lg);
  }

  &:hover::before {
    opacity: 1;
  }
`;

const CardIcon = styled.div`
  width: 52px;
  height: 52px;
  background: var(--gradient-gold);
  border-radius: 14px;
  margin-bottom: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #1a1a1a;
  box-shadow: 0 8px 22px rgba(212, 175, 55, 0.35);

  img {
    width: 28px;
    height: 28px;
    object-fit: contain;
    filter: brightness(0) invert(1);
  }
`;

const CardTitle = styled.h3`
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 8px;
  color: var(--color-text);
  letter-spacing: -0.01em;
`;

const CardDescription = styled.p`
  font-size: 14px;
  line-height: 1.55;
  color: var(--color-text-secondary);
`;

const FeaturesSection = () => {
  const sectionRef = useRef<HTMLElement | null>(null);
  const textContainerRef = useRef<HTMLDivElement | null>(null);
  const cardGridRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('fade-in');
          }
        });
      },
      { threshold: 0.15 }
    );

    const section = sectionRef.current;
    const text = textContainerRef.current;
    const grid = cardGridRef.current;

    if (section) observer.observe(section);
    if (text) observer.observe(text);
    if (grid) observer.observe(grid);

    return () => {
      if (section) observer.unobserve(section);
      if (text) observer.unobserve(text);
      if (grid) observer.unobserve(grid);
    };
  }, []);

  return (
    <Section ref={sectionRef} id="advantages">
      <TextContainer ref={textContainerRef}>
        <Tagline>Преимущества</Tagline>
        <Title>
          Ваш <em>юридический офис</em> на автопилоте
        </Title>
        <Description>
          CRM с AI-ассистентом автоматизирует рутину, систематизирует документы
          и помогает принимать решения на основе данных.
        </Description>
      </TextContainer>
      <CardGrid ref={cardGridRef}>
        <Card>
          <CardIcon><img src={Rocket} alt="AI Analytics" /></CardIcon>
          <CardTitle>AI-аналитика</CardTitle>
          <CardDescription>
            Прогнозы исходов дел и анализ больших массивов данных на основе ML.
          </CardDescription>
        </Card>
        <Card>
          <CardIcon><img src={Bag} alt="Case Management" /></CardIcon>
          <CardTitle>Управление делами</CardTitle>
          <CardDescription>
            Удобно планируйте и отслеживайте дела, сроки и задачи команды.
          </CardDescription>
        </Card>
        <Card>
          <CardIcon><img src={UserArrow} alt="Client Collaboration" /></CardIcon>
          <CardTitle>Работа с клиентами</CardTitle>
          <CardDescription>
            Защищённые порталы, уведомления и единое окно коммуникации.
          </CardDescription>
        </Card>
        <Card>
          <CardIcon><img src={CircleLayer} alt="Automation" /></CardIcon>
          <CardTitle>Автоматизация</CardTitle>
          <CardDescription>
            Шаблоны документов, рассылки и сценарии AI для рутинных задач.
          </CardDescription>
        </Card>
      </CardGrid>
    </Section>
  );
};

export default FeaturesSection;
