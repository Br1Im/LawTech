import Header from '../widgets/homePage/Header';
import HeroSection from '../widgets/homePage/HeroSection';
import FeaturesSection from '../widgets/homePage/FeaturesSection';
import Offer from '../widgets/homePage/Offer';
import FAQ from '../widgets/homePage/FAQ';
import Footer from '../widgets/homePage/Footer';
import styled from '@emotion/styled';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

interface LandingMainContainerProps {
  bg?: string;
}

const LandingMainContainer = styled.div<LandingMainContainerProps>`
  background-color: var(--color-bg);
  min-height: 100vh;
  width: 100vw;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-sizing: border-box;
`;

const Home = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');

    if (token) {
      navigate('/crm');
    }
  }, [navigate])


  return (
    <LandingMainContainer bg="../assets/bg.jpg">
      <Header />
      <HeroSection />
      <FeaturesSection />
      <Offer />
      <FAQ />
      <Footer />
    </LandingMainContainer>
  );
};

export default Home;