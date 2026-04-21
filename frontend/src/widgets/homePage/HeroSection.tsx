import styled from '@emotion/styled';
import { keyframes } from '@emotion/react';
import Femida from '../../assets/Header/Femida.png';
import { Link } from 'react-router-dom';
import { Sparkles, ShieldCheck, Cpu, Lock } from 'lucide-react';

const fadeInUp = keyframes`
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const float = keyframes`
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-18px); }
`;

const rotate = keyframes`
  from { transform: translate(-50%, -50%) rotate(0deg); }
  to   { transform: translate(-50%, -50%) rotate(360deg); }
`;

const pulse = keyframes`
  0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.9; }
  50%      { transform: translate(-50%, -50%) scale(1.06); opacity: 0.6; }
`;

const shimmer = keyframes`
  0%   { background-position: -1000px 0; }
  100% { background-position: 1000px 0; }
`;

const SectionWrap = styled.section`
  width: 100%;
  display: flex;
  justify-content: center;
  padding: 0 20px;
  position: relative;
  z-index: 1;
`;

const ContentWrapper = styled.div`
  max-width: 1200px;
  width: 100%;
  margin-top: 160px;
  margin-bottom: 60px;
  display: grid;
  grid-template-columns: 1.05fr 0.95fr;
  gap: 40px;
  align-items: center;
  box-sizing: border-box;

  @media (max-width: 960px) {
    grid-template-columns: 1fr;
    margin-top: 120px;
    text-align: center;
    gap: 24px;
  }

  @media (max-width: 768px) {
    margin-top: 100px;
    padding: 0 10px;
  }
`;

const TextContent = styled.div`
  animation: ${fadeInUp} 0.9s var(--ease-out) 0.1s forwards;
  opacity: 0;
`;

const Tagline = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: var(--glass-bg-strong);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  color: var(--color-accent-dark);
  padding: 8px 16px;
  border-radius: var(--radius-pill);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.01em;
  margin-bottom: 20px;
  border: 1px solid rgba(212, 175, 55, 0.35);
  box-shadow: 0 4px 14px rgba(212, 175, 55, 0.18);
  position: relative;
  overflow: hidden;

  svg {
    width: 14px;
    height: 14px;
    color: var(--color-accent);
  }

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent);
    background-size: 1000px 100%;
    animation: ${shimmer} 4s linear infinite;
    pointer-events: none;
  }
`;

const Title = styled.h1`
  font-family: var(--font-display);
  font-size: clamp(40px, 6vw, 68px);
  font-weight: 800;
  line-height: 1.05;
  letter-spacing: -0.02em;
  margin-bottom: 20px;
  color: var(--color-text);

  em {
    font-style: normal;
    background: var(--gradient-gold);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    display: inline-block;
  }
`;

const Subtitle = styled.p`
  font-size: 18px;
  color: var(--color-text-secondary);
  max-width: 520px;
  margin-bottom: 32px;
  line-height: 1.55;

  @media (max-width: 960px) {
    margin-left: auto;
    margin-right: auto;
  }

  @media (max-width: 480px) {
    font-size: 16px;
  }
`;

const Actions = styled.div`
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
  align-items: center;

  @media (max-width: 960px) {
    justify-content: center;
  }
`;

const GetStartedButton = styled(Link)`
  background: var(--gradient-gold);
  background-size: 200% auto;
  color: #fff;
  border: none;
  padding: 15px 30px;
  border-radius: var(--radius-pill);
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s var(--ease-out);
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 10px 28px rgba(212, 175, 55, 0.35);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
    transition: left 0.6s var(--ease-out);
  }

  &:hover {
    transform: translateY(-3px);
    background-position: right center;
    box-shadow: 0 16px 36px rgba(212, 175, 55, 0.45);
  }

  &:hover::before {
    left: 100%;
  }
`;

const SecondaryButton = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 14px 26px;
  border-radius: var(--radius-pill);
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text);
  background: var(--glass-bg);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid var(--color-border-strong);
  cursor: pointer;
  text-decoration: none;
  transition: all 0.3s var(--ease-out);

  &:hover {
    border-color: var(--color-accent);
    color: var(--color-accent);
    transform: translateY(-2px);
  }
`;

const TrustBadges = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  margin-top: 28px;
  color: var(--color-text-secondary);
  font-size: 13px;

  @media (max-width: 960px) {
    justify-content: center;
  }
`;

const Badge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  background: var(--glass-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);

  svg {
    width: 14px;
    height: 14px;
    color: var(--color-accent);
  }
`;

const StatsContainer = styled.div`
  display: flex;
  gap: 40px;
  margin-top: 40px;
  animation: ${fadeInUp} 0.9s var(--ease-out) 0.5s forwards;
  opacity: 0;
  border-top: 1px solid var(--color-border);
  padding-top: 28px;

  @media (max-width: 960px) {
    justify-content: center;
    gap: 28px;
  }

  @media (max-width: 480px) {
    flex-direction: column;
    align-items: center;
    gap: 18px;
  }
`;

const StatItem = styled.div`
  text-align: left;

  @media (max-width: 960px) {
    text-align: center;
  }
`;

const StatNumber = styled.div`
  font-family: var(--font-display);
  font-size: 34px;
  font-weight: 800;
  background: var(--gradient-gold);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: 1;
  margin-bottom: 6px;
`;

const StatLabel = styled.div`
  font-size: 13px;
  color: var(--color-text-secondary);
  font-weight: 500;
`;

const ImageWrapper = styled.div`
  position: relative;
  width: 100%;
  height: 520px;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: ${fadeInUp} 1s var(--ease-out) 0.3s forwards;
  opacity: 0;

  @media (max-width: 960px) {
    height: 400px;
  }

  @media (max-width: 480px) {
    height: 320px;
  }
`;

const BgGlow = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  width: 620px;
  height: 620px;
  transform: translate(-50%, -50%);
  background: radial-gradient(circle, rgba(212, 175, 55, 0.28), transparent 65%);
  border-radius: 50%;
  z-index: 0;
  animation: ${pulse} 4.5s ease-in-out infinite;

  @media (max-width: 960px) {
    width: 440px;
    height: 440px;
  }

  @media (max-width: 480px) {
    width: 360px;
    height: 360px;
  }
`;

const RotatingRing = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  width: 480px;
  height: 480px;
  border: 1px dashed rgba(212, 175, 55, 0.45);
  border-radius: 50%;
  z-index: 0;
  animation: ${rotate} 32s linear infinite;

  @media (max-width: 960px) {
    width: 360px;
    height: 360px;
  }

  @media (max-width: 480px) {
    width: 300px;
    height: 300px;
  }
`;

const ImageCard = styled.div`
  position: relative;
  z-index: 2;
  width: 360px;
  height: 360px;
  border-radius: 28px;
  background: var(--glass-bg-strong);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border: 1px solid rgba(212, 175, 55, 0.45);
  box-shadow:
    0 30px 80px rgba(212, 175, 55, 0.25),
    0 8px 28px rgba(15, 23, 42, 0.15),
    inset 0 0 0 1px rgba(255, 255, 255, 0.4);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  animation: ${float} 6s ease-in-out infinite;

  &::before {
    content: '';
    position: absolute;
    inset: -1px;
    border-radius: inherit;
    background: var(--gradient-gold);
    opacity: 0.7;
    z-index: -1;
    filter: blur(18px);
  }

  @media (max-width: 960px) {
    width: 300px;
    height: 300px;
  }

  @media (max-width: 480px) {
    width: 240px;
    height: 240px;
  }
`;

const HeroImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: contain;
  transition: transform 0.4s var(--ease-out);

  ${ImageCard}:hover & {
    transform: scale(1.04);
  }
`;

const OrbitingDot = styled.div<{ $delay: string; $radius: string; $duration: string }>`
  position: absolute;
  top: 50%;
  left: 50%;
  width: ${(p) => p.$radius};
  height: ${(p) => p.$radius};
  animation: ${rotate} ${(p) => p.$duration} linear infinite;
  animation-delay: ${(p) => p.$delay};
  transform-origin: center center;
  z-index: 1;
  pointer-events: none;

  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: var(--gradient-gold);
    box-shadow: 0 0 14px rgba(212, 175, 55, 0.75);
  }
`;

const HeroSection = () => {
  return (
    <SectionWrap>
      <ContentWrapper>
        <TextContent>
          <Tagline>
            <Sparkles /> Автоматизируйте работу юридического офиса
          </Tagline>
          <Title>
            CRM для юристов. <br />
            <em>Будущее управления</em> делами.
          </Title>
          <Subtitle>
            Современная AI-платформа для юридических компаний: клиенты, дела, документы
            и аналитика — всё в одном месте.
          </Subtitle>
          <Actions>
            <GetStartedButton to="/auth">Попробовать бесплатно →</GetStartedButton>
            <SecondaryButton href="#how-it-works">Как это работает</SecondaryButton>
          </Actions>
          <TrustBadges>
            <Badge><ShieldCheck /> ФЗ-152 · GDPR</Badge>
            <Badge><Cpu /> AI-поиск · FAISS</Badge>
            <Badge><Lock /> Шифрование end-to-end</Badge>
          </TrustBadges>

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
              <StatLabel>Удовлетворённость</StatLabel>
            </StatItem>
          </StatsContainer>
        </TextContent>

        <ImageWrapper>
          <BgGlow />
          <RotatingRing />
          <OrbitingDot $delay="0s" $radius="440px" $duration="26s" />
          <OrbitingDot $delay="-9s" $radius="380px" $duration="32s" />
          <OrbitingDot $delay="-18s" $radius="500px" $duration="40s" />
          <ImageCard>
            <HeroImage src={Femida} alt="Femida" />
          </ImageCard>
        </ImageWrapper>
      </ContentWrapper>
    </SectionWrap>
  );
};

export default HeroSection;
