import { useEffect, useRef } from 'react';
import styled, { keyframes } from 'styled-components';
import Rocket from '../../assets/Header/Rocket.png';
import Bag from '../../assets/Header/Bag.png';
import UserArrow from '../../assets/Header/User Arrows.png';
import CircleLayer from '../../assets/Header/Circle Layer.png';

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

const Section = styled.section`
  width: 100%;
  max-width: 1200px;
  margin: 150px auto;
  padding: 0 20px;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  overflow: hidden;
  opacity: 0;
  transform: translateY(20px);

  &.fade-in {
    animation: ${fadeIn} 1s ease forwards;
  }

  @media (max-width: 768px) {
    flex-direction: column;
    padding: 0 10px;
    margin: 80px auto;
  }
`;

const TextContainer = styled.div`
  flex: 1;
  text-align: left;
  max-width: 50%;
  min-width: 0;
  box-sizing: border-box;
  padding-right: 20px;
  opacity: 0;
  transform: translateY(20px);

  &.fade-in {
    animation: ${fadeIn} 1s ease forwards;
    animation-delay: 0.3s;
  }

  @media (max-width: 768px) {
    max-width: 100%;
    margin-bottom: 32px;
    padding-right: 0;
    text-align: center;
  }
`;

const Tagline = styled.div`
  background-color: var(--color-accent);
  color: var(--color-bg);
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 15px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: bold;
  margin-bottom: 20px;
`;

const Title = styled.h2`
  font-size: 48px;
  font-weight: bold;
  line-height: 1.2;
  margin-bottom: 16px;
  color: var(--color-accent);

  @media (max-width: 768px) {
    font-size: 36px;
  }

  @media (max-width: 480px) {
    font-size: 28px;
  }
`;

const Description = styled.p`
  font-size: 18px;
  margin-bottom: 32px;
  color: var(--color-muted);
  max-width: 400px;

  @media (max-width: 768px) {
    font-size: 16px;
    max-width: 100%;
  }

  @media (max-width: 480px) {
    font-size: 14px;
  }
`;

const CardGrid = styled.div`
  flex: 1;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  max-width: 50%;
  min-width: 0;
  box-sizing: border-box;
  opacity: 0;
  transform: translateY(20px);

  &.fade-in {
    animation: ${fadeIn} 1s ease forwards;
    animation-delay: 0.6s;
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    max-width: 100%;
  }

  @media (max-width: 480px) {
    gap: 12px;
  }
`;

const Card = styled.div`
  background: var(--color-bg-alt);
  border-radius: 8px;
  padding: 16px;
  width: 100%;
  max-width: 250px;
  text-align: left;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  box-sizing: border-box;
  flex-shrink: 1;
  border: 1px solid var(--color-accent-light);
  transition: transform 0.3s ease;

  &:hover {
    transform: translateY(-5px);
  }

  @media (max-width: 768px) {
    max-width: 100%;
  }
`;

const CardIcon = styled.div`
  width: 48px;
  height: 48px;
  background: var(--color-bg);
  border-radius: 50%;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-button-text);
  font-size: 24px;

  img {
    width: 32px;
    height: 32px;
    object-fit: contain;
  }
`;

const CardTitle = styled.h3`
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 8px;
  color: var(--color-text);
`;

const CardDescription = styled.p`
  font-size: 14px;
  line-height: 1.5;
  color: var(--color-muted);
`;

const FeaturesSection = () => {
  const sectionRef = useRef(null);
  const textContainerRef = useRef(null);
  const cardGridRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('fade-in');
          }
        });
      },
      { threshold: 0.2 }
    );

    if (sectionRef.current) observer.observe(sectionRef.current);
    if (textContainerRef.current) observer.observe(textContainerRef.current);
    if (cardGridRef.current) observer.observe(cardGridRef.current);

    return () => {
      if (sectionRef.current) observer.unobserve(sectionRef.current);
      if (textContainerRef.current) observer.unobserve(textContainerRef.current);
      if (cardGridRef.current) observer.unobserve(cardGridRef.current);
    };
  }, []);

  return (
    <Section ref={sectionRef} id="how-it-works">
      <TextContainer ref={textContainerRef}>
        <Tagline>Инновации для юристов</Tagline>
        <Title>Ваша юридическая CRM с AI</Title>
        <Description>
          Оптимизируйте работу офиса с нашей CRM, использующей искусственный интеллект для автоматизации и аналитики.
        </Description>
      </TextContainer>
      <CardGrid ref={cardGridRef}>
        <Card>
          <CardIcon><img src={Rocket} alt="AI Analytics" /></CardIcon>
          <CardTitle>AI-аналитика</CardTitle>
          <CardDescription>
            Прогнозируйте исходы дел и анализируйте данные с помощью искусственного интеллекта.
          </CardDescription>
        </Card>
        <Card>
          <CardIcon><img src={Bag} alt="Case Management" /></CardIcon>
          <CardTitle>Управление делами</CardTitle>
          <CardDescription>
            Удобно организуйте и отслеживайте дела с интуитивными инструментами.
          </CardDescription>
        </Card>
        <Card>
          <CardIcon><img src={UserArrow} alt="Client Collaboration" /></CardIcon>
          <CardTitle>Работа с клиентами</CardTitle>
          <CardDescription>
            Улучшайте коммуникацию через защищённые порталы и уведомления.
          </CardDescription>
        </Card>
        <Card>
          <CardIcon><img src={CircleLayer} alt="Automation" /></CardIcon>
          <CardTitle>Автоматизация</CardTitle>
          <CardDescription>
            Автоматизируйте рутину с AI, чтобы сосредоточиться на ключевых задачах.
          </CardDescription>
        </Card>
      </CardGrid>
    </Section>
  );
};

export default FeaturesSection;