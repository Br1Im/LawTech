import Header from '../widgets/homePage/Header';
import HeroSection from '../widgets/homePage/HeroSection';
import LogoStrip from '../widgets/homePage/LogoStrip';
import ProductShowcase from '../widgets/homePage/FeaturesSection';
import BentoFeatures from '../widgets/homePage/InteractiveFeatures';
import AnimatedStats from '../widgets/homePage/AnimatedStats';
import Testimonials from '../widgets/homePage/Offer';
import FAQ from '../widgets/homePage/FAQ';
import FinalCTA from '../widgets/homePage/FinalCTA';
import Footer from '../widgets/homePage/Footer';
import ThemeToggle from '../components/ui/ThemeToggle';
import styled from '@emotion/styled';
import { keyframes } from '@emotion/react';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

const blobFloat = keyframes`
  0%, 100% { transform: translate(0, 0) scale(1); }
  33%      { transform: translate(40px, -30px) scale(1.08); }
  66%      { transform: translate(-30px, 40px) scale(0.95); }
`;

const LandingMainContainer = styled.div`
  background-color: transparent;
  min-height: 100vh;
  width: 100%;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-sizing: border-box;
  overflow: hidden;
`;

const Blob = styled.div<{ $top: string; $left: string; $size: string; $color: string; $delay?: string }>`
  position: absolute;
  top: ${(p) => p.$top};
  left: ${(p) => p.$left};
  width: ${(p) => p.$size};
  height: ${(p) => p.$size};
  border-radius: 50%;
  filter: blur(80px);
  background: ${(p) => p.$color};
  opacity: 0.65;
  z-index: -1;
  pointer-events: none;
  animation: ${blobFloat} 18s ease-in-out infinite;
  animation-delay: ${(p) => p.$delay ?? '0s'};
`;

const GridOverlay = styled.div`
  position: absolute;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  background-image:
    linear-gradient(var(--color-border) 1px, transparent 1px),
    linear-gradient(90deg, var(--color-border) 1px, transparent 1px);
  background-size: 56px 56px;
  mask-image: radial-gradient(ellipse at 50% 0%, black 30%, transparent 75%);
  -webkit-mask-image: radial-gradient(ellipse at 50% 0%, black 30%, transparent 75%);
  opacity: 0.55;
`;

const Home = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');

    if (token) {
      navigate('/crm');
    }
  }, [navigate]);

  return (
    <LandingMainContainer>
      <GridOverlay />
      <Blob $top="-120px" $left="-120px" $size="520px" $color="radial-gradient(circle, rgba(212,175,55,0.35), transparent 70%)" />
      <Blob $top="200px" $left="80%" $size="440px" $color="radial-gradient(circle, rgba(0,113,227,0.22), transparent 70%)" $delay="3s" />
      <Blob $top="1400px" $left="-100px" $size="560px" $color="radial-gradient(circle, rgba(245,217,123,0.30), transparent 70%)" $delay="6s" />
      <Blob $top="2600px" $left="70%" $size="520px" $color="radial-gradient(circle, rgba(212,175,55,0.28), transparent 70%)" $delay="9s" />

      <Header />
      <HeroSection />
      <LogoStrip />
      <ProductShowcase />
      <BentoFeatures />
      <AnimatedStats />
      <Testimonials />
      <FAQ />
      <FinalCTA />
      <Footer />
      <ThemeToggle />
    </LandingMainContainer>
  );
};

export default Home;
