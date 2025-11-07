import styled from '@emotion/styled';
import { keyframes } from '@emotion/react';
import Femida from '../../assets/Header/Femida.png';
import { Link } from 'react-router-dom';

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

const float = keyframes`
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-20px); }
`;

const rotate = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const pulse = keyframes`
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.05); opacity: 0.8; }
`;

const shimmer = keyframes`
  0% { background-position: -1000px 0; }
  100% { background-position: 1000px 0; }
`;

const scaleIn = keyframes`
  from { transform: scale(0.8); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
`;

const ContentWrapper = styled.div`
  max-width: 1200px;
  width: 100%;
  margin-top: 125px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  box-sizing: border-box;
  animation: ${fadeIn} 1s ease forwards;

  @media (max-width: 768px) {
    flex-direction: column;
    margin-top: 80px;
    padding: 0 10px;
  }
`;

const TextContent = styled.div`
  text-align: left;
  color: var(--color-primary);
  max-width: 50%;
  padding-right: 20px;
  animation: ${fadeIn} 1s ease forwards;
  animation-delay: 0.3s;
  opacity: 0;

  @media (max-width: 768px) {
    max-width: 100%;
    padding-right: 0;
    text-align: center;
  }
`;

const Tagline = styled.div`
  background: linear-gradient(135deg, #d4af37, #f5d97b);
  color: #fff;
  padding: 8px 20px;
  border-radius: 25px;
  font-size: 14px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  margin-bottom: 20px;
  box-shadow: 0 4px 15px rgba(212, 175, 55, 0.3);
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
    animation: ${shimmer} 3s infinite;
  }

  &::after {
    content: '✨';
    margin-left: 4px;
  }
`;

const Title = styled.h1`
  background: linear-gradient(135deg, #d4af37 0%, #f5d97b 50%, #d4af37 100%);
  background-size: 200% auto;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-size: 52px;
  font-weight: 800;
  line-height: 1.2;
  margin-bottom: 16px;
  animation: ${shimmer} 3s linear infinite;
  text-shadow: 0 0 30px rgba(212, 175, 55, 0.3);

  @media (max-width: 768px) {
    font-size: 36px;
  }

  @media (max-width: 480px) {
    font-size: 28px;
  }
`;

const Subtitle = styled.p`
  font-size: 18px;
  color: var(--color-muted);
  max-width: 400px;
  margin-bottom: 32px;

  @media (max-width: 768px) {
    font-size: 16px;
    max-width: 100%;
  }

  @media (max-width: 480px) {
    font-size: 14px;
  }
`;

const GetStartedButton = styled(Link)`
  background: linear-gradient(135deg, #d4af37, #f5d97b);
  color: #fff;
  border: none;
  padding: 14px 32px;
  border-radius: 30px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  text-decoration: none;
  display: inline-block;
  box-shadow: 0 4px 15px rgba(212, 175, 55, 0.4);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
    transition: left 0.5s;
  }

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(212, 175, 55, 0.6);
  }

  &:hover::before {
    left: 100%;
  }

  &:active {
    transform: translateY(0);
  }

  @media (max-width: 768px) {
    padding: 12px 24px;
    font-size: 14px;
  }
`;

const ImageWrapper = styled.div`
  position: relative;
  width: 500px;
  height: 500px;
  max-width: 100%;
  margin-left: auto;
  margin-right: auto;
  animation: ${float} 6s ease-in-out infinite;
  opacity: 0;
  animation: ${fadeIn} 1s ease forwards, ${float} 6s ease-in-out infinite 1s;

  @media (max-width: 768px) {
    width: 300px;
    height: 300px;
    margin-top: 20px;
  }
`;

const OuterCircle = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, rgba(212, 175, 55, 0.15), transparent 70%);
  border-radius: 50%;
  z-index: 0;
  animation: ${pulse} 4s ease-in-out infinite;

  @media (max-width: 768px) {
    width: 360px;
    height: 360px;
  }
`;

const RotatingRing = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 520px;
  height: 520px;
  border: 2px dashed rgba(212, 175, 55, 0.3);
  border-radius: 50%;
  animation: ${rotate} 20s linear infinite;
  z-index: 0;

  @media (max-width: 768px) {
    width: 320px;
    height: 320px;
  }
`;

const InnerCircle = styled.div`
  width: 100%;
  height: 100%;
  border-radius: 50%;
  overflow: hidden;
  border: 4px solid #d4af37;
  box-shadow: 
    0 0 30px rgba(212, 175, 55, 0.5),
    inset 0 0 20px rgba(212, 175, 55, 0.1);
  position: relative;
  z-index: 1;
  background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(212,175,55,0.05) 100%);
  animation: ${scaleIn} 1s ease forwards;
  animation-delay: 0.6s;
  transform: scale(0.8);
`;

const HeroImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  transition: transform 0.3s ease;

  &:hover {
    transform: scale(1.1);
  }

  @media (max-width: 768px) {
    object-fit: cover;
  }
`;

const FloatingParticle = styled.div<{ delay: number; duration: number; left: string; top: string }>`
  position: absolute;
  width: 8px;
  height: 8px;
  background: linear-gradient(135deg, #d4af37, #f5d97b);
  border-radius: 50%;
  left: ${props => props.left};
  top: ${props => props.top};
  animation: ${float} ${props => props.duration}s ease-in-out infinite;
  animation-delay: ${props => props.delay}s;
  opacity: 0.6;
  box-shadow: 0 0 10px rgba(212, 175, 55, 0.5);
  z-index: 0;
`;

const StatsContainer = styled.div`
  display: flex;
  gap: 30px;
  margin-top: 40px;
  animation: ${fadeIn} 1s ease forwards;
  animation-delay: 0.9s;
  opacity: 0;

  @media (max-width: 768px) {
    justify-content: center;
    gap: 20px;
  }

  @media (max-width: 480px) {
    flex-direction: column;
    align-items: center;
  }
`;

const StatItem = styled.div`
  text-align: center;
`;

const StatNumber = styled.div`
  font-size: 36px;
  font-weight: 800;
  background: linear-gradient(135deg, #d4af37, #f5d97b);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 4px;

  @media (max-width: 768px) {
    font-size: 28px;
  }
`;

const StatLabel = styled.div`
  font-size: 14px;
  color: var(--color-muted);
  font-weight: 500;

  @media (max-width: 768px) {
    font-size: 12px;
  }
`;

const HeroSection = () => {
  return (
    <ContentWrapper>
      <TextContent>
        <Tagline>Автоматизируйте работу вашего юридического офиса</Tagline>
        <Title>
          CRM для юридических офисов <br /> Будущее управления
        </Title>
        <Subtitle>
          Оптимизируйте процессы, управляйте клиентами и делами с нашей современной
          CRM-системой, созданной специально для юристов.
        </Subtitle>
        <GetStartedButton to="/auth">ПОПРОБОВАТЬ СЕЙЧАС →</GetStartedButton>
        
        <StatsContainer>
          <StatItem>
            <StatNumber>500+</StatNumber>
            <StatLabel>Довольных клиентов</StatLabel>
          </StatItem>
          <StatItem>
            <StatNumber>10K+</StatNumber>
            <StatLabel>Обработанных дел</StatLabel>
          </StatItem>
          <StatItem>
            <StatNumber>99%</StatNumber>
            <StatLabel>Удовлетворенность</StatLabel>
          </StatItem>
        </StatsContainer>
      </TextContent>
      <ImageWrapper>
        <FloatingParticle delay={0} duration={3} left="10%" top="20%" />
        <FloatingParticle delay={0.5} duration={4} left="80%" top="30%" />
        <FloatingParticle delay={1} duration={3.5} left="15%" top="70%" />
        <FloatingParticle delay={1.5} duration={4.5} left="85%" top="60%" />
        <FloatingParticle delay={2} duration={3.8} left="50%" top="10%" />
        <FloatingParticle delay={2.5} duration={4.2} left="50%" top="90%" />
        <OuterCircle />
        <RotatingRing />
        <InnerCircle>
          <HeroImage src={Femida} alt="Femida" />
        </InnerCircle>
      </ImageWrapper>
    </ContentWrapper>
  );
};

export default HeroSection;