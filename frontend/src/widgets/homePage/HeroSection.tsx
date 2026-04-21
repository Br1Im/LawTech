import styled from '@emotion/styled';
import { keyframes } from '@emotion/react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  ShieldCheck,
  Cpu,
  Lock,
  Search,
  Users,
  Briefcase,
  BarChart3,
  Bot,
  MessageCircle,
  FileText,
} from 'lucide-react';

const fadeInUp = keyframes`
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const floatY = keyframes`
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-10px); }
`;

const _pulseRing = keyframes`
  0%   { box-shadow: 0 0 0 0 rgba(212, 175, 55, 0.45); }
  70%  { box-shadow: 0 0 0 18px rgba(212, 175, 55, 0); }
  100% { box-shadow: 0 0 0 0 rgba(212, 175, 55, 0); }
`;

const typing = keyframes`
  0%   { width: 0; }
  60%  { width: 100%; }
  100% { width: 100%; }
`;

const Section = styled.section`
  width: 100%;
  display: flex;
  justify-content: center;
  padding: 0 24px;
  position: relative;
  z-index: 1;
`;

const Inner = styled.div`
  max-width: 1240px;
  width: 100%;
  margin-top: 140px;
  margin-bottom: 60px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 40px;
  align-items: center;
  box-sizing: border-box;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
    margin-top: 120px;
    gap: 48px;
  }

  @media (max-width: 768px) {
    margin-top: 100px;
  }
`;

const TextColumn = styled.div`
  animation: ${fadeInUp} 0.9s var(--ease-out) 0.05s both;
`;

const Eyebrow = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: var(--glass-bg-strong);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  color: var(--color-accent-dark);
  padding: 7px 14px;
  border-radius: var(--radius-pill);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-bottom: 22px;
  border: 1px solid rgba(212, 175, 55, 0.4);

  svg {
    width: 14px;
    height: 14px;
    color: var(--color-accent);
  }
`;

const Title = styled.h1`
  font-family: var(--font-display);
  font-size: clamp(44px, 6.5vw, 86px);
  font-weight: 800;
  line-height: 0.98;
  letter-spacing: -0.035em;
  margin-bottom: 22px;
  color: var(--color-text);

  em {
    font-style: italic;
    background: var(--gradient-gold);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
`;

const Subtitle = styled.p`
  font-size: 19px;
  color: var(--color-text-secondary);
  max-width: 540px;
  margin-bottom: 32px;
  line-height: 1.55;

  strong {
    color: var(--color-text);
    font-weight: 600;
  }

  @media (max-width: 480px) {
    font-size: 17px;
  }
`;

const Actions = styled.div`
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
  align-items: center;
`;

const PrimaryCta = styled(Link)`
  background: var(--gradient-gold);
  background-size: 200% auto;
  color: #fff;
  padding: 16px 32px;
  border-radius: var(--radius-pill);
  font-size: 16px;
  font-weight: 700;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  box-shadow: 0 14px 32px rgba(212, 175, 55, 0.38);
  transition: all 0.3s var(--ease-out);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent);
    transition: left 0.6s var(--ease-out);
  }

  &:hover {
    transform: translateY(-3px);
    background-position: right center;
    box-shadow: 0 20px 40px rgba(212, 175, 55, 0.5);
  }

  &:hover::before {
    left: 100%;
  }
`;

const SecondaryCta = styled.a`
  padding: 15px 28px;
  border-radius: var(--radius-pill);
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text);
  background: var(--glass-bg);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid var(--color-border-strong);
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s var(--ease-out);

  &:hover {
    border-color: var(--color-accent);
    color: var(--color-accent);
    transform: translateY(-2px);
  }
`;

const Trust = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 28px;

  @media (max-width: 768px) {
    gap: 8px;
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
  font-size: 13px;
  color: var(--color-text-secondary);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);

  svg {
    width: 14px;
    height: 14px;
    color: var(--color-accent);
  }
`;

/* ---------- Right side: CRM preview mockup ---------- */

const PreviewColumn = styled.div`
  position: relative;
  animation: ${fadeInUp} 1s var(--ease-out) 0.25s both;
`;

const PreviewGlow = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  width: 620px;
  height: 620px;
  transform: translate(-50%, -50%);
  background: radial-gradient(circle, rgba(212, 175, 55, 0.22), transparent 62%);
  border-radius: 50%;
  z-index: 0;
  filter: blur(10px);
  pointer-events: none;

  @media (max-width: 1024px) {
    width: 520px;
    height: 520px;
  }
`;

const Preview = styled.div`
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 580px;
  margin: 0 auto;
  border-radius: 22px;
  background: var(--glass-bg-strong);
  backdrop-filter: blur(18px) saturate(140%);
  -webkit-backdrop-filter: blur(18px) saturate(140%);
  border: 1px solid rgba(212, 175, 55, 0.35);
  box-shadow:
    0 40px 100px rgba(15, 23, 42, 0.22),
    0 20px 40px rgba(212, 175, 55, 0.15),
    inset 0 0 0 1px rgba(255, 255, 255, 0.5);
  overflow: hidden;
  animation: ${floatY} 7s ease-in-out infinite;

  [data-theme='dark'] & {
    box-shadow:
      0 40px 100px rgba(0, 0, 0, 0.6),
      0 20px 40px rgba(212, 175, 55, 0.18),
      inset 0 0 0 1px rgba(255, 255, 255, 0.05);
  }
`;

const WindowBar = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--color-border);
  background: rgba(255, 255, 255, 0.5);

  [data-theme='dark'] & {
    background: rgba(20, 20, 22, 0.5);
  }
`;

const Dot = styled.span<{ $color: string }>`
  width: 11px;
  height: 11px;
  border-radius: 50%;
  background: ${(p) => p.$color};
`;

const SearchPill = styled.div`
  margin-left: 10px;
  flex: 1;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  padding: 5px 10px;
  border-radius: var(--radius-pill);
  font-size: 11px;
  color: var(--color-muted);

  svg {
    width: 12px;
    height: 12px;
  }
`;

const PreviewBody = styled.div`
  display: grid;
  grid-template-columns: 160px 1fr;
  min-height: 360px;

  @media (max-width: 480px) {
    grid-template-columns: 56px 1fr;
  }
`;

const Side = styled.aside`
  background: rgba(255, 255, 255, 0.35);
  border-right: 1px solid var(--color-border);
  padding: 14px 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;

  [data-theme='dark'] & {
    background: rgba(15, 15, 18, 0.45);
  }
`;

const SideItem = styled.div<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 11px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: ${(p) => (p.$active ? 600 : 500)};
  color: ${(p) => (p.$active ? '#1a1a1a' : 'var(--color-text-secondary)')};
  background: ${(p) =>
    p.$active ? 'var(--gradient-gold)' : 'transparent'};
  box-shadow: ${(p) => (p.$active ? '0 6px 14px rgba(212, 175, 55, 0.35)' : 'none')};

  svg {
    width: 15px;
    height: 15px;
    flex-shrink: 0;
  }

  @media (max-width: 480px) {
    justify-content: center;
    span {
      display: none;
    }
  }
`;

const Main = styled.div`
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
`;

const Row = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const Heading = styled.div`
  font-family: var(--font-display);
  font-size: 17px;
  font-weight: 700;
  color: var(--color-text);
`;

const Pill = styled.span`
  font-size: 11px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: var(--radius-pill);
  background: var(--color-accent-light);
  color: var(--color-accent-dark);
  border: 1px solid rgba(212, 175, 55, 0.35);
`;

const ClientCard = styled.div`
  display: grid;
  grid-template-columns: 32px 1fr auto;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: var(--color-bg-alt);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  transition: transform 0.25s var(--ease-out), border-color 0.25s var(--ease-out);

  &:hover {
    transform: translateY(-1px);
    border-color: rgba(212, 175, 55, 0.4);
  }
`;

const Avatar = styled.div<{ $bg: string }>`
  width: 32px;
  height: 32px;
  border-radius: 10px;
  background: ${(p) => p.$bg};
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 13px;
`;

const ClientInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;

  .name {
    font-size: 13px;
    font-weight: 600;
    color: var(--color-text);
  }

  .case {
    font-size: 11px;
    color: var(--color-muted);
  }
`;

const Status = styled.span<{ $color: 'green' | 'gold' | 'blue' }>`
  font-size: 11px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: var(--radius-pill);
  background: ${({ $color }) =>
    $color === 'green'
      ? 'rgba(48, 209, 88, 0.15)'
      : $color === 'gold'
      ? 'rgba(212, 175, 55, 0.18)'
      : 'rgba(10, 132, 255, 0.15)'};
  color: ${({ $color }) =>
    $color === 'green'
      ? '#1e8a3a'
      : $color === 'gold'
      ? 'var(--color-accent-dark)'
      : '#0a6fc2'};
`;

const ChatBubble = styled.div`
  background: rgba(212, 175, 55, 0.12);
  border: 1px solid rgba(212, 175, 55, 0.3);
  border-radius: 12px;
  padding: 10px 12px;
  display: flex;
  gap: 10px;
  align-items: flex-start;
  font-size: 12.5px;
  color: var(--color-text);
  line-height: 1.45;

  .icon {
    width: 24px;
    height: 24px;
    flex-shrink: 0;
    background: var(--gradient-gold);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;

    svg {
      width: 14px;
      height: 14px;
      color: #1a1a1a;
    }
  }

  .text {
    overflow: hidden;
    white-space: nowrap;
    border-right: 2px solid var(--color-accent);
    animation: ${typing} 5s steps(30, end) infinite alternate;
  }
`;

const HeroSection = () => {
  return (
    <Section>
      <Inner>
        <TextColumn>
          <Eyebrow>
            <Sparkles /> Юридический AI · LawTech
          </Eyebrow>
          <Title>
            Ваш юридический офис&nbsp;— на <em>автопилоте</em>
          </Title>
          <Subtitle>
            CRM с AI-ассистентом, который <strong>сам</strong> находит документы,
            отслеживает сроки и готовит черновики — чтобы юристы занимались
            юриспруденцией, а не таблицами.
          </Subtitle>
          <Actions>
            <PrimaryCta to="/auth">
              Попробовать бесплатно →
            </PrimaryCta>
            <SecondaryCta href="#product">
              Как это работает
            </SecondaryCta>
          </Actions>
          <Trust>
            <Badge><ShieldCheck /> ФЗ-152 · GDPR</Badge>
            <Badge><Cpu /> Llama 3.1 · FAISS</Badge>
            <Badge><Lock /> End-to-end шифрование</Badge>
          </Trust>
        </TextColumn>

        <PreviewColumn>
          <PreviewGlow />
          <Preview>
            <WindowBar>
              <Dot $color="#ff5f57" />
              <Dot $color="#febc2e" />
              <Dot $color="#28c840" />
              <SearchPill>
                <Search /> app.lawtech.ai / dashboard
              </SearchPill>
            </WindowBar>

            <PreviewBody>
              <Side>
                <SideItem $active>
                  <Users /> <span>Клиенты</span>
                </SideItem>
                <SideItem>
                  <Briefcase /> <span>Дела</span>
                </SideItem>
                <SideItem>
                  <FileText /> <span>Документы</span>
                </SideItem>
                <SideItem>
                  <MessageCircle /> <span>AI-чат</span>
                </SideItem>
                <SideItem>
                  <BarChart3 /> <span>Аналитика</span>
                </SideItem>
              </Side>

              <Main>
                <Row>
                  <Heading>Активные дела</Heading>
                  <Pill>12 активных</Pill>
                </Row>

                <ClientCard>
                  <Avatar $bg="linear-gradient(135deg,#d4af37,#a07c28)">АИ</Avatar>
                  <ClientInfo>
                    <span className="name">ИП «Андреев и партнёры»</span>
                    <span className="case">Налоговый спор · №2025-014</span>
                  </ClientInfo>
                  <Status $color="green">В работе</Status>
                </ClientCard>

                <ClientCard>
                  <Avatar $bg="linear-gradient(135deg,#0a84ff,#2997ff)">ОК</Avatar>
                  <ClientInfo>
                    <span className="name">ООО «Квант-Групп»</span>
                    <span className="case">Регистрация ТЗ · №2025-021</span>
                  </ClientInfo>
                  <Status $color="gold">Ожидает</Status>
                </ClientCard>

                <ClientCard>
                  <Avatar $bg="linear-gradient(135deg,#30d158,#0a8f3c)">СМ</Avatar>
                  <ClientInfo>
                    <span className="name">Самойлов М. И.</span>
                    <span className="case">Бракоразводный процесс · №2025-019</span>
                  </ClientInfo>
                  <Status $color="blue">Слушание</Status>
                </ClientCard>

                <ChatBubble>
                  <div className="icon"><Bot /></div>
                  <span className="text">AI: нашёл 3 похожих прецедента…</span>
                </ChatBubble>
              </Main>
            </PreviewBody>
          </Preview>
        </PreviewColumn>
      </Inner>
    </Section>
  );
};

export default HeroSection;
