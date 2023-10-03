import styled, { keyframes } from 'styled-components';
import Femida from '../../assets/Header/Femida.png';
import { Link } from 'react-router-dom';

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
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
  background-color: var(--color-accent);
  color: #fff;
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 15px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: bold;
  margin-bottom: 20px;
`;

const Title = styled.h1`
  color: var(--color-accent);
  font-size: 48px;
  font-weight: bold;
  line-height: 1.2;
  margin-bottom: 16px;

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
  background-color: var(--color-button-bg);
  color: var(--color-button-text);
  border: 1px solid var(--color-accent);
  padding: 12px 24px;
  border-radius: 4px;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  text-decoration: none;
  display: inline-block;

  &:hover {
    background-color: var(--color-bg);
    color: var(--color-accent);
    border: 1px solid var(--color-accent);
    transform: scale(1.05);
  }

  @media (max-width: 768px) {
    padding: 10px 20px;
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
  animation: ${fadeIn} 1s ease forwards;
  animation-delay: 0.6s;
  opacity: 0;

  @media (max-width: 768px) {
    width: 300px;
    height: 300px;
    margin-top: 20px;
  }
`;

const OuterCircle = styled.div`
  position: absolute;
  top: -40px;
  left: -60px;
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, rgba(212, 175, 55, 0.15), transparent 70%);
  border-radius: 50%;
  z-index: 0;

  @media (max-width: 768px) {
    width: 360px;
    height: 360px;
    top: -30px;
    left: -50px;
  }
`;

const InnerCircle = styled.div`
  width: 100%;
  height: 100%;
  border-radius: 50%;
  overflow: hidden;
  border: 4px solid #d4af37;
  box-shadow: 0 0 30px rgba(212, 175, 55, 0.5);
  position: relative;
  z-index: 1;
`;

const HeroImage = styled.img`
  width: 700px;
  height: auto;
  object-fit: cover;
  animation: pulse 5s ease-in-out infinite;

  @keyframes pulse {
    0%, 100% {
      transform: translate(-80px, 50px) scale(1);
    }
    50% {
      transform: translate(-80px, 50px) scale(1.05);
    }
  }

  @media (max-width: 768px) {
    width: 400px;

    @keyframes pulse {
    0%, 100% {
      transform: translate(-50px, 40px) scale(1);
    }
    50% {
      transform: translate(-50px, 40px) scale(1.05);
    }
  }
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
        <GetStartedButton to="/auth">ПОПРОБОВАТЬ СЕЙЧАС</GetStartedButton>
      </TextContent>
      <ImageWrapper>
        <OuterCircle />
        <InnerCircle>
          <HeroImage src={Femida} alt="Femida" />
        </InnerCircle>
      </ImageWrapper>
    </ContentWrapper>
  );
};

export default HeroSection;