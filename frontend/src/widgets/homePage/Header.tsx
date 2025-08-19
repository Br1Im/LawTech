import styled from '@emotion/styled';
import { useState, useEffect } from 'react';
import { FiMoon, FiSun, FiUser, FiLogOut } from 'react-icons/fi';
import { Link, useNavigate } from 'react-router-dom';

interface MenuProps {
  $isOpen?: boolean;
}

interface BurgerIconProps {
  $isOpen?: boolean;
}

interface HeaderProps {
  main?: boolean;
}

const HeaderLanding = styled.header`
  height: 70px;
  background-color: var(--color-header-bg);
  border-bottom: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 80px;
  width: 100vw;
  box-sizing: border-box;
  z-index: 1000;
  position: fixed;
  top: 0;
  left: 0;
  transition: all 0.3s ease;

  @media (max-width: 1024px) {
    padding: 0 40px;
  }

  @media (max-width: 768px) {
    padding: 0 24px;
    height: 64px;
  }

  @media (max-width: 480px) {
    padding: 0 16px;
  }
`;

const LogoLandingContainer = styled.a`
  display: flex;
  align-items: center;
  gap: 12px;
  text-decoration: none;
  z-index: 20;

  @media (max-width: 768px) {
    gap: 8px;
  }
`;

const LogoLanding = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: var(--color-accent);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.3s ease;

  &:hover {
    transform: scale(1.1);
  }

  @media (max-width: 768px) {
    width: 32px;
    height: 32px;
  }
`;

const LogoText = styled.span`
  font-family: 'Arial', sans-serif;
  font-size: 20px;
  font-weight: bold;
  color: #ffffff;

  @media (max-width: 768px) {
    font-size: 16px;
  }
`;

const MenuLanding = styled.nav<MenuProps>`
  display: flex;
  align-items: center;
  gap: 32px;

  @media (max-width: 768px) {
    position: fixed;
    top: 0;
    left: 0;
    height: 100vh;
    width: 100vw;
    background-color: var(--color-header-bg);
    flex-direction: column;
    justify-content: center;
    align-items: center;
    transform: ${({ $isOpen }) => ($isOpen ? 'translateX(0)' : 'translateX(100%)')};
    transition: transform 0.3s ease-in-out;
    padding: 40px 24px;
    z-index: 10;
  }
`;

const MenuLinkLanding = styled.a`
  font-family: 'Arial', sans-serif;
  font-size: 16px;
  color: var(--color-muted);
  text-decoration: none;
  position: relative;
  transition: color 0.3s ease-in-out;

  &::after {
    content: '';
    position: absolute;
    width: 0;
    height: 2px;
    bottom: -4px;
    left: 0;
    background-color: var(--color-accent);
    transition: width 0.3s ease-in-out;
  }

  &:hover {
    color: var(--color-accent);
  }

  &:hover::after {
    width: 100%;
  }

  @media (max-width: 768px) {
    font-size: 24px;
    padding: 16px 0;
    width: 100%;
    text-align: center;

    &::after {
      display: none;
    }
  }
`;

const ButtonGetStarted = styled(Link)`
  background-color: var(--color-button-bg);
  color: var(--color-button-text);
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-family: 'Arial', sans-serif;
  font-size: 16px;
  transition: all 0.3s ease-in-out;
  text-decoration: none;
  display: inline-block;

  &:hover {
    background-color: var(--color-bg);
    color: var(--color-accent);
    transform: scale(1.05);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    border: 1px solid var(--color-accent);
  }

  @media (max-width: 768px) {
    display: none;
  }
`;

const MobileButtonGetStarted = styled(ButtonGetStarted)`
  display: none;

  @media (max-width: 768px) {
    display: block;
    width: 80%;
    padding: 12px;
    font-size: 18px;
    margin-top: 16px;
  }
`;

const ThemeIconButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  padding: 10px;
  font-size: 24px;
  color: var(--color-muted);
  transition: color 0.3s ease-in-out;

  &:hover {
    color: var(--color-accent);
  }

  @media (max-width: 768px) {
    font-size: 32px;
    margin: auto 0;
    padding: 0px;
    height: 30px;
  }
`;

const ProfileIconButton = styled(Link)`
  background: none;
  border: none;
  cursor: pointer;
  padding: 10px;
  font-size: 24px;
  color: var(--color-muted);
  transition: color 0.3s ease-in-out;
  text-decoration: none;
  display: flex;
  align-items: center;

  &:hover {
    color: var(--color-accent);
  }

  @media (max-width: 768px) {
    font-size: 32px;
    padding: 16px 0;
    width: 100%;
    justify-content: center;
  }
`;

const LogoutIconButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  padding: 10px;
  font-size: 24px;
  color: var(--color-muted);
  transition: color 0.3s ease-in-out;

  &:hover {
    color: var(--color-accent);
  }

  @media (max-width: 768px) {
    font-size: 32px;
    padding: 16px 0;
    width: 100%;
    text-align: center;
  }
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
    box-shadow: 0 0 4px var(--color-accent);
  }

  @media (max-width: 768px) {
    display: block;
  }
`;

const BurgerIcon = styled.div<BurgerIconProps>`
  width: 24px;
  height: 2px;
  background-color: var(--color-muted);
  position: relative;
  transition: background-color 0.3s ease-in-out;

  &::before,
  &::after {
    content: '';
    position: absolute;
    width: 24px;
    height: 2px;
    background-color: var(--color-muted);
    transition: transform 0.3s ease-in-out;
  }

  &::before {
    top: -8px;
  }

  &::after {
    top: 8px;
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

const Header: React.FC<HeaderProps> = ({ main = true }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDarkTheme, setIsDarkTheme] = useState<boolean>(
    () => document.documentElement.getAttribute('data-theme') === 'dark'
  );
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsAuthenticated(!!token);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDarkTheme ? 'dark' : 'light');
  }, [isDarkTheme]);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const toggleTheme = () => {
    setIsDarkTheme(!isDarkTheme);
    setIsMenuOpen(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    setIsMenuOpen(false);
    navigate('/');
  };

  return (
    <HeaderLanding>
      <LogoLandingContainer href="/">
        <LogoLanding>
          <LogoText>LT</LogoText>
        </LogoLanding>
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
            {isAuthenticated ? (
              <>
                <ProfileIconButton to="/profile" onClick={() => setIsMenuOpen(false)}>
                  <FiUser />
                </ProfileIconButton>
                <LogoutIconButton onClick={handleLogout}>
                  <FiLogOut />
                </LogoutIconButton>
              </>
            ) : (
              <MobileButtonGetStarted to="/auth" onClick={() => setIsMenuOpen(false)}>
                Начать
              </MobileButtonGetStarted>
            )}
          </>
        )}
      </MenuLanding>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {isAuthenticated ? (
          <>
            <ProfileIconButton to="/profile">
              <FiUser />
            </ProfileIconButton>
            <LogoutIconButton onClick={handleLogout}>
              <FiLogOut />
            </LogoutIconButton>
          </>
        ) : (
          <ButtonGetStarted to="/auth">Начать</ButtonGetStarted>
        )}
        <ThemeIconButton onClick={toggleTheme}>
          {isDarkTheme ? <FiSun /> : <FiMoon />}
        </ThemeIconButton>
        <BurgerButton onClick={toggleMenu} aria-label="Переключить меню">
          <BurgerIcon $isOpen={isMenuOpen} />
        </BurgerButton>
      </div>
    </HeaderLanding>
  );
};

export default Header;