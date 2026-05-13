import styled from '@emotion/styled';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import ThemeToggle from '../../components/ui/ThemeToggle';

const HeaderBar = styled.header`
  height: 64px;
  background: var(--glass-bg);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 48px;
  width: 100%;
  box-sizing: border-box;
  z-index: 1000;
  position: fixed;
  top: 0;
  left: 0;

  @media (max-width: 768px) {
    padding: 0 20px;
  }
`;

const LogoLink = styled(Link)`
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  z-index: 20;
`;

const LogoIcon = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: var(--color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 700;
  font-size: 14px;
  font-family: var(--font-sans);
`;

const LogoName = styled.span`
  font-size: 18px;
  font-weight: 700;
  color: var(--color-text);
  font-family: var(--font-sans);
  letter-spacing: -0.3px;
`;

const Nav = styled.nav<{ $open: boolean }>`
  display: flex;
  align-items: center;
  gap: 32px;

  @media (max-width: 768px) {
    position: fixed;
    inset: 0;
    background: var(--color-bg);
    flex-direction: column;
    justify-content: center;
    gap: 24px;
    transform: ${({ $open }) => ($open ? 'translateX(0)' : 'translateX(100%)')};
    transition: transform 0.3s var(--ease-out);
    z-index: 10;
  }
`;

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  z-index: 20;
`;

const HeaderToggleSlot = styled.div`
  display: flex;
  align-items: center;

  @media (max-width: 768px) {
    display: none;
  }
`;

const NavLink = styled.a`
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-secondary);
  text-decoration: none;
  font-family: var(--font-sans);
  transition: color 0.2s;

  &:hover {
    color: var(--color-primary);
  }

  @media (max-width: 768px) {
    font-size: 20px;
  }
`;

const CTAButton = styled(Link)`
  background: var(--color-primary);
  color: #fff;
  padding: 8px 20px;
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
  font-family: var(--font-sans);
  transition: all 0.2s;
  border: none;

  &:hover {
    opacity: 0.9;
    transform: translateY(-1px);
    box-shadow: var(--shadow-md);
  }

  @media (max-width: 768px) {
    font-size: 18px;
    padding: 12px 32px;
  }
`;

const Burger = styled.button<{ $open: boolean }>`
  display: none;
  margin: 0;
  background: none;
  border: none;
  cursor: pointer;
  z-index: 20;
  padding: 8px;
  width: 32px;
  height: 32px;
  position: relative;

  span {
    display: block;
    width: 20px;
    height: 2px;
    background: var(--color-text);
    border-radius: 2px;
    position: absolute;
    left: 6px;
    transition: all 0.3s;

    &:nth-of-type(1) {
      top: ${({ $open }) => ($open ? '15px' : '10px')};
      transform: ${({ $open }) => ($open ? 'rotate(45deg)' : 'none')};
    }
    &:nth-of-type(2) {
      top: 15px;
      opacity: ${({ $open }) => ($open ? 0 : 1)};
    }
    &:nth-of-type(3) {
      top: ${({ $open }) => ($open ? '15px' : '20px')};
      transform: ${({ $open }) => ($open ? 'rotate(-45deg)' : 'none')};
    }
  }

  @media (max-width: 768px) {
    display: block;
  }
`;

const Header = () => {
  const [open, setOpen] = useState(false);

  return (
    <HeaderBar>
      <LogoLink to="/">
        <LogoIcon>LT</LogoIcon>
        <LogoName>LawTech</LogoName>
      </LogoLink>

      <Nav $open={open}>
        <NavLink href="#features" onClick={() => setOpen(false)}>Возможности</NavLink>
        <NavLink href="#advantages" onClick={() => setOpen(false)}>Преимущества</NavLink>
        <NavLink href="#faq" onClick={() => setOpen(false)}>FAQ</NavLink>
        <CTAButton to="/auth" onClick={() => setOpen(false)}>Начать</CTAButton>
      </Nav>

      <HeaderActions>
        <HeaderToggleSlot>
          <ThemeToggle />
        </HeaderToggleSlot>
        <Burger $open={open} onClick={() => setOpen(!open)} aria-label="Меню">
          <span /><span /><span />
        </Burger>
      </HeaderActions>
    </HeaderBar>
  );
};

export default Header;
