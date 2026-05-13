import styled from '@emotion/styled';
import { keyframes } from '@emotion/react';
import { useState, useEffect, useRef } from 'react';
import { Users, FolderCheck, Clock, Award } from 'lucide-react';

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(24px); }
  to { opacity: 1; transform: translateY(0); }
`;

const Section = styled.section`
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 24px 80px;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;

  @media (max-width: 900px) {
    grid-template-columns: repeat(2, 1fr);
  }
  @media (max-width: 500px) {
    grid-template-columns: 1fr;
  }
`;

const Card = styled.div`
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 28px 24px;
  text-align: center;
  transition: all 0.2s;

  &:hover {
    transform: translateY(-4px);
    box-shadow: var(--shadow-lg);
    border-color: var(--color-primary);
  }
`;

const IconBox = styled.div`
  width: 48px;
  height: 48px;
  border-radius: var(--radius-md);
  background: var(--color-primary-light);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;

  svg {
    width: 24px;
    height: 24px;
    color: var(--color-primary);
  }
`;

const StatNum = styled.div`
  font-size: 36px;
  font-weight: 800;
  color: var(--color-text);
  font-family: var(--font-display);
  margin-bottom: 4px;
  letter-spacing: -1px;
`;

const StatLabel = styled.div`
  font-size: 14px;
  color: var(--color-text-secondary);
  font-family: var(--font-sans);
  font-weight: 500;
`;

const StatSub = styled.div`
  font-size: 12px;
  color: var(--color-muted);
  font-family: var(--font-sans);
  margin-top: 4px;
`;

interface StatData {
  icon: React.ReactNode;
  target: number;
  suffix: string;
  label: string;
  sub: string;
}

const stats: StatData[] = [
  { icon: <Users />, target: 500, suffix: '+', label: 'Клиентов', sub: 'Довольных пользователей' },
  { icon: <FolderCheck />, target: 10000, suffix: '+', label: 'Дел', sub: 'Успешно обработано' },
  { icon: <Clock />, target: 99, suffix: '%', label: 'Uptime', sub: 'Стабильность системы' },
  { icon: <Award />, target: 15, suffix: '+', label: 'Наград', sub: 'За инновации' },
];

const useCountUp = (target: number, inView: boolean) => {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!inView) return;
    let frame: number;
    const dur = 1500;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min((now - start) / dur, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      setVal(Math.round(ease * target));
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, inView]);
  return val;
};

const StatCard = ({ icon, target, suffix, label, sub }: StatData) => {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const val = useCountUp(target, inView);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect(); } },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <Card ref={ref}>
      <IconBox>{icon}</IconBox>
      <StatNum>{val.toLocaleString('ru-RU')}{suffix}</StatNum>
      <StatLabel>{label}</StatLabel>
      <StatSub>{sub}</StatSub>
    </Card>
  );
};

const AnimatedStats = () => (
  <Section>
    <Grid>
      {stats.map((s, i) => <StatCard key={i} {...s} />)}
    </Grid>
  </Section>
);

export default AnimatedStats;
