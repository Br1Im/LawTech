import styled from '@emotion/styled';
import { keyframes } from '@emotion/react';

const scroll = keyframes`
  0%   { transform: translateX(0); }
  100% { transform: translateX(-50%); }
`;

const Section = styled.section`
  width: 100%;
  padding: 48px 24px 8px;
  display: flex;
  justify-content: center;
  position: relative;
  z-index: 1;
`;

const Inner = styled.div`
  max-width: 1240px;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 22px;
`;

const Caption = styled.div`
  font-size: 12.5px;
  font-weight: 600;
  color: var(--color-muted);
  text-transform: uppercase;
  letter-spacing: 0.18em;
`;

const Track = styled.div`
  width: 100%;
  overflow: hidden;
  mask-image: linear-gradient(
    90deg,
    transparent,
    black 10%,
    black 90%,
    transparent
  );
  -webkit-mask-image: linear-gradient(
    90deg,
    transparent,
    black 10%,
    black 90%,
    transparent
  );
`;

const Row = styled.div`
  display: inline-flex;
  gap: 64px;
  align-items: center;
  animation: ${scroll} 32s linear infinite;
  padding-right: 64px;

  @media (max-width: 640px) {
    gap: 44px;
    animation-duration: 22s;
  }
`;

const Logo = styled.span`
  font-family: var(--font-display);
  font-size: 22px;
  font-weight: 700;
  color: var(--color-text-secondary);
  opacity: 0.75;
  letter-spacing: -0.01em;
  white-space: nowrap;
  transition: opacity 0.3s var(--ease-out), color 0.3s var(--ease-out);

  &:hover {
    opacity: 1;
    color: var(--color-text);
  }

  small {
    font-family: var(--font-sans);
    font-size: 12px;
    font-weight: 600;
    margin-left: 4px;
    color: var(--color-muted);
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }
`;

const LOGOS = [
  { name: 'Иванова', tag: 'и Петров' },
  { name: 'PetroffLegal', tag: '' },
  { name: 'Квант-Групп', tag: 'Legal Ops' },
  { name: 'Lex', tag: 'Ferenda' },
  { name: 'Андреев', tag: '· Partners' },
  { name: 'Меридиан', tag: 'Право' },
  { name: 'Arbitrum', tag: 'Group' },
  { name: 'Stratos', tag: 'Legal' },
];

const LogoStrip = () => {
  const items = [...LOGOS, ...LOGOS];
  return (
    <Section>
      <Inner>
        <Caption>Нам доверяют лучшие юридические команды</Caption>
        <Track>
          <Row>
            {items.map((l, i) => (
              <Logo key={i}>
                {l.name}
                {l.tag && <small>{l.tag}</small>}
              </Logo>
            ))}
          </Row>
        </Track>
      </Inner>
    </Section>
  );
};

export default LogoStrip;
