import styled from '@emotion/styled';

const FooterContainer = styled.footer`
  width: 100%;
  padding: 1rem 0;
  text-align: center;
  background-color: var(--color-header-bg);
  color: var(--color-muted);
  font-size: 0.875rem;
  border-top: 1px solid var(--color-border);
`;

const Footer = () => {
  return (
    <FooterContainer>
      © 2025 LawTech.
    </FooterContainer>
  );
};

export default Footer;