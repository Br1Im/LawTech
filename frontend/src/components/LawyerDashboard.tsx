import { useEffect, useMemo, useState } from 'react';
import styled from '@emotion/styled';
import { keyframes } from '@emotion/react';
import {
  Sparkles, Calendar, Clock3, FileSignature, Scale, Briefcase,
  ArrowUpRight, ArrowRight, Plus, BarChart3, ShieldCheck,
  CheckCircle2, AlertTriangle, Users2, FileSearch, BadgeCheck,
  CircleDollarSign, MessageSquare, ChevronRight, Star, TrendingUp,
} from 'lucide-react';
import { apiInstance } from '../shared/api/instance';
import { useAuth } from '../shared/lib/hooks/useAuth';

/* =========================== KEYFRAMES =========================== */
const fadeUp = keyframes`from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}`;
const shimmer = keyframes`0%{background-position:-200% 0}100%{background-position:200% 0}`;
const pulseDot = keyframes`0%,100%{transform:scale(1);opacity:.85}50%{transform:scale(1.35);opacity:.3}`;

/* =========================== SHELL =========================== */
const Page = styled.div`
  --lk-bg: var(--color-bg, #f6f7fb);
  --lk-fg: var(--color-text, #0f172a);
  --lk-mut: var(--color-text-secondary, #64748b);
  --lk-card: var(--color-bg-elevated, #ffffff);
  --lk-border: var(--color-border, rgba(15,23,42,0.08));
  --lk-accent: #2563eb;
  --lk-accent-2: #10b981;
  --lk-amber: #f59e0b;
  --lk-rose: #ef4444;
  --lk-violet: #7c3aed;

  [data-theme="dark"] & {
    --lk-card: #161b25;
    --lk-border: rgba(255,255,255,0.06);
    --lk-mut: #94a3b8;
  }

  padding: 28px clamp(20px, 3vw, 40px) 80px;
  display: grid;
  gap: 22px;
  color: var(--lk-fg);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  letter-spacing: -0.005em;
  & > * { animation: ${fadeUp} .55s ease both; }
  & > *:nth-of-type(2) { animation-delay: .04s; }
  & > *:nth-of-type(3) { animation-delay: .08s; }
  & > *:nth-of-type(4) { animation-delay: .12s; }
  & > *:nth-of-type(5) { animation-delay: .16s; }
`;

/* =========================== GREETING / HERO =========================== */
const Hero = styled.section`
  position: relative;
  overflow: hidden;
  padding: 28px 30px;
  border-radius: 28px;
  background:
    radial-gradient(circle at 8% 0%, rgba(37,99,235,0.20), transparent 38%),
    radial-gradient(circle at 92% 100%, rgba(16,185,129,0.18), transparent 42%),
    linear-gradient(140deg, #0f172a 0%, #111827 55%, #0b1220 100%);
  color: #f8fafc;
  display: grid;
  grid-template-columns: 1.4fr auto;
  gap: 24px;
  align-items: center;

  @media (max-width: 880px) {
    grid-template-columns: 1fr;
    padding: 24px;
  }

  &::after {
    content: '';
    position: absolute; inset: 0;
    background:
      repeating-linear-gradient(180deg, rgba(255,255,255,0.04) 0 1px, transparent 1px 80px),
      repeating-linear-gradient(90deg, rgba(255,255,255,0.04) 0 1px, transparent 1px 80px);
    mask: radial-gradient(circle at 50% 50%, black 40%, transparent 75%);
    -webkit-mask: radial-gradient(circle at 50% 50%, black 40%, transparent 75%);
    pointer-events: none;
  }
`;
const HeroLeft = styled.div`position: relative; z-index: 1;`;
const HeroEyebrow = styled.div`
  display: inline-flex; align-items: center; gap: 8px;
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.10);
  font-size: 12.5px;
  font-weight: 600;
  color: #cbd5e1;
  & > svg { width: 14px; height: 14px; color: #93c5fd; }
`;
const HeroTitle = styled.h1`
  margin: 14px 0 0;
  color: #ffffff;
  font-size: clamp(28px, 3.4vw, 40px);
  line-height: 1.02;
  letter-spacing: -0.045em;
  font-weight: 850;
  em {
    font-style: normal;
    background: linear-gradient(120deg, #60a5fa 0%, #34d399 50%, #a78bfa 100%);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }
`;
const HeroSub = styled.p`
  margin: 12px 0 0;
  max-width: 560px;
  font-size: 15px;
  line-height: 1.55;
  color: rgba(226,232,240,0.78);
`;
const HeroMeta = styled.div`
  margin-top: 18px;
  display: flex; flex-wrap: wrap;
  gap: 10px;
  & > span {
    display: inline-flex; align-items: center; gap: 7px;
    padding: 7px 12px;
    border-radius: 999px;
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.08);
    font-size: 13px;
    color: #e2e8f0;
    & > svg { width: 14px; height: 14px; opacity: .8; }
    & > b { color: #ffffff; font-weight: 700; }
  }
`;

const Avatar = styled.div`
  position: relative;
  z-index: 1;
  width: 96px; height: 96px;
  border-radius: 28px;
  display: grid; place-items: center;
  background:
    radial-gradient(circle at 30% 25%, rgba(255,255,255,0.5), transparent 35%),
    linear-gradient(135deg, #2563eb 0%, #7c3aed 50%, #10b981 100%);
  color: #fff;
  font-weight: 900;
  font-size: 36px;
  letter-spacing: -0.04em;
  box-shadow: 0 24px 48px -16px rgba(37,99,235,0.45), inset 0 1px 0 rgba(255,255,255,0.2);
  &::after {
    content: '';
    position: absolute; inset: -6px;
    border-radius: 34px;
    border: 1px dashed rgba(255,255,255,0.18);
    pointer-events: none;
  }
  @media (max-width: 880px) { justify-self: start; }
`;

/* =========================== KPI ROW =========================== */
const KpiRow = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  @media (max-width: 1080px) { grid-template-columns: repeat(2, 1fr); }
  @media (max-width: 560px)  { grid-template-columns: 1fr; }
`;
const Kpi = styled.div<{ tone: 'blue' | 'green' | 'amber' | 'violet' }>`
  position: relative;
  overflow: hidden;
  padding: 20px 22px;
  border-radius: 22px;
  background: var(--lk-card);
  border: 1px solid var(--lk-border);
  display: grid;
  grid-template-rows: auto 1fr auto;
  gap: 10px;
  transition: transform .35s ease, box-shadow .35s ease, border-color .35s ease;
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 18px 36px -22px rgba(15,23,42,0.18);
    border-color: color-mix(in srgb, var(--lk-border) 60%, var(--lk-accent));
  }
  & > .icon {
    width: 38px; height: 38px;
    border-radius: 12px;
    display: grid; place-items: center;
    color: #fff;
    background: ${(p) =>
      p.tone === 'blue'   ? 'linear-gradient(135deg,#1e40af,#3b82f6)' :
      p.tone === 'green'  ? 'linear-gradient(135deg,#065f46,#10b981)' :
      p.tone === 'amber'  ? 'linear-gradient(135deg,#b45309,#f59e0b)' :
                            'linear-gradient(135deg,#5b21b6,#8b5cf6)'};
    svg { width: 18px; height: 18px; }
  }
  & > .label {
    font-size: 12.5px;
    font-weight: 600;
    color: var(--lk-mut);
    letter-spacing: 0.02em;
    text-transform: uppercase;
  }
  & > .value {
    margin: 0;
    font-size: 30px;
    line-height: 1;
    letter-spacing: -0.045em;
    font-weight: 850;
    color: var(--lk-fg);
    display: flex; align-items: baseline; gap: 8px;
    & > small {
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0;
      color: var(--lk-mut);
    }
  }
  & > .delta {
    display: inline-flex; align-items: center; gap: 6px;
    font-size: 12.5px;
    color: ${(p) => (p.tone === 'amber' ? '#b45309' : '#047857')};
    font-weight: 700;
    svg { width: 14px; height: 14px; }
  }
  &::after {
    content: '';
    position: absolute;
    right: -30px; top: -30px;
    width: 120px; height: 120px;
    border-radius: 50%;
    opacity: .06;
    background: ${(p) =>
      p.tone === 'blue'   ? '#2563eb' :
      p.tone === 'green'  ? '#10b981' :
      p.tone === 'amber'  ? '#f59e0b' : '#8b5cf6'};
  }
`;

/* =========================== TWO‑COL =========================== */
const Grid = styled.div`
  display: grid;
  grid-template-columns: 1.55fr 1fr;
  gap: 18px;
  @media (max-width: 1080px) { grid-template-columns: 1fr; }
`;
const Card = styled.section`
  background: var(--lk-card);
  border: 1px solid var(--lk-border);
  border-radius: 22px;
  padding: 22px 22px 18px;
  display: grid;
  gap: 16px;
`;
const CardHead = styled.header`
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  h3 {
    margin: 0;
    color: var(--lk-fg);
    font-size: 17px;
    letter-spacing: -0.02em;
    font-weight: 800;
    display: inline-flex; align-items: center; gap: 10px;
    & > span.dot {
      display: grid; place-items: center;
      width: 28px; height: 28px;
      border-radius: 10px;
      background: color-mix(in srgb, var(--lk-accent) 12%, transparent);
      color: var(--lk-accent);
      svg { width: 16px; height: 16px; }
    }
  }
  & > a {
    display: inline-flex; align-items: center; gap: 4px;
    font-size: 13px; font-weight: 700;
    color: var(--lk-accent);
    text-decoration: none;
    cursor: pointer;
    svg { width: 14px; height: 14px; }
    &:hover { text-decoration: underline; }
  }
`;

/* =========================== MY DAY / TIMELINE =========================== */
const Timeline = styled.ol`
  list-style: none;
  margin: 0; padding: 0;
  display: grid; gap: 10px;
`;
const TimeItem = styled.li<{ tone: 'blue' | 'amber' | 'green' | 'rose' | 'muted' }>`
  display: grid;
  grid-template-columns: 64px 1fr auto;
  gap: 14px;
  align-items: center;
  padding: 12px 14px;
  border-radius: 16px;
  background: color-mix(in srgb, var(--lk-card) 70%, transparent);
  border: 1px solid var(--lk-border);
  transition: background .25s ease, transform .25s ease;
  &:hover { background: color-mix(in srgb, var(--lk-card) 100%, transparent); transform: translateX(2px); }

  & > .time {
    font-variant-numeric: tabular-nums;
    font-weight: 800;
    font-size: 14px;
    color: var(--lk-fg);
    letter-spacing: -0.01em;
  }
  & > .body {
    display: grid; gap: 3px;
    min-width: 0;
    .title { font-size: 14px; font-weight: 700; color: var(--lk-fg); }
    .sub   { font-size: 12.5px; color: var(--lk-mut); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  }
  & > .tag {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 5px 10px;
    border-radius: 999px;
    font-size: 11.5px;
    font-weight: 700;
    background: ${(p) =>
      p.tone === 'blue'   ? 'rgba(37,99,235,0.10)' :
      p.tone === 'amber'  ? 'rgba(245,158,11,0.12)' :
      p.tone === 'green'  ? 'rgba(16,185,129,0.12)' :
      p.tone === 'rose'   ? 'rgba(239,68,68,0.12)'  :
                            'rgba(100,116,139,0.10)'};
    color: ${(p) =>
      p.tone === 'blue'   ? '#1d4ed8' :
      p.tone === 'amber'  ? '#b45309' :
      p.tone === 'green'  ? '#047857' :
      p.tone === 'rose'   ? '#b91c1c' :
                            '#475569'};
    svg { width: 12px; height: 12px; }
  }
`;

/* =========================== CASES LIST =========================== */
const Cases = styled.div`
  display: grid; gap: 10px;
`;
const CaseRow = styled.div`
  display: grid;
  grid-template-columns: 40px 1fr auto auto;
  gap: 14px;
  align-items: center;
  padding: 14px;
  border-radius: 16px;
  background: color-mix(in srgb, var(--lk-card) 70%, transparent);
  border: 1px solid var(--lk-border);
  & > .num {
    width: 40px; height: 40px;
    display: grid; place-items: center;
    border-radius: 12px;
    background: color-mix(in srgb, var(--lk-accent) 10%, transparent);
    color: var(--lk-accent);
    font-weight: 850;
    font-size: 14px;
    letter-spacing: -0.02em;
  }
  & > .body {
    min-width: 0;
    .title {
      font-size: 14.5px;
      font-weight: 700;
      color: var(--lk-fg);
      letter-spacing: -0.01em;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .meta {
      margin-top: 4px;
      font-size: 12.5px;
      color: var(--lk-mut);
      display: inline-flex; align-items: center; gap: 10px;
      & > span { display: inline-flex; align-items: center; gap: 4px; }
      svg { width: 12px; height: 12px; }
    }
  }
  & > .progress {
    width: 110px;
    display: grid; gap: 4px;
    & > .bar {
      height: 6px;
      border-radius: 999px;
      background: color-mix(in srgb, var(--lk-mut) 18%, transparent);
      overflow: hidden;
      & > i {
        display: block;
        height: 100%;
        border-radius: 999px;
        background: linear-gradient(90deg, var(--lk-accent), var(--lk-accent-2));
      }
    }
    & > .pct {
      font-size: 11.5px;
      color: var(--lk-mut);
      font-weight: 700;
      text-align: right;
    }
  }
  & > .chev {
    color: var(--lk-mut);
    svg { width: 16px; height: 16px; }
  }
`;

/* =========================== DOCS QUEUE =========================== */
const Docs = styled.div`display: grid; gap: 10px;`;
const Doc = styled.div<{ risk?: 'low' | 'mid' | 'high' }>`
  display: grid;
  grid-template-columns: 36px 1fr auto;
  gap: 12px;
  align-items: center;
  padding: 12px 14px;
  border-radius: 14px;
  background: color-mix(in srgb, var(--lk-card) 70%, transparent);
  border: 1px solid var(--lk-border);
  & > .ic {
    width: 36px; height: 36px;
    border-radius: 12px;
    display: grid; place-items: center;
    color: var(--lk-accent);
    background: color-mix(in srgb, var(--lk-accent) 10%, transparent);
    svg { width: 16px; height: 16px; }
  }
  & > .meta {
    min-width: 0;
    .t { font-size: 14px; font-weight: 700; color: var(--lk-fg); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .s { font-size: 12px; color: var(--lk-mut); margin-top: 2px; }
  }
  & > .risk {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 4px 10px;
    border-radius: 999px;
    font-size: 11.5px; font-weight: 700;
    background: ${(p) => p.risk === 'high' ? 'rgba(239,68,68,0.12)' : p.risk === 'mid' ? 'rgba(245,158,11,0.14)' : 'rgba(16,185,129,0.12)'};
    color: ${(p) => p.risk === 'high' ? '#b91c1c' : p.risk === 'mid' ? '#b45309' : '#047857'};
    svg { width: 12px; height: 12px; }
  }
`;

/* =========================== ACTIVITY SPARKLINE =========================== */
const ActivityWrap = styled.div`
  display: grid; gap: 14px;
`;
const SparkBox = styled.div`
  position: relative;
  height: 120px;
  border-radius: 16px;
  background: color-mix(in srgb, var(--lk-card) 60%, transparent);
  border: 1px solid var(--lk-border);
  padding: 12px 14px 8px;
  overflow: hidden;
  & > .top {
    display: flex; justify-content: space-between; align-items: baseline;
    & > .num {
      font-size: 22px;
      font-weight: 900;
      letter-spacing: -0.04em;
      color: var(--lk-fg);
      small { font-size: 12px; font-weight: 700; color: var(--lk-mut); margin-left: 6px; }
    }
    & > .legend {
      font-size: 11.5px; color: var(--lk-mut); font-weight: 700;
      display: inline-flex; align-items: center; gap: 6px;
      & > i { width: 8px; height: 8px; border-radius: 2px; background: var(--lk-accent); }
    }
  }
  & > svg { position: absolute; left: 0; right: 0; bottom: 0; width: 100%; height: 78px; }
`;

/* =========================== QUICK ACTIONS =========================== */
const Actions = styled.section`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  @media (max-width: 880px) { grid-template-columns: repeat(2, 1fr); }
`;
const Action = styled.button`
  appearance: none;
  border: 1px solid var(--lk-border);
  background: var(--lk-card);
  border-radius: 18px;
  padding: 16px 18px;
  display: grid;
  grid-template-columns: 36px 1fr 18px;
  gap: 14px;
  align-items: center;
  cursor: pointer;
  text-align: left;
  font-family: inherit;
  color: var(--lk-fg);
  transition: transform .25s ease, box-shadow .25s ease, border-color .25s ease;
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 14px 30px -20px rgba(15,23,42,0.20);
    border-color: color-mix(in srgb, var(--lk-border) 60%, var(--lk-accent));
  }
  & > .ic {
    width: 36px; height: 36px;
    border-radius: 12px;
    display: grid; place-items: center;
    background: color-mix(in srgb, var(--lk-accent) 10%, transparent);
    color: var(--lk-accent);
    svg { width: 16px; height: 16px; }
  }
  & > .body {
    .t { font-size: 14px; font-weight: 700; }
    .s { font-size: 12px; color: var(--lk-mut); margin-top: 2px; }
  }
  & > .arr { color: var(--lk-mut); }
`;

/* =========================== EMPTY HINT =========================== */
const EmptyHint = styled.div`
  display: inline-flex; align-items: center; gap: 8px;
  padding: 7px 12px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--lk-amber) 12%, transparent);
  color: #b45309;
  font-size: 12px; font-weight: 700;
  svg { width: 13px; height: 13px; }
`;

/* =========================== HELPERS =========================== */
function timeOfDayGreeting(d = new Date()): string {
  const h = d.getHours();
  if (h < 6)  return 'Доброй ночи';
  if (h < 12) return 'Доброе утро';
  if (h < 18) return 'Добрый день';
  return 'Добрый вечер';
}
function ruDate(d = new Date()): string {
  return d.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });
}
function ruRub(n: number): string {
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(n);
}

/* =========================== DEMO DATA =========================== */
const demoSchedule: Array<{ time: string; title: string; sub: string; tone: 'blue'|'amber'|'green'|'rose'|'muted'; tag: string; icon: 'meet'|'court'|'doc'|'call'|'task' }> = [
  { time: '09:30', title: 'Встреча с клиентом «Альфа‑Логистика»',     sub: 'Обсуждение дополнения к договору поставки',                tone: 'blue',  tag: 'Консультация', icon: 'meet' },
  { time: '11:00', title: 'Заседание по делу А40‑182734/2025',         sub: 'Арбитражный суд г. Москвы, зал № 7',                       tone: 'amber', tag: 'Суд',          icon: 'court' },
  { time: '13:30', title: 'Финал‑ревью NDA для ООО «Промтех»',         sub: 'Проверить выходные положения и неустойку',                 tone: 'green', tag: 'Документ',     icon: 'doc' },
  { time: '15:00', title: 'Звонок: оценка перспектив банкротного дела', sub: 'Подключаются партнёр и налоговый консультант',             tone: 'blue',  tag: 'Звонок',       icon: 'call' },
  { time: '17:30', title: 'Подготовка позиции к завтрашнему слушанию', sub: 'Свести аргументы по 3 эпизодам, отправить старшему юристу', tone: 'rose',  tag: 'Дедлайн',      icon: 'task' },
];

const demoCases = [
  { num: 'А40‑182',  title: '«Альфа‑Логистика» vs «КаргоТранс»',     stage: 'Сбор доказательств',     deadline: 'до 28 мая',     progress: 62 },
  { num: 'СОЮ‑441',  title: 'Иванов И. И. — раздел имущества',         stage: 'Подготовка к слушанию',  deadline: 'через 9 дней',  progress: 78 },
  { num: 'А40‑210',  title: 'Промтех — оспаривание акта проверки',    stage: 'Подача жалобы',          deadline: 'до 31 мая',     progress: 35 },
  { num: 'СОЮ‑512',  title: 'ООО «Северный край» — взыскание долга',  stage: 'Исполнительное',         deadline: 'без дедлайна',  progress: 90 },
];

const demoDocs: Array<{ title: string; sub: string; risk: 'low'|'mid'|'high' }> = [
  { title: 'NDA — ООО «Промтех»',                       sub: '12 страниц · 2 правки от контрагента', risk: 'low'  },
  { title: 'Договор поставки № 78/2025',                sub: '24 страницы · 4 спорных пункта',        risk: 'mid'  },
  { title: 'Дополнение к договору аренды БЦ «Лотос»',   sub: '6 страниц · нет страховой ответственности', risk: 'high' },
  { title: 'Соглашение об отступном — Иванов И.И.',     sub: '3 страницы · готово к подписанию',       risk: 'low'  },
];

const sparkPoints = [4, 6, 5, 9, 7, 11, 8, 13, 10, 14, 12, 16, 13, 18, 15, 19, 17, 20];

/* =========================== COMPONENT =========================== */
export default function LawyerDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ cases: 0, deadlines: 0, cashMonth: 0, npsCount: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let canceled = false;
    (async () => {
      try {
        const [casesR, contractsR, clientsR] = await Promise.allSettled([
          apiInstance.get('/cases'),
          apiInstance.get('/contracts'),
          apiInstance.get('/clients'),
        ]);
        if (canceled) return;
        const casesLen     = casesR.status     === 'fulfilled' ? (casesR.value.data?.data?.length     ?? 0) : 0;
        const contractsLen = contractsR.status === 'fulfilled' ? (contractsR.value.data?.data?.length ?? 0) : 0;
        const clientsLen   = clientsR.status   === 'fulfilled' ? (clientsR.value.data?.data?.length   ?? 0) : 0;
        setStats({
          cases:     Math.max(casesLen, demoCases.length),
          deadlines: Math.max(0, contractsLen) + 3,
          cashMonth: 428_000,
          npsCount:  Math.max(clientsLen, 24),
        });
      } catch {
        setStats({ cases: demoCases.length, deadlines: 3, cashMonth: 428_000, npsCount: 24 });
      } finally {
        if (!canceled) setLoading(false);
      }
    })();
    return () => { canceled = true; };
  }, []);

  const firstName = user?.first_name || (user as { name?: string } | undefined)?.name?.split(' ')[0] || 'Анна';
  const initials = useMemo(() => {
    const last = user?.last_name || 'Юристова';
    return `${(firstName?.[0] || 'А').toUpperCase()}${(last?.[0] || 'Ю').toUpperCase()}`;
  }, [firstName, user?.last_name]);

  const sparkPath = useMemo(() => {
    const W = 600, H = 78, P = 10;
    const xs = sparkPoints.map((_, i) => P + (i * (W - P * 2)) / (sparkPoints.length - 1));
    const max = Math.max(...sparkPoints), min = Math.min(...sparkPoints);
    const ys = sparkPoints.map(v => H - P - ((v - min) / (max - min || 1)) * (H - P * 2));
    const pts = xs.map((x, i) => `${x.toFixed(1)},${ys[i].toFixed(1)}`);
    const d = `M ${pts[0]} ` + pts.slice(1).map(p => `L ${p}`).join(' ');
    const area = `${d} L ${xs[xs.length - 1]},${H} L ${xs[0]},${H} Z`;
    return { d, area };
  }, []);

  return (
    <Page>
      {/* =================== HERO =================== */}
      <Hero>
        <HeroLeft>
          <HeroEyebrow><Sparkles />Личный кабинет юриста</HeroEyebrow>
          <HeroTitle>
            {timeOfDayGreeting()}, <em>{firstName}</em>.
            <br />Сегодня у вас{' '}
            <em>{demoSchedule.length} событи{demoSchedule.length === 1 ? 'е' : 'й'}</em> в&nbsp;расписании.
          </HeroTitle>
          <HeroSub>
            Я подготовил повестку дня и подсветил то, что требует внимания в&nbsp;первую очередь —
            дедлайны, риски в&nbsp;договорах и&nbsp;дела с&nbsp;близким слушанием.
          </HeroSub>
          <HeroMeta>
            <span><Calendar />{ruDate()}</span>
            <span><Briefcase /><b>{stats.cases}</b>&nbsp;дел в работе</span>
            <span><Clock3 /><b>{stats.deadlines}</b>&nbsp;дедлайнов на неделе</span>
            <span><Star /><b>4.9</b>&nbsp;рейтинг по&nbsp;NPS</span>
          </HeroMeta>
        </HeroLeft>
        <Avatar aria-hidden>{initials}</Avatar>
      </Hero>

      {/* =================== KPI =================== */}
      <KpiRow>
        <Kpi tone="blue">
          <div className="icon"><Briefcase /></div>
          <div className="label">Дела в работе</div>
          <div className="value">{loading ? '—' : stats.cases}<small>активных</small></div>
          <div className="delta"><TrendingUp />+2 за неделю</div>
        </Kpi>
        <Kpi tone="amber">
          <div className="icon"><Clock3 /></div>
          <div className="label">Дедлайны на 7 дней</div>
          <div className="value">{loading ? '—' : stats.deadlines}<small>событ.</small></div>
          <div className="delta"><AlertTriangle />1 — критичный</div>
        </Kpi>
        <Kpi tone="green">
          <div className="icon"><CircleDollarSign /></div>
          <div className="label">Моя касса · май</div>
          <div className="value">{loading ? '—' : ruRub(stats.cashMonth)}</div>
          <div className="delta"><TrendingUp />+18% к&nbsp;апрелю</div>
        </Kpi>
        <Kpi tone="violet">
          <div className="icon"><Users2 /></div>
          <div className="label">Клиенты · NPS</div>
          <div className="value">4.9<small>/&nbsp;5.0</small></div>
          <div className="delta"><BadgeCheck />{stats.npsCount} отзывов</div>
        </Kpi>
      </KpiRow>

      {/* =================== TWO COLS =================== */}
      <Grid>
        {/* Left: Schedule + Cases */}
        <div style={{ display: 'grid', gap: 18 }}>
          <Card>
            <CardHead>
              <h3><span className="dot"><Calendar /></span>Мой день</h3>
              <a><Plus />Добавить событие</a>
            </CardHead>
            <Timeline>
              {demoSchedule.map((s) => {
                const Icon =
                  s.icon === 'meet'  ? Users2 :
                  s.icon === 'court' ? Scale :
                  s.icon === 'doc'   ? FileSignature :
                  s.icon === 'call'  ? MessageSquare : CheckCircle2;
                return (
                  <TimeItem key={s.time + s.title} tone={s.tone}>
                    <div className="time">{s.time}</div>
                    <div className="body">
                      <div className="title">{s.title}</div>
                      <div className="sub">{s.sub}</div>
                    </div>
                    <span className="tag"><Icon />{s.tag}</span>
                  </TimeItem>
                );
              })}
            </Timeline>
          </Card>

          <Card>
            <CardHead>
              <h3><span className="dot"><Briefcase /></span>Активные дела</h3>
              <a>Все дела <ArrowRight /></a>
            </CardHead>
            <Cases>
              {demoCases.map((c) => (
                <CaseRow key={c.num}>
                  <div className="num">{c.num.split('‑')[1] || c.num.slice(-3)}</div>
                  <div className="body">
                    <div className="title">{c.title}</div>
                    <div className="meta">
                      <span><FileSearch />{c.stage}</span>
                      <span><Clock3 />{c.deadline}</span>
                    </div>
                  </div>
                  <div className="progress">
                    <div className="bar"><i style={{ width: `${c.progress}%` }} /></div>
                    <div className="pct">{c.progress}%</div>
                  </div>
                  <div className="chev"><ChevronRight /></div>
                </CaseRow>
              ))}
            </Cases>
          </Card>
        </div>

        {/* Right: Docs + Activity */}
        <div style={{ display: 'grid', gap: 18 }}>
          <Card>
            <CardHead>
              <h3><span className="dot"><FileSignature /></span>Документы на&nbsp;проверку</h3>
              <a>Все <ArrowRight /></a>
            </CardHead>
            <Docs>
              {demoDocs.map((d) => (
                <Doc key={d.title} risk={d.risk}>
                  <div className="ic"><FileSignature /></div>
                  <div className="meta">
                    <div className="t">{d.title}</div>
                    <div className="s">{d.sub}</div>
                  </div>
                  <span className="risk">
                    {d.risk === 'high' ? <AlertTriangle /> : d.risk === 'mid' ? <AlertTriangle /> : <CheckCircle2 />}
                    {d.risk === 'high' ? 'Высокий' : d.risk === 'mid' ? 'Средний' : 'Низкий'}
                  </span>
                </Doc>
              ))}
            </Docs>
          </Card>

          <Card>
            <CardHead>
              <h3><span className="dot"><BarChart3 /></span>Активность за&nbsp;14 дней</h3>
              <EmptyHint><span style={{
                display: 'inline-block', width: 6, height: 6, borderRadius: 999,
                background: '#10b981', animation: `${pulseDot} 1.6s ease-in-out infinite`,
              }} />Онлайн</EmptyHint>
            </CardHead>
            <ActivityWrap>
              <SparkBox>
                <div className="top">
                  <div className="num">+34<small>обработанных документов</small></div>
                  <div className="legend"><i />Документы / день</div>
                </div>
                <svg viewBox="0 0 600 78" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="lkArea" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%"  stopColor="#2563eb" stopOpacity="0.32" />
                      <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d={sparkPath.area} fill="url(#lkArea)" />
                  <path d={sparkPath.d} fill="none" stroke="#2563eb" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </SparkBox>

              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10,
              }}>
                <Mini label="Согласованных NDA" value="9" tone="#10b981" />
                <Mini label="Договоров на правке" value="4" tone="#f59e0b" />
                <Mini label="Заседаний"           value="3" tone="#7c3aed" />
              </div>
            </ActivityWrap>
          </Card>

          <Card>
            <CardHead>
              <h3><span className="dot"><ShieldCheck /></span>AI‑подсказки</h3>
            </CardHead>
            <div style={{ display: 'grid', gap: 10 }}>
              <AiTip
                tone="rose"
                title="Срок ответа на претензию — завтра"
                text="ООО «Серебряный сокол». Подготовлен черновик ответа, осталось вычитать."
              />
              <AiTip
                tone="amber"
                title="Договор № 78/2025 — нестандартная неустойка"
                text="0,5% в день против вашего стандарта 0,1%. Рекомендую согласовать с партнёром."
              />
              <AiTip
                tone="green"
                title="Похожий прецедент найден"
                text="Дело А40‑104382/2023 — выигран на схожих основаниях, можно сослаться в позиции."
              />
            </div>
          </Card>
        </div>
      </Grid>

      {/* =================== QUICK ACTIONS =================== */}
      <Actions>
        <Action><div className="ic"><Plus /></div>          <div className="body"><div className="t">Создать договор</div><div className="s">Из шаблона или с нуля</div></div><div className="arr"><ArrowUpRight /></div></Action>
        <Action><div className="ic"><Sparkles /></div>      <div className="body"><div className="t">AI‑анализ документа</div><div className="s">Риски и&nbsp;цитаты из&nbsp;текста</div></div><div className="arr"><ArrowUpRight /></div></Action>
        <Action><div className="ic"><Users2 /></div>        <div className="body"><div className="t">Новый клиент</div><div className="s">Карточка и&nbsp;первичная встреча</div></div><div className="arr"><ArrowUpRight /></div></Action>
        <Action><div className="ic"><Calendar /></div>      <div className="body"><div className="t">Запись в&nbsp;календарь</div><div className="s">Встреча, заседание, дедлайн</div></div><div className="arr"><ArrowUpRight /></div></Action>
      </Actions>
    </Page>
  );
}

/* =========================== SUB‑COMPONENTS =========================== */
const MiniBox = styled.div<{ tone: string }>`
  padding: 12px 14px;
  border-radius: 14px;
  background: color-mix(in srgb, var(--lk-card) 70%, transparent);
  border: 1px solid var(--lk-border);
  display: grid; gap: 4px;
  & > .v {
    font-size: 22px;
    font-weight: 850;
    letter-spacing: -0.04em;
    color: var(--lk-fg);
    & > i {
      display: inline-block;
      width: 8px; height: 8px;
      border-radius: 999px;
      margin-right: 8px;
      background: ${(p) => p.tone};
      vertical-align: middle;
    }
  }
  & > .l {
    font-size: 11.5px;
    color: var(--lk-mut);
    font-weight: 700;
    letter-spacing: 0.02em;
    text-transform: uppercase;
  }
`;
function Mini({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <MiniBox tone={tone}>
      <div className="v"><i />{value}</div>
      <div className="l">{label}</div>
    </MiniBox>
  );
}

const TipBox = styled.div<{ tone: 'rose'|'amber'|'green' }>`
  display: grid;
  grid-template-columns: 28px 1fr;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 14px;
  background: ${(p) =>
    p.tone === 'rose'  ? 'rgba(239,68,68,0.06)'  :
    p.tone === 'amber' ? 'rgba(245,158,11,0.06)' :
                         'rgba(16,185,129,0.06)'};
  border: 1px solid ${(p) =>
    p.tone === 'rose'  ? 'rgba(239,68,68,0.18)'  :
    p.tone === 'amber' ? 'rgba(245,158,11,0.20)' :
                         'rgba(16,185,129,0.18)'};
  & > .ic {
    width: 28px; height: 28px;
    border-radius: 9px;
    display: grid; place-items: center;
    background: ${(p) =>
      p.tone === 'rose'  ? '#ef4444' :
      p.tone === 'amber' ? '#f59e0b' : '#10b981'};
    color: #fff;
    svg { width: 14px; height: 14px; }
  }
  .t { font-size: 13.5px; font-weight: 800; color: var(--lk-fg); letter-spacing: -0.01em; }
  .s { font-size: 12.5px; color: var(--lk-mut); margin-top: 2px; line-height: 1.4; }
`;
function AiTip({ tone, title, text }: { tone: 'rose'|'amber'|'green'; title: string; text: string }) {
  const Icon = tone === 'rose' ? AlertTriangle : tone === 'amber' ? Sparkles : BadgeCheck;
  return (
    <TipBox tone={tone}>
      <div className="ic"><Icon /></div>
      <div>
        <div className="t">{title}</div>
        <div className="s">{text}</div>
      </div>
    </TipBox>
  );
}
