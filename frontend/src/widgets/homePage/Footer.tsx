import styled from '@emotion/styled';
import { Link } from 'react-router-dom';

const FooterWrap = styled.footer`
  width: 100%;
  border-top: 1px solid var(--color-border);
  padding: 40px 24px;
  background: var(--color-bg);
`;

const Inner = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  flex-wrap: wrap;

  @media (max-width: 600px) {
    flex-direction: column;
    text-align: center;
  }
`;

const Brand = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const LogoIcon = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: var(--color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 700;
  font-size: 12px;
  font-family: var(--font-sans);
`;

const BrandName = styled.span`
  font-size: 16px;
  font-weight: 700;
  color: var(--color-text);
  font-family: var(--font-sans);
`;

const Copy = styled.span`
  font-size: 14px;
  color: var(--color-muted);
  font-family: var(--font-sans);
`;

const Links = styled.div`
  display: flex;
  gap: 24px;
`;

const FootLink = styled.a`
  font-size: 14px;
  color: var(--color-text-secondary);
  text-decoration: none;
  font-family: var(--font-sans);
  transition: color 0.2s;

  &:hover {
    color: var(--color-primary);
  }
`;

const Footer = () => (
  <FooterWrap>
    <Inner>
      <Brand>
        <LogoIcon>LT</LogoIcon>
        <BrandName>LawTech</BrandName>
      </Brand>
      <Copy>&copy; {new Date().getFullYear()} LawTech. Все права защищены.</Copy>
      <Links>
        <FootLink href="#features">Возможности</FootLink>
        <FootLink href="#faq">FAQ</FootLink>
        <FootLink href="/auth">Войти</FootLink>
      </Links>
    </Inner>
  </FooterWrap>
);

export default Footer;
