import styled from '@emotion/styled';
import { keyframes } from '@emotion/react';
import { Link } from 'react-router-dom';
import { ArrowRight, Scale, Shield, Zap, TrendingUp, FileText, Briefcase, CheckCircle2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(28px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const drift1 = keyframes`
  0%, 100% { transform: translate(0, 0) scale(1); }
  33%      { transform: translate(40px, -30px) scale(1.08); }
  66%      { transform: translate(-30px, 20px) scale(0.96); }
`;

const drift2 = keyframes`
  0%, 100% { transform: translate(0, 0) scale(1); }
  50%      { transform: translate(-50px, 40px) scale(1.1); }
`;

const pulse = keyframes`
  0%, 100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.45); }
  70%      { box-shadow: 0 0 0 10px rgba(34, 197, 94, 0); }
`;

const shimmer = keyframes`
  0%   { background-position: -200% center; }
  100% { background-position: 200% center; }
`;

const float = keyframes`
  0%, 100% { transform: translateY(0) rotateX(8deg) rotateY(-6deg); }
  50%      { transform: translateY(-10px) rotateX(8deg) rotateY(-6deg); }
`;

const Wrap = styled.section`
  width: 100%;
  position: relative;
  padding: 120px 24px 80px;
  overflow: hidden;
  isolation: isolate;

  @media (max-width: 900px) {
    padding: 96px 20px 56px;
  }
`;

const Aurora = styled.div`
  position: absolute;
  inset: 0;
  z-index: -1;
  overflow: hidden;
  pointer-events: none;

  &::before,
  &::after {
    content: '';
    position: absolute;
    border-radius: 50%;
    filter: blur(80px);
    opacity: 0.55;
    will-change: transform;
  }

  &::before {
    width: 540px;
    height: 540px;
    top: -120px;
    left: -80px;
    background: radial-gradient(circle at 30% 30%, rgba(124, 92, 255, 0.55), rgba(30, 64, 175, 0.35) 50%, transparent 70%);
    animation: ${drift1} 16s var(--ease-inout) infinite;
  }

  &::after {
    width: 620px;
    height: 620px;
    top: 60px;
    right: -160px;
    background: radial-gradient(circle at 70% 50%, rgba(56, 189, 248, 0.4), rgba(124, 92, 255, 0.25) 55%, transparent 75%);
    animation: ${drift2} 22s var(--ease-inout) infinite;
  }

  :root[data-theme='dark'] &::before {
    opacity: 0.75;
    background: radial-gradient(circle at 30% 30%, rgba(124, 92, 255, 0.7), rgba(56, 189, 248, 0.35) 55%, transparent 75%);
  }

  :root[data-theme='dark'] &::after {
    opacity: 0.7;
    background: radial-gradient(circle at 70% 50%, rgba(56, 189, 248, 0.5), rgba(124, 92, 255, 0.3) 55%, transparent 75%);
  }

  @media (prefers-reduced-motion: reduce) {
    &::before, &::after { animation: none; }
  }
`;

const Grid = styled.div`
  max-width: 1240px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr);
  gap: 48px;
  align-items: center;

  @media (max-width: 1100px) {
    gap: 32px;
  }

  @media (max-width: 980px) {
    grid-template-columns: 1fr;
    gap: 48px;
    text-align: center;
    justify-items: center;
  }
`;

const Left = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  max-width: 600px;

  @media (max-width: 980px) {
    align-items: center;
  }
`;

const LiveChip = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 7px 14px 7px 12px;
  border-radius: var(--radius-pill);
  background: var(--glass-bg);
  border: 1px solid var(--color-border);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text);
  font-family: var(--font-sans);
  margin-bottom: 22px;
  animation: ${fadeUp} 0.7s var(--ease-out) both;

  &::before {
    content: '';
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #22C55E;
    animation: ${pulse} 1.8s var(--ease-out) infinite;
  }

  b {
    font-weight: 700;
    color: var(--color-primary);
  }
`;

const Title = styled.h1`
  font-family: var(--font-display);
  font-size: clamp(36px, 4.6vw, 60px);
  font-weight: 800;
  line-height: 1.05;
  color: var(--color-text);
  margin: 0 0 22px;
  letter-spacing: -1.6px;
  text-wrap: balance;
  animation: ${fadeUp} 0.75s var(--ease-out) 0.05s both;
`;

const Highlight = styled.span`
  position: relative;
  display: inline-block;
  background: linear-gradient(
    90deg,
    var(--color-primary) 0%,
    #7C5CFF 35%,
    #38BDF8 65%,
    var(--color-primary) 100%
  );
  background-size: 200% auto;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  font-style: italic;
  animation: ${shimmer} 6s linear infinite;

  &::after {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    bottom: 4px;
    height: 8px;
    background: linear-gradient(90deg, transparent, rgba(124, 92, 255, 0.18), transparent);
    border-radius: 999px;
    z-index: -1;
  }
`;

const Subtitle = styled.p`
  font-size: clamp(16px, 1.6vw, 19px);
  color: var(--color-text-secondary);
  max-width: 560px;
  line-height: 1.6;
  margin: 0 0 32px;
  font-family: var(--font-sans);
  animation: ${fadeUp} 0.75s var(--ease-out) 0.15s both;
`;

const ButtonRow = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
  animation: ${fadeUp} 0.75s var(--ease-out) 0.25s both;

  @media (max-width: 480px) {
    flex-direction: column;
    width: 100%;
  }
`;

const PrimaryBtn = styled(Link)`
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  background: var(--color-primary);
  color: #fff;
  padding: 15px 28px;
  border-radius: var(--radius-md);
  font-size: 15px;
  font-weight: 600;
  text-decoration: none;
  font-family: var(--font-sans);
  border: none;
  box-shadow:
    0 10px 30px -10px rgba(124, 92, 255, 0.55),
    0 0 0 1px rgba(255, 255, 255, 0.06) inset;
  transition: transform 0.18s var(--ease-out), box-shadow 0.25s var(--ease-out);
  overflow: hidden;
  will-change: transform;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(120deg, transparent 0%, rgba(255, 255, 255, 0.25) 50%, transparent 100%);
    transform: translateX(-100%);
    transition: transform 0.6s var(--ease-out);
  }

  &:hover::before { transform: translateX(100%); }

  &:hover {
    box-shadow:
      0 14px 40px -10px rgba(124, 92, 255, 0.7),
      0 0 0 1px rgba(255, 255, 255, 0.08) inset;
  }

  svg { width: 18px; height: 18px; }

  @media (max-width: 480px) {
    width: 100%;
    justify-content: center;
  }
`;

const SecondaryBtn = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: var(--glass-bg);
  color: var(--color-text);
  padding: 15px 26px;
  border-radius: var(--radius-md);
  font-size: 15px;
  font-weight: 600;
  text-decoration: none;
  font-family: var(--font-sans);
  border: 1px solid var(--color-border);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  transition: transform 0.18s var(--ease-out), background 0.2s, border-color 0.2s;
  will-change: transform;

  &:hover {
    background: var(--color-bg-hover);
    border-color: var(--color-primary);
  }

  @media (max-width: 480px) {
    width: 100%;
    justify-content: center;
  }
`;

const TrustRow = styled.div`
  display: flex;
  gap: 14px;
  margin-top: 40px;
  flex-wrap: wrap;
  animation: ${fadeUp} 0.75s var(--ease-out) 0.35s both;

  @media (max-width: 980px) {
    justify-content: center;
  }
`;

const TrustChip = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-radius: var(--radius-pill);
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  font-size: 13px;
  font-weight: 500;
  font-family: var(--font-sans);
  transition: transform 0.2s var(--ease-out), border-color 0.2s, color 0.2s;

  svg { width: 14px; height: 14px; color: var(--color-primary); }

  &:hover {
    transform: translateY(-2px);
    border-color: var(--color-primary);
    color: var(--color-text);
  }
`;

/* ---------- Right side: floating product mockup ---------- */

const MockupSlot = styled.div`
  position: relative;
  perspective: 1400px;
  display: flex;
  justify-content: center;
  align-items: center;
  animation: ${fadeUp} 0.85s var(--ease-out) 0.3s both;

  @media (max-width: 980px) {
    width: 100%;
    max-width: 520px;
  }
`;

const MockupGlow = styled.div`
  position: absolute;
  inset: 12% 6%;
  border-radius: 32px;
  background: radial-gradient(60% 60% at 50% 50%, rgba(124, 92, 255, 0.45), transparent 70%);
  filter: blur(40px);
  z-index: 0;
  pointer-events: none;
`;

const Mockup = styled.div`
  position: relative;
  width: 100%;
  max-width: 560px;
  border-radius: 16px;
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  box-shadow:
    0 50px 120px -30px rgba(15, 17, 22, 0.35),
    0 30px 60px -30px rgba(15, 17, 22, 0.25);
  overflow: hidden;
  animation: ${float} 7s var(--ease-inout) infinite;
  transform-style: preserve-3d;
  will-change: transform;
  z-index: 1;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    transform: none;
  }
`;

const MockupBar = styled.div`
  height: 36px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 14px;
  background: var(--color-bg-alt);
  border-bottom: 1px solid var(--color-border);
`;

const Dot = styled.span<{ $color: string }>`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  display: inline-block;
`;

const MockupBody = styled.div`
  padding: 20px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  background: var(--color-bg-elevated);
`;

const Tile = styled.div`
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 14px;
  background: var(--color-bg);
`;

const TileHead = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--color-text-secondary);
  font-size: 11px;
  font-weight: 600;
  font-family: var(--font-sans);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 8px;

  svg { width: 12px; height: 12px; color: var(--color-primary); }
`;

const TileValue = styled.div`
  font-size: 22px;
  font-weight: 800;
  color: var(--color-text);
  font-family: var(--font-display);
  letter-spacing: -0.5px;
`;

const TileDelta = styled.div`
  font-size: 11px;
  font-weight: 600;
  color: #22C55E;
  margin-top: 2px;
`;

const ChartTile = styled(Tile)`
  grid-column: 1 / -1;
  padding-bottom: 16px;
`;

const Bars = styled.svg`
  width: 100%;
  height: 60px;
  display: block;
  margin-top: 6px;
`;

const ActivityTile = styled(Tile)`
  grid-column: 1 / -1;
`;

const ActivityRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
  border-bottom: 1px solid var(--color-border);
  font-size: 12px;
  color: var(--color-text);
  font-family: var(--font-sans);

  &:last-of-type { border-bottom: none; }

  svg { width: 14px; height: 14px; color: var(--color-success); flex-shrink: 0; }

  span:last-of-type {
    margin-left: auto;
    color: var(--color-muted);
    font-size: 11px;
  }
`;

const FloatingToast = styled.div`
  position: absolute;
  bottom: -16px;
  right: -18px;
  padding: 10px 14px;
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-xl);
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text);
  font-family: var(--font-sans);
  z-index: 2;
  animation: ${float} 5s var(--ease-inout) infinite reverse;

  svg { width: 16px; height: 16px; color: var(--color-success); }

  @media (max-width: 980px) {
    right: 8px;
    bottom: -22px;
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

/* ---------- Magnetic hook ---------- */

const useMagnetic = <T extends HTMLElement>(strength = 0.25) => {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (window.matchMedia('(hover: none)').matches) return;

    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      el.style.transform = `translate(${x * strength}px, ${y * strength}px)`;
    };
    const onLeave = () => { el.style.transform = ''; };

    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', onLeave);
    return () => {
      el.removeEventListener('mousemove', onMove);
      el.removeEventListener('mouseleave', onLeave);
    };
  }, [strength]);

  return ref;
};

const HeroSection = () => {
  const primaryRef = useMagnetic<HTMLAnchorElement>(0.18);
  const secondaryRef = useMagnetic<HTMLAnchorElement>(0.12);

  const [teams, setTeams] = useState(247);
  useEffect(() => {
    const id = setInterval(() => {
      setTeams(t => Math.max(180, Math.min(420, t + Math.floor(Math.random() * 7) - 3)));
    }, 3500);
    return () => clearInterval(id);
  }, []);

  return (
    <Wrap>
      <Aurora />
      <Grid>
        <Left>
          <LiveChip>
            <b>{teams}</b> команд работают сейчас
          </LiveChip>
          <Title>
            Юридическая практика<br />
            <Highlight>нового поколения</Highlight>
          </Title>
          <Subtitle>
            Управляйте клиентами, делами и документами в единой системе.
            AI-аналитика, автоматизация процессов и полный контроль финансов.
          </Subtitle>
          <ButtonRow>
            <PrimaryBtn to="/auth" ref={primaryRef}>
              Попробовать бесплатно <ArrowRight />
            </PrimaryBtn>
            <SecondaryBtn to="/auth" ref={secondaryRef}>
              Демо-доступ
            </SecondaryBtn>
          </ButtonRow>
          <TrustRow>
            <TrustChip><Shield /> ФЗ-152 · данные в РФ</TrustChip>
            <TrustChip><Zap /> Ответ AI за 1.2 сек</TrustChip>
            <TrustChip><Scale /> E2E-шифрование</TrustChip>
          </TrustRow>
        </Left>

        <MockupSlot>
          <MockupGlow />
          <Mockup>
            <MockupBar>
              <Dot $color="#FF5F57" />
              <Dot $color="#FEBC2E" />
              <Dot $color="#28C840" />
            </MockupBar>
            <MockupBody>
              <Tile>
                <TileHead><Briefcase /> Активные дела</TileHead>
                <TileValue>1 248</TileValue>
                <TileDelta>↑ 12,4% к мес.</TileDelta>
              </Tile>
              <Tile>
                <TileHead><TrendingUp /> Конверсия</TileHead>
                <TileValue>34,2%</TileValue>
                <TileDelta>↑ 4,1 п.п.</TileDelta>
              </Tile>
              <ChartTile>
                <TileHead><FileText /> Выручка за квартал</TileHead>
                <Bars viewBox="0 0 240 60" preserveAspectRatio="none">
                  {[28, 36, 30, 44, 38, 52, 46, 58, 50, 64, 56, 70].map((h, i) => (
                    <rect
                      key={i}
                      x={i * 20 + 2}
                      y={60 - h}
                      width="14"
                      height={h}
                      rx="3"
                      fill={i === 11 ? 'var(--color-primary)' : 'var(--color-border-strong)'}
                    />
                  ))}
                </Bars>
              </ChartTile>
              <ActivityTile>
                <ActivityRow>
                  <CheckCircle2 />
                  <span>Договор № 2348 подписан</span>
                  <span>2 мин</span>
                </ActivityRow>
                <ActivityRow>
                  <CheckCircle2 />
                  <span>AI проверил 18 рисков</span>
                  <span>5 мин</span>
                </ActivityRow>
              </ActivityTile>
            </MockupBody>
          </Mockup>
          <FloatingToast>
            <CheckCircle2 /> AI завершил анализ — без рисков
          </FloatingToast>
        </MockupSlot>
      </Grid>
    </Wrap>
  );
};

export default HeroSection;
