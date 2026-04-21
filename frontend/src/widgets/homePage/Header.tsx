import styled from '@emotion/styled';
import { useState, useEffect } from 'react';
import { FiMoon, FiSun, FiUser, FiLogOut } from 'react-icons/fi';
import { Scale } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

interface MenuProps {
  $isOpen?: boolean;
}

interface BurgerIconProps {
  $isOpen?: boolean;
}

interface HeaderProps {
  main?: boolean;
  $scrolled?: boolean;
}

const HeaderLanding = styled.header<{ $scrolled?: boolean }>`
  height: ${({ $scrolled }) => ($scrolled ? '64px' : '76px')};
  background: ${({ $scrolled }) =>
    $scrolled
      ? 'var(--glass-bg-strong)'
      : 'var(--glass-bg)'};
  backdrop-filter: blur(18px) saturate(140%);
  -webkit-backdrop-filter: blur(18px) saturate(140%);
  border-bottom: 1px solid ${({ $scrolled }) => ($scrolled ? 'var(--color-border)' : 'transparent')};
  box-shadow: ${({ $scrolled }) => ($scrolled ? 'var(--shadow-md)' : 'none')};
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 56px;
  width: 100%;
  box-sizing: border-box;
  z-index: 1000;
  position: fixed;
  top: 0;
  left: 0;
  transition: all 0.3s var(--ease-out);

  @media (max-width: 1024px) {
    padding: 0 32px;
  }

  @media (max-width: 768px) {
    padding: 0 20px;
    height: 64px;
  }

  @media (max-width: 480px) {
    padding: 0 14px;
  }
`;

const LogoLandingContainer = styled(Link)`
  display: flex;
  align-items: center;
  gap: 12px;
  text-decoration: none;
  z-index: 20;
  transition: transform 0.25s var(--ease-out);

  &:hover {
    transform: translateY(-1px);
  }

  @media (max-width: 768px) {
    gap: 10px;
  }
`;

const LogoMark = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: var(--gradient-gold);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #1a1a1a;
  box-shadow: 0 6px 20px rgba(212, 175, 55, 0.35);
  position: relative;
  overflow: hidden;

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(255,255,255,0.35), transparent 50%);
    pointer-events: none;
  }

  svg {
    width: 22px;
    height: 22px;
    stroke-width: 2.2;
    position: relative;
    z-index: 1;
  }

  @media (max-width: 768px) {
    width: 34px;
    height: 34px;
    border-radius: 10px;
    svg { width: 18px; height: 18px; }
  }
`;

const LogoText = styled.span`
  font-family: var(--font-display);
  font-size: 22px;
  font-weight: 700;
  letter-spacing: 0.01em;
  background: var(--gradient-gold);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;

  @media (max-width: 768px) {
    font-size: 18px;
  }
`;

const MenuLanding = styled.nav<MenuProps>`
  display: flex;
  align-items: center;
  gap: 36px;

  @media (max-width: 768px) {
    position: fixed;
    top: 0;
    left: 0;
    height: 100vh;
    width: 100vw;
    background: var(--glass-bg-strong);
    backdrop-filter: blur(22px) saturate(140%);
    -webkit-backdrop-filter: blur(22px) saturate(140%);
    flex-direction: column;
    justify-content: center;
    align-items: center;
    transform: ${({ $isOpen }) => ($isOpen ? 'translateX(0)' : 'translateX(100%)')};
    transition: transform 0.35s var(--ease-out);
    padding: 40px 24px;
    z-index: 10;
  }
`;

const MenuLinkLanding = styled.a`
  font-family: var(--font-sans);
  font-size: 15px;
  font-weight: 500;
  color: var(--color-text-secondary);
  text-decoration: none;
  position: relative;
  transition: color 0.25s var(--ease-out);

  &::after {
    content: '';
    position: absolute;
    width: 0;
    height: 2px;
    bottom: -6px;
    left: 0;
    background: var(--gradient-gold);
    border-radius: 2px;
    transition: width 0.25s var(--ease-out);
  }

  &:hover {
    color: var(--color-accent);
  }

  &:hover::after {
    width: 100%;
  }

  @media (max-width: 768px) {
    font-size: 22px;
    padding: 14px 0;
    width: 100%;
    text-align: center;

    &::after {
      display: none;
    }
  }
`;

const ButtonGetStarted = styled(Link)`
  background: var(--gradient-gold);
  background-size: 200% auto;
  color: #ffffff;
  padding: 10px 22px;
  border-radius: var(--radius-pill);
  cursor: pointer;
  font-family: var(--font-sans);
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.01em;
  transition: all 0.3s var(--ease-out);
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  box-shadow: 0 8px 20px rgba(192, 155, 70, 0.3);

  &:hover {
    transform: translateY(-2px);
    background-position: right center;
    box-shadow: 0 12px 28px rgba(192, 155, 70, 0.4);
  }

  @media (max-width: 768px) {
    display: none;
  }
`;

const MobileButtonGetStarted = styled(ButtonGetStarted)`
  display: none;

  @media (max-width: 768px) {
    display: block;
    width: 70%;
    padding: 14px;
    font-size: 16px;
    margin-top: 16px;
    text-align: center;
  }
`;

const IconButton = styled.button`
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  width: 40px;
  height: 40px;
  cursor: pointer;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  color: var(--color-text-secondary);
  transition: all 0.25s var(--ease-out);

  &:hover {
    color: var(--color-accent);
    border-color: var(--color-accent);
    background: var(--color-bg-hover);
  }

  @media (max-width: 768px) {
    width: 36px;
    height: 36px;
    font-size: 16px;
  }
`;

const ProfileIconButton = styled(IconButton.withComponent(Link))`
  text-decoration: none;
`;

const BurgerButton = styled.button`
  display: none;
  background: none;
  border: none;
  cursor: pointer;
  z-index: 20;
  padding: 8px;

  &:focus {
    outline: none;
  }

  &:focus-visible {
    box-shadow: 0 0 0 2px var(--color-accent);
    border-radius: 4px;
  }

  @media (max-width: 768px) {
    display: block;
  }
`;

const BurgerIcon = styled.div<BurgerIconProps>`
  width: 22px;
  height: 2px;
  background-color: var(--color-text);
  position: relative;
  transition: background-color 0.3s var(--ease-out);

  &::before,
  &::after {
    content: '';
    position: absolute;
    width: 22px;
    height: 2px;
    background-color: var(--color-text);
    transition: transform 0.3s var(--ease-out);
  }

  &::before {
    top: -7px;
  }

  &::after {
    top: 7px;
  }

  ${({ $isOpen }) =>
    $isOpen &&
    `
    background-color: transparent;
    &::before {
      transform: rotate(45deg) translate(5px, 5px);
    }
    &::after {
      transform: rotate(-45deg) translate(5px, -5px);
    }
  `}
`;

const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const Header: React.FC<HeaderProps> = ({ main = true }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isDarkTheme, setIsDarkTheme] = useState<boolean>(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      return savedTheme === 'dark';
    }
    return document.documentElement.getAttribute('data-theme') === 'dark';
  });
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsAuthenticated(!!token);
  }, []);

  useEffect(() => {
    const theme = isDarkTheme ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [isDarkTheme]);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const toggleMenu = () => setIsMenuOpen((v) => !v);

  const toggleTheme = () => {
    setIsDarkTheme((v) => !v);
    setIsMenuOpen(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    setIsMenuOpen(false);
    navigate('/');
  };

  return (
    <HeaderLanding $scrolled={isScrolled}>
      <LogoLandingContainer to="/">
        <LogoMark>
          <Scale />
        </LogoMark>
        <LogoText>LawTech</LogoText>
      </LogoLandingContainer>

      <MenuLanding $isOpen={isMenuOpen}>
        {main && (
          <>
            <MenuLinkLanding href="#how-it-works" onClick={() => setIsMenuOpen(false)}>
              Инновации
            </MenuLinkLanding>
            <MenuLinkLanding href="#advantages" onClick={() => setIsMenuOpen(false)}>
              Преимущества
            </MenuLinkLanding>
            <MenuLinkLanding href="#faq" onClick={() => setIsMenuOpen(false)}>
              Вопросы и ответы
            </MenuLinkLanding>
            {!isAuthenticated && (
              <MobileButtonGetStarted to="/auth" onClick={() => setIsMenuOpen(false)}>
                Начать
              </MobileButtonGetStarted>
            )}
          </>
        )}
      </MenuLanding>

      <Actions>
        {isAuthenticated ? (
          <>
            <ProfileIconButton to="/profile" aria-label="Профиль">
              <FiUser />
            </ProfileIconButton>
            <IconButton onClick={handleLogout} aria-label="Выйти">
              <FiLogOut />
            </IconButton>
          </>
        ) : (
          <ButtonGetStarted to="/auth">Начать →</ButtonGetStarted>
        )}
        <IconButton onClick={toggleTheme} aria-label="Переключить тему">
          {isDarkTheme ? <FiSun /> : <FiMoon />}
        </IconButton>
        <BurgerButton onClick={toggleMenu} aria-label="Переключить меню">
          <BurgerIcon $isOpen={isMenuOpen} />
        </BurgerButton>
      </Actions>
    </HeaderLanding>
  );
};

export default Header;
