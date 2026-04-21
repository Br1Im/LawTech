import styled from '@emotion/styled';
import { Scale, Github, Twitter, Linkedin, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';

const FooterContainer = styled.footer`
  width: 100%;
  padding: 64px 24px 28px;
  background: var(--glass-bg);
  backdrop-filter: blur(16px) saturate(140%);
  -webkit-backdrop-filter: blur(16px) saturate(140%);
  color: var(--color-text-secondary);
  font-size: 14px;
  border-top: 1px solid var(--color-border);
  margin-top: 80px;
`;

const Inner = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1.4fr 1fr 1fr 1fr;
  gap: 48px;

  @media (max-width: 960px) {
    grid-template-columns: 1fr 1fr;
    gap: 32px;
  }

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
    gap: 24px;
    text-align: left;
  }
`;

const Brand = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 320px;
`;

const BrandRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const BrandMark = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: var(--gradient-gold);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #1a1a1a;
  box-shadow: 0 6px 16px rgba(212, 175, 55, 0.3);

  svg {
    width: 20px;
    height: 20px;
    stroke-width: 2.2;
  }
`;

const BrandName = styled.span`
  font-family: var(--font-display);
  font-size: 22px;
  font-weight: 700;
  background: var(--gradient-gold);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const BrandDesc = styled.p`
  color: var(--color-text-secondary);
  font-size: 14px;
  line-height: 1.55;
`;

const Social = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 4px;
`;

const SocialLink = styled.a`
  width: 36px;
  height: 36px;
  border-radius: 10px;
  border: 1px solid var(--color-border);
  background: var(--glass-bg);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-secondary);
  transition: all 0.25s var(--ease-out);

  svg {
    width: 16px;
    height: 16px;
  }

  &:hover {
    color: var(--color-accent);
    border-color: var(--color-accent);
    transform: translateY(-2px);
  }
`;

const ColTitle = styled.div`
  font-family: var(--font-sans);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-text);
  margin-bottom: 16px;
`;

const ColLinks = styled.ul`
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 0;
  margin: 0;
`;

const ColLink = styled.a`
  color: var(--color-text-secondary);
  font-size: 14px;
  text-decoration: none;
  transition: color 0.2s var(--ease-out);

  &:hover {
    color: var(--color-accent);
  }
`;

const BottomRow = styled.div`
  max-width: 1200px;
  margin: 48px auto 0;
  padding-top: 24px;
  border-top: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  font-size: 13px;
  color: var(--color-muted);

  @media (max-width: 560px) {
    flex-direction: column;
    text-align: center;
  }
`;

const Footer = () => {
  return (
    <FooterContainer>
      <Inner>
        <Brand>
          <BrandRow>
            <BrandMark>
              <Scale />
            </BrandMark>
            <BrandName>LawTech</BrandName>
          </BrandRow>
          <BrandDesc>
            Интеллектуальная CRM для юридических компаний с AI-ассистентом
            и векторным поиском по документам.
          </BrandDesc>
          <Social>
            <SocialLink href="https://github.com/Br1Im/LawTech" target="_blank" rel="noreferrer noopener" aria-label="GitHub">
              <Github />
            </SocialLink>
            <SocialLink href="#" aria-label="Twitter">
              <Twitter />
            </SocialLink>
            <SocialLink href="#" aria-label="LinkedIn">
              <Linkedin />
            </SocialLink>
            <SocialLink href="mailto:hello@lawtech.example" aria-label="Email">
              <Mail />
            </SocialLink>
          </Social>
        </Brand>

        <div>
          <ColTitle>Продукт</ColTitle>
          <ColLinks>
            <li><ColLink href="#how-it-works">Инновации</ColLink></li>
            <li><ColLink href="#advantages">Преимущества</ColLink></li>
            <li><ColLink href="#faq">FAQ</ColLink></li>
            <li><ColLink as={Link} to="/auth">Начать</ColLink></li>
          </ColLinks>
        </div>

        <div>
          <ColTitle>Компания</ColTitle>
          <ColLinks>
            <li><ColLink href="#">О нас</ColLink></li>
            <li><ColLink href="#">Блог</ColLink></li>
            <li><ColLink href="#">Карьера</ColLink></li>
            <li><ColLink href="#">Контакты</ColLink></li>
          </ColLinks>
        </div>

        <div>
          <ColTitle>Правовая</ColTitle>
          <ColLinks>
            <li><ColLink href="#">Условия использования</ColLink></li>
            <li><ColLink href="#">Политика конфиденциальности</ColLink></li>
            <li><ColLink href="#">Cookies</ColLink></li>
          </ColLinks>
        </div>
      </Inner>

      <BottomRow>
        <span>© {new Date().getFullYear()} LawTech. Все права защищены.</span>
        <span>Сделано с вниманием к деталям.</span>
      </BottomRow>
    </FooterContainer>
  );
};

export default Footer;
