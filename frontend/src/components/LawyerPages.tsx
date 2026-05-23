import { useEffect, useMemo, useState } from 'react';
import styled from '@emotion/styled';
import { keyframes } from '@emotion/react';
import {
  Sparkles, Users2, FileText, Wallet, Filter, Plus, Search,
  CalendarRange, ArrowUpRight, ArrowRight, Mail, Phone, MessageCircle,
  CheckCircle2, Clock3, TrendingUp, Receipt, Briefcase, PiggyBank,
  Target, Star, Zap, Banknote, BadgePercent, Inbox, ChevronRight,
  ScrollText, FileSignature, Building2,
} from 'lucide-react';
import { apiInstance } from '../shared/api/instance';

/* ====================== shared keyframes ====================== */
const fadeUp = keyframes`from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}`;
const shimmer = keyframes`0%{background-position:-200% 0}100%{background-position:200% 0}`;

/* ====================== shared styled ====================== */
const Page = styled.div`
  --lk-fg: var(--color-text, #0f172a);
  --lk-muted: var(--color-text-secondary, #64748b);
  --lk-bg: var(--color-bg, #f7f8fb);
  --lk-elev: var(--color-bg-elevated, #ffffff);
  --lk-border: var(--color-border, rgba(15,23,42,0.08));
  --lk-accent: #2563eb;
  --lk-accent-2: #10b981;
  --lk-warn: #b45309;
  --lk-danger: #b91c1c;
  display: grid;
  gap: 18px;
  padding: 6px 4px 28px;
  color: var(--lk-fg);
  animation: ${fadeUp} .5s ease both;
`;

const Hero = styled.section<{ tone?: 'blue' | 'green' | 'amber' }>`
  position: relative;
  overflow: hidden;
  padding: 26px 28px;
  border-radius: 22px;
  color: white;
  background:
    radial-gradient(120% 160% at 0% 0%, rgba(255,255,255,0.18), transparent 50%),
    radial-gradient(120% 160% at 100% 100%, rgba(0,0,0,0.18), transparent 50%),
    ${(p) =>
      p.tone === 'green'
        ? 'linear-gradient(135deg,#065f46 0%,#0f766e 55%,#0ea5a4 100%)'
        : p.tone === 'amber'
        ? 'linear-gradient(135deg,#7c2d12 0%,#b45309 55%,#d97706 100%)'
        : 'linear-gradient(135deg,#0b1220 0%,#1e293b 50%,#2563eb 130%)'};

  display: grid;
  grid-template-columns: 1fr auto;
  gap: 24px;
  align-items: end;

  @media (max-width: 760px) { grid-template-columns: 1fr; align-items: start; }

  &::before {
    content:'';
    position:absolute; inset:auto -10% -40% auto;
    width: 360px; height: 360px;
    background: radial-gradient(closest-side, rgba(255,255,255,0.22), transparent 70%);
    pointer-events:none;
  }
`;
const HeroLeft = styled.div`
  display: grid; gap: 12px; position: relative; z-index: 1;
`;
const HeroEyebrow = styled.div`
  display: inline-flex; gap: 8px; align-items: center;
  padding: 6px 12px; border-radius: 999px; width: max-content;
  background: rgba(255,255,255,0.14);
  border: 1px solid rgba(255,255,255,0.18);
  backdrop-filter: blur(6px);
  font-size: 12px; letter-spacing: 0.04em; font-weight: 700;
  text-transform: uppercase;
  svg { width: 14px; height: 14px; }
`;
const HeroTitle = styled.h1`
  margin: 0;
  font-size: clamp(24px, 3vw, 34px);
  font-weight: 900;
  letter-spacing: -0.045em;
  line-height: 1.05;
  color: inherit;
`;
const HeroSub = styled.p`
  margin: 0;
  color: rgba(255,255,255,0.85);
  font-size: 14.5px;
  line-height: 1.55;
  max-width: 560px;
`;
const HeroRight = styled.div`
  position: relative; z-index: 1;
  display: flex; gap: 10px; flex-wrap: wrap;
  align-items: center; justify-content: flex-end;
`;
const HeroChip = styled.div`
  padding: 10px 14px;
  background: rgba(255,255,255,0.12);
  border: 1px solid rgba(255,255,255,0.18);
  border-radius: 14px;
  font-size: 12px;
  font-weight: 600;
  color: rgba(255,255,255,0.95);
  display: grid;
  gap: 2px;
  min-width: 110px;
  strong {
    display: block;
    font-size: 18px;
    font-weight: 900;
    letter-spacing: -0.02em;
  }
  small {
    display: block;
    opacity: 0.7;
    font-size: 10.5px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
`;

const KPIRow = styled.section`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  @media (max-width: 1100px) { grid-template-columns: repeat(2, 1fr); }
  @media (max-width: 560px)  { grid-template-columns: 1fr; }
`;
const KPI = styled.div<{ tone?: 'blue' | 'green' | 'amber' | 'rose' }>`
  position: relative;
  padding: 18px 18px 16px;
  border-radius: 18px;
  background: var(--lk-elev);
  border: 1px solid var(--lk-border);
  display: grid;
  gap: 10px;
  transition: transform .25s ease, box-shadow .25s ease;
  overflow: hidden;
  &:hover { transform: translateY(-2px); box-shadow: 0 16px 36px -18px rgba(15,23,42,0.18); }
  &::before {
    content:'';
    position:absolute; inset: -20% -30% auto auto;
    width: 180px; height: 180px;
    border-radius: 50%;
    opacity: 0.08;
    background: ${(p) =>
      p.tone === 'green' ? 'radial-gradient(circle,#10b981,transparent 70%)'
      : p.tone === 'amber' ? 'radial-gradient(circle,#d97706,transparent 70%)'
      : p.tone === 'rose' ? 'radial-gradient(circle,#e11d48,transparent 70%)'
      : 'radial-gradient(circle,#2563eb,transparent 70%)'};
    pointer-events:none;
  }
  .ic {
    width: 36px; height: 36px;
    border-radius: 11px;
    display: grid; place-items: center;
    color: ${(p) =>
      p.tone === 'green' ? '#047857'
      : p.tone === 'amber' ? '#b45309'
      : p.tone === 'rose' ? '#be123c'
      : '#1d4ed8'};
    background: ${(p) =>
      p.tone === 'green' ? 'rgba(16,185,129,0.12)'
      : p.tone === 'amber' ? 'rgba(217,119,6,0.12)'
      : p.tone === 'rose' ? 'rgba(225,29,72,0.12)'
      : 'rgba(37,99,235,0.12)'};
    svg { width: 18px; height: 18px; }
  }
  .lab {
    font-size: 11px; letter-spacing: 0.07em;
    text-transform: uppercase; color: var(--lk-muted); font-weight: 700;
  }
  .val {
    font-size: 26px; font-weight: 900; letter-spacing: -0.04em;
    color: var(--lk-fg);
  }
  .delta {
    display: inline-flex; gap: 4px; align-items: center;
    font-size: 12px; color: var(--lk-muted); font-weight: 600;
    & > b { color: ${(p) => (p.tone === 'rose' ? '#be123c' : '#047857')}; font-weight: 800; }
  }
`;

const Card = styled.section`
  background: var(--lk-elev);
  border: 1px solid var(--lk-border);
  border-radius: 22px;
  padding: 22px 22px 20px;
`;
const CardHead = styled.header`
  display: flex; align-items: center; justify-content: space-between;
  gap: 14px;
  margin-bottom: 16px;
  h3 {
    margin: 0;
    display: inline-flex; gap: 10px; align-items: center;
    color: var(--lk-fg);
    font-size: 16px;
    font-weight: 800;
    letter-spacing: -0.02em;
  }
  .dot {
    display: grid; place-items: center;
    width: 28px; height: 28px;
    border-radius: 9px;
    background: rgba(37,99,235,0.10);
    color: #1d4ed8;
    svg { width: 16px; height: 16px; }
  }
  a, button.linklike {
    background: none; border: 0; cursor: pointer; padding: 0;
    color: var(--lk-muted);
    font-size: 12.5px; font-weight: 700; letter-spacing: 0.02em;
    display: inline-flex; align-items: center; gap: 4px;
    transition: color .2s ease;
    &:hover { color: var(--lk-fg); }
  }
`;

const Toolbar = styled.div`
  display: flex; flex-wrap: wrap; gap: 10px;
  margin-bottom: 18px;
  & > * { animation: ${fadeUp} .4s ease both; }
`;
const Pill = styled.button<{ active?: boolean }>`
  display: inline-flex; align-items: center; gap: 8px;
  padding: 9px 14px;
  border-radius: 999px;
  border: 1px solid ${(p) => (p.active ? 'transparent' : 'var(--lk-border)')};
  background: ${(p) =>
    p.active ? 'linear-gradient(135deg,#0f172a,#1e293b)' : 'var(--lk-elev)'};
  color: ${(p) => (p.active ? '#fff' : 'var(--lk-fg)')};
  cursor: pointer;
  font-weight: 700; font-size: 13px;
  transition: all .2s ease;
  box-shadow: ${(p) => (p.active ? '0 10px 26px -10px rgba(15,23,42,0.5)' : 'none')};
  &:hover { transform: translateY(-1px); }
  svg { width: 14px; height: 14px; }
`;
const SearchInput = styled.div`
  display: inline-flex; align-items: center; gap: 8px;
  background: var(--lk-elev);
  border: 1px solid var(--lk-border);
  border-radius: 12px;
  padding: 0 12px;
  flex: 1 1 240px; min-width: 220px; max-width: 360px;
  svg { width: 14px; height: 14px; color: var(--lk-muted); }
  input {
    flex: 1; border: 0; outline: 0; background: transparent;
    padding: 10px 0; font-size: 13.5px; color: var(--lk-fg);
    &::placeholder { color: var(--lk-muted); }
  }
`;
const Spacer = styled.div`flex: 1;`;
const Btn = styled.button<{ variant?: 'primary' | 'ghost' }>`
  display: inline-flex; align-items: center; gap: 8px;
  padding: 10px 16px;
  border-radius: 12px;
  border: 1px solid ${(p) => (p.variant === 'primary' ? 'transparent' : 'var(--lk-border)')};
  background: ${(p) =>
    p.variant === 'primary'
      ? 'linear-gradient(135deg,#1d4ed8 0%, #2563eb 100%)'
      : 'var(--lk-elev)'};
  color: ${(p) => (p.variant === 'primary' ? '#fff' : 'var(--lk-fg)')};
  font-weight: 700; font-size: 13.5px;
  cursor: pointer;
  transition: transform .2s ease, box-shadow .2s ease, background .2s ease;
  box-shadow: ${(p) => (p.variant === 'primary' ? '0 10px 24px -10px rgba(37,99,235,0.55)' : 'none')};
  &:hover { transform: translateY(-1px); }
  svg { width: 14px; height: 14px; }
`;

const Empty = styled.div`
  display: grid; place-items: center; text-align: center;
  padding: 38px 24px 28px;
  border-radius: 18px;
  border: 1px dashed var(--lk-border);
  background:
    radial-gradient(circle at 50% 0%, rgba(37,99,235,0.06), transparent 50%),
    var(--lk-elev);
  gap: 8px;
  & > .ill {
    width: 72px; height: 72px;
    border-radius: 22px;
    display: grid; place-items: center;
    background: linear-gradient(135deg, rgba(37,99,235,0.12), rgba(16,185,129,0.10));
    color: #1d4ed8;
    margin-bottom: 4px;
    svg { width: 32px; height: 32px; }
  }
  h4 {
    margin: 0; font-size: 17px; font-weight: 800; letter-spacing: -0.02em;
    color: var(--lk-fg);
  }
  p {
    margin: 0; color: var(--lk-muted); font-size: 13.5px; max-width: 380px;
    line-height: 1.55;
  }
  & > .actions {
    display: flex; gap: 8px; margin-top: 10px;
  }
`;

/* ====================== CLIENTS ====================== */
const ClientGrid = styled.div`
  display: grid; gap: 12px;
  grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
`;
const ClientCard = styled.article`
  position: relative;
  padding: 16px 16px 14px;
  border-radius: 18px;
  border: 1px solid var(--lk-border);
  background: var(--lk-elev);
  display: grid; gap: 12px;
  transition: all .25s ease;
  &:hover {
    transform: translateY(-2px);
    border-color: rgba(37,99,235,0.30);
    box-shadow: 0 18px 38px -22px rgba(15,23,42,0.20);
  }
  .h { display: flex; gap: 12px; align-items: center; }
  .avatar {
    width: 44px; height: 44px; flex: 0 0 44px;
    border-radius: 14px;
    display: grid; place-items: center;
    font-weight: 800; color: #1d4ed8;
    background: linear-gradient(135deg, rgba(37,99,235,0.14), rgba(16,185,129,0.10));
    font-size: 15px;
    letter-spacing: -0.01em;
  }
  .meta { display: grid; gap: 1px; }
  .name { font-weight: 800; color: var(--lk-fg); font-size: 14.5px; letter-spacing: -0.01em; }
  .sub  { font-size: 12px; color: var(--lk-muted); }
  .tags { display: flex; gap: 6px; flex-wrap: wrap; }
  .tag {
    font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 999px;
    background: rgba(15,23,42,0.06); color: var(--lk-fg);
    letter-spacing: 0.02em;
  }
  .tag.green { background: rgba(16,185,129,0.10); color: #047857; }
  .tag.blue  { background: rgba(37,99,235,0.10); color: #1d4ed8; }
  .tag.amber { background: rgba(217,119,6,0.10); color: #b45309; }
  .row {
    display: grid; grid-template-columns: 1fr auto; gap: 8px;
    padding-top: 10px; margin-top: 4px;
    border-top: 1px dashed var(--lk-border);
    align-items: center;
  }
  .row .v { font-size: 13px; color: var(--lk-fg); font-weight: 700; letter-spacing: -0.01em; }
  .row .l { font-size: 11px; color: var(--lk-muted); text-transform: uppercase; letter-spacing: 0.05em; }
  .links {
    display: flex; gap: 6px; margin-top: 6px;
    button {
      width: 28px; height: 28px; border-radius: 9px;
      border: 1px solid var(--lk-border);
      background: var(--lk-elev);
      color: var(--lk-muted);
      display: grid; place-items: center; cursor: pointer;
      transition: all .2s ease;
      &:hover { color: var(--lk-fg); transform: translateY(-1px); border-color: rgba(37,99,235,0.30); }
      svg { width: 14px; height: 14px; }
    }
  }
`;

type Client = {
  id: number;
  fullName: string;
  org?: string;
  contracts: number;
  ltv: number;
  status: 'active' | 'lead' | 'closed';
  lastTouch: string;
  initials: string;
};

const demoClients: Client[] = [
  { id: 1, fullName: 'Алексей Беликов', org: 'ООО «Альфа‑Логистика»', contracts: 3, ltv: 1_840_000, status: 'active', lastTouch: 'сегодня', initials: 'АБ' },
  { id: 2, fullName: 'Виктория Иванова', org: 'ИП Иванова В.С.', contracts: 1, ltv: 285_000, status: 'lead', lastTouch: 'вчера', initials: 'ВИ' },
  { id: 3, fullName: 'Денис Громов', org: 'АО «Промтех»', contracts: 5, ltv: 4_120_000, status: 'active', lastTouch: '2 дня назад', initials: 'ДГ' },
  { id: 4, fullName: 'Ольга Севрюгина', org: 'ООО «Северный край»', contracts: 2, ltv: 760_000, status: 'active', lastTouch: '4 дня назад', initials: 'ОС' },
  { id: 5, fullName: 'Михаил Завадский', org: '—', contracts: 1, ltv: 95_000, status: 'closed', lastTouch: 'месяц назад', initials: 'МЗ' },
  { id: 6, fullName: 'Юлия Карпова', org: 'ООО «Карпов и партнёры»', contracts: 2, ltv: 540_000, status: 'lead', lastTouch: '3 дня назад', initials: 'ЮК' },
];

const fmtMoney = (n: number) => n.toLocaleString('ru-RU') + ' ₽';

export function LawyerClients() {
  const [tab, setTab] = useState<'all' | 'active' | 'lead' | 'closed'>('all');
  const [q, setQ] = useState('');
  const [real, setReal] = useState<number>(0);

  useEffect(() => {
    (async () => {
      try {
        const r = await apiInstance.get('/clients');
        const arr = (r.data?.data || r.data || []) as any[];
        setReal(Array.isArray(arr) ? arr.length : 0);
      } catch { setReal(0); }
    })();
  }, []);

  const filtered = useMemo(() => {
    return demoClients.filter((c) => {
      if (tab !== 'all' && c.status !== tab) return false;
      if (q.trim()) {
        const s = q.trim().toLowerCase();
        if (!c.fullName.toLowerCase().includes(s) && !(c.org || '').toLowerCase().includes(s))
          return false;
      }
      return true;
    });
  }, [tab, q]);

  const totalLtv = useMemo(() => demoClients.reduce((a, c) => a + c.ltv, 0), []);
  const activeCount = useMemo(() => demoClients.filter((c) => c.status === 'active').length, []);
  const leadCount = useMemo(() => demoClients.filter((c) => c.status === 'lead').length, []);

  return (
    <Page>
      <Hero>
        <HeroLeft>
          <HeroEyebrow><Users2 /> Мои клиенты</HeroEyebrow>
          <HeroTitle>Портфель клиентов — <span style={{ color: '#bfdbfe' }}>под контролем</span></HeroTitle>
          <HeroSub>
            Все ваши клиенты и сделки в одном представлении. Подсветка статусов, быстрые контакты и история взаимодействий.
            {real > 0 && <> · {real} клиентов в&nbsp;CRM</>}
          </HeroSub>
        </HeroLeft>
        <HeroRight>
          <HeroChip><small>Активные</small><strong>{activeCount}</strong></HeroChip>
          <HeroChip><small>Лиды</small><strong>{leadCount}</strong></HeroChip>
          <HeroChip><small>LTV портфеля</small><strong>{(totalLtv/1000).toFixed(0)}k ₽</strong></HeroChip>
        </HeroRight>
      </Hero>

      <KPIRow>
        <KPI tone="blue">
          <div className="ic"><Users2 /></div>
          <div className="lab">Всего клиентов</div>
          <div className="val">{demoClients.length}</div>
          <div className="delta"><b>+{leadCount}</b> новых за месяц</div>
        </KPI>
        <KPI tone="green">
          <div className="ic"><CheckCircle2 /></div>
          <div className="lab">Активные</div>
          <div className="val">{activeCount}</div>
          <div className="delta"><b>92%</b> доля удержания</div>
        </KPI>
        <KPI tone="amber">
          <div className="ic"><Target /></div>
          <div className="lab">Лиды в работе</div>
          <div className="val">{leadCount}</div>
          <div className="delta"><b>3</b> готовы к оферте</div>
        </KPI>
        <KPI tone="rose">
          <div className="ic"><Banknote /></div>
          <div className="lab">LTV портфеля</div>
          <div className="val">{(totalLtv/1_000_000).toFixed(1)}M ₽</div>
          <div className="delta"><b>+12%</b> к&nbsp;апрелю</div>
        </KPI>
      </KPIRow>

      <Card>
        <CardHead>
          <h3><span className="dot"><Users2 /></span>Все клиенты</h3>
          <button className="linklike">CSV экспорт <ChevronRight style={{ width: 14, height: 14 }} /></button>
        </CardHead>

        <Toolbar>
          <Pill active={tab === 'all'} onClick={() => setTab('all')}><Filter /> Все · {demoClients.length}</Pill>
          <Pill active={tab === 'active'} onClick={() => setTab('active')}><CheckCircle2 /> Активные · {activeCount}</Pill>
          <Pill active={tab === 'lead'} onClick={() => setTab('lead')}><Target /> Лиды · {leadCount}</Pill>
          <Pill active={tab === 'closed'} onClick={() => setTab('closed')}><Clock3 /> Архив</Pill>
          <SearchInput>
            <Search />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Поиск по имени, организации…"
            />
          </SearchInput>
          <Spacer />
          <Btn><CalendarRange /> Период</Btn>
          <Btn variant="primary"><Plus /> Новый клиент</Btn>
        </Toolbar>

        {filtered.length === 0 ? (
          <Empty>
            <div className="ill"><Inbox /></div>
            <h4>Нет клиентов с такими условиями</h4>
            <p>Попробуйте сбросить фильтры или добавить нового клиента в&nbsp;портфель.</p>
            <div className="actions">
              <Btn onClick={() => { setTab('all'); setQ(''); }}>Сбросить фильтры</Btn>
              <Btn variant="primary"><Plus /> Новый клиент</Btn>
            </div>
          </Empty>
        ) : (
          <ClientGrid>
            {filtered.map((c) => (
              <ClientCard key={c.id}>
                <div className="h">
                  <div className="avatar">{c.initials}</div>
                  <div className="meta">
                    <div className="name">{c.fullName}</div>
                    <div className="sub">{c.org}</div>
                  </div>
                </div>
                <div className="tags">
                  {c.status === 'active' && <span className="tag green">Активный</span>}
                  {c.status === 'lead' && <span className="tag amber">Лид</span>}
                  {c.status === 'closed' && <span className="tag">Архив</span>}
                  <span className="tag blue">{c.contracts} {c.contracts === 1 ? 'договор' : 'договоров'}</span>
                </div>
                <div className="row">
                  <div>
                    <div className="l">LTV</div>
                    <div className="v">{fmtMoney(c.ltv)}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="l">Последний контакт</div>
                    <div className="v">{c.lastTouch}</div>
                  </div>
                </div>
                <div className="links">
                  <button title="Позвонить"><Phone /></button>
                  <button title="Написать"><Mail /></button>
                  <button title="Сообщение"><MessageCircle /></button>
                  <Spacer />
                  <button title="Открыть карточку" style={{ width: 'auto', padding: '0 10px' }}>
                    Карточка <ChevronRight />
                  </button>
                </div>
              </ClientCard>
            ))}
          </ClientGrid>
        )}
      </Card>
    </Page>
  );
}

/* ====================== ACTS ====================== */
const Table = styled.div`
  border: 1px solid var(--lk-border);
  border-radius: 16px;
  overflow: hidden;
  background: var(--lk-elev);
  & > .thead, & > .row {
    display: grid;
    grid-template-columns: 110px 1.5fr 1.4fr 110px 120px 130px 110px;
    gap: 10px;
    padding: 12px 16px;
    align-items: center;
  }
  @media (max-width: 1000px) {
    & > .thead { display: none; }
    & > .row {
      grid-template-columns: 1fr; gap: 4px;
      padding: 14px 16px;
    }
  }
  & > .thead {
    background: linear-gradient(180deg, rgba(15,23,42,0.04), transparent);
    color: var(--lk-muted);
    font-size: 11px; font-weight: 800; letter-spacing: 0.08em;
    text-transform: uppercase;
    border-bottom: 1px solid var(--lk-border);
  }
  & > .row {
    border-top: 1px solid var(--lk-border);
    transition: background .2s ease;
    &:hover { background: rgba(37,99,235,0.04); }
    & .cli { display: flex; gap: 10px; align-items: center; }
    & .av {
      width: 32px; height: 32px; flex: 0 0 32px;
      border-radius: 10px; background: rgba(37,99,235,0.10);
      color: #1d4ed8; display: grid; place-items: center;
      font-weight: 800; font-size: 12px;
    }
    & .contract { color: var(--lk-fg); font-weight: 700; font-size: 13px; }
    & .small { color: var(--lk-muted); font-size: 12px; }
    & .sum   { font-weight: 800; color: var(--lk-fg); letter-spacing: -0.02em; }
    & .stat {
      display: inline-flex; gap: 6px; align-items: center;
      padding: 4px 10px; border-radius: 999px; font-size: 11.5px; font-weight: 800;
      width: max-content;
      & > i {
        width: 6px; height: 6px; border-radius: 50%;
        background: currentColor;
      }
    }
    & .stat.signed   { background: rgba(16,185,129,0.10); color: #047857; }
    & .stat.pending  { background: rgba(217,119,6,0.10);  color: #b45309; }
    & .stat.draft    { background: rgba(15,23,42,0.06);   color: var(--lk-fg); }
  }
`;

type Act = {
  id: number;
  date: string;
  client: string;
  contract: string;
  type: string;
  amount: number;
  responsible: string;
  status: 'signed' | 'pending' | 'draft';
  office: string;
};

const demoActs: Act[] = [
  { id: 211, date: '22.05.2026', client: 'ООО «Альфа‑Логистика»', contract: 'Договор поставки № 78/2025', type: 'Услуги', amount: 245_000, responsible: 'А. Юристова', status: 'signed',  office: 'Москва' },
  { id: 212, date: '21.05.2026', client: 'Иванов И. И.',            contract: 'Развод № 441/2025',          type: 'Юр. услуги', amount: 95_000, responsible: 'А. Юристова', status: 'pending', office: 'Москва' },
  { id: 213, date: '18.05.2026', client: 'АО «Промтех»',            contract: 'Спор с ФНС № 512/2025',       type: 'Сопровождение', amount: 380_000, responsible: 'А. Юристова', status: 'draft',   office: 'Москва' },
  { id: 214, date: '15.05.2026', client: 'ООО «Северный край»',     contract: 'Взыскание № 210/2025',        type: 'Взыскание', amount: 120_000, responsible: 'А. Юристова', status: 'signed',  office: 'Москва' },
];

export function LawyerActs() {
  const [tab, setTab] = useState<'all' | 'signed' | 'pending' | 'draft'>('all');
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    return demoActs.filter((a) => {
      if (tab !== 'all' && a.status !== tab) return false;
      if (q.trim()) {
        const s = q.trim().toLowerCase();
        if (!a.client.toLowerCase().includes(s) && !a.contract.toLowerCase().includes(s)) return false;
      }
      return true;
    });
  }, [tab, q]);

  const totalSigned = demoActs.filter((a) => a.status === 'signed').reduce((s, a) => s + a.amount, 0);
  const totalPending = demoActs.filter((a) => a.status === 'pending').reduce((s, a) => s + a.amount, 0);
  const totalDraft = demoActs.filter((a) => a.status === 'draft').reduce((s, a) => s + a.amount, 0);

  return (
    <Page>
      <Hero tone="green">
        <HeroLeft>
          <HeroEyebrow><FileText /> Мои акты</HeroEyebrow>
          <HeroTitle>Акты и&nbsp;закрытия — <span style={{ color: '#a7f3d0' }}>без потерь</span></HeroTitle>
          <HeroSub>
            Подписанные, ожидающие и черновики. Сразу видно, что ещё не закрыто и&nbsp;где деньги в&nbsp;воздухе.
          </HeroSub>
        </HeroLeft>
        <HeroRight>
          <HeroChip><small>Подписано</small><strong>{fmtMoney(totalSigned)}</strong></HeroChip>
          <HeroChip><small>Ожидает</small><strong>{fmtMoney(totalPending)}</strong></HeroChip>
        </HeroRight>
      </Hero>

      <KPIRow>
        <KPI tone="green">
          <div className="ic"><CheckCircle2 /></div>
          <div className="lab">Подписано в мае</div>
          <div className="val">{fmtMoney(totalSigned)}</div>
          <div className="delta"><b>+24%</b> к&nbsp;апрелю</div>
        </KPI>
        <KPI tone="amber">
          <div className="ic"><Clock3 /></div>
          <div className="lab">Ожидает подписи</div>
          <div className="val">{fmtMoney(totalPending)}</div>
          <div className="delta">{demoActs.filter(a=>a.status==='pending').length} {demoActs.filter(a=>a.status==='pending').length===1?'акт':'акта'}</div>
        </KPI>
        <KPI tone="rose">
          <div className="ic"><ScrollText /></div>
          <div className="lab">Черновики</div>
          <div className="val">{fmtMoney(totalDraft)}</div>
          <div className="delta">требуют завершения</div>
        </KPI>
        <KPI tone="blue">
          <div className="ic"><TrendingUp /></div>
          <div className="lab">Конверсия в&nbsp;подпись</div>
          <div className="val">86%</div>
          <div className="delta"><b>+4 пп</b> за&nbsp;квартал</div>
        </KPI>
      </KPIRow>

      <Card>
        <CardHead>
          <h3><span className="dot"><FileText /></span>Реестр актов</h3>
          <button className="linklike">XLSX выгрузка <ChevronRight style={{ width: 14, height: 14 }} /></button>
        </CardHead>

        <Toolbar>
          <Pill active={tab === 'all'} onClick={() => setTab('all')}><Filter /> Все · {demoActs.length}</Pill>
          <Pill active={tab === 'signed'} onClick={() => setTab('signed')}><CheckCircle2 /> Подписаны</Pill>
          <Pill active={tab === 'pending'} onClick={() => setTab('pending')}><Clock3 /> Ожидают</Pill>
          <Pill active={tab === 'draft'} onClick={() => setTab('draft')}><ScrollText /> Черновики</Pill>
          <SearchInput>
            <Search />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск: клиент, договор, № акта" />
          </SearchInput>
          <Spacer />
          <Btn><CalendarRange /> Период</Btn>
          <Btn variant="primary"><Plus /> Новый акт</Btn>
        </Toolbar>

        {filtered.length === 0 ? (
          <Empty>
            <div className="ill"><Inbox /></div>
            <h4>Актов под фильтр нет</h4>
            <p>Попробуйте сменить статус или период, либо&nbsp;создайте новый акт.</p>
          </Empty>
        ) : (
          <Table>
            <div className="thead">
              <div>Дата</div><div>Клиент</div><div>Договор</div>
              <div>Тип</div><div style={{ textAlign: 'right' }}>Сумма</div>
              <div>Ответственный</div><div>Статус</div>
            </div>
            {filtered.map((a) => (
              <div className="row" key={a.id}>
                <div className="small">{a.date}</div>
                <div className="cli">
                  <div className="av">{a.client.replace(/[^A-ZА-Я]/gi,'').slice(0,2).toUpperCase()}</div>
                  <div>
                    <div className="contract">{a.client}</div>
                    <div className="small">№ акта {a.id} · {a.office}</div>
                  </div>
                </div>
                <div>
                  <div className="contract">{a.contract}</div>
                  <div className="small">подготовлен А.Ю.</div>
                </div>
                <div className="small">{a.type}</div>
                <div className="sum" style={{ textAlign: 'right' }}>{fmtMoney(a.amount)}</div>
                <div className="small">{a.responsible}</div>
                <div>
                  <span className={'stat ' + a.status}><i />{a.status === 'signed' ? 'Подписан' : a.status === 'pending' ? 'Ожидает' : 'Черновик'}</span>
                </div>
              </div>
            ))}
          </Table>
        )}
      </Card>
    </Page>
  );
}

/* ====================== SALARY ====================== */
const PaySplit = styled.div`
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 16px;
  @media (max-width: 980px) { grid-template-columns: 1fr; }
`;
const PayCard = styled.div`
  position: relative;
  padding: 22px;
  border-radius: 20px;
  border: 1px solid var(--lk-border);
  background:
    radial-gradient(120% 120% at 100% 0%, rgba(16,185,129,0.08), transparent 50%),
    var(--lk-elev);
  display: grid; gap: 14px;
  & > .top { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
  & .label { font-size: 11px; color: var(--lk-muted); text-transform: uppercase; letter-spacing: 0.07em; font-weight: 800; }
  & .total { font-size: 38px; font-weight: 900; letter-spacing: -0.04em; color: var(--lk-fg); }
  & .delta { font-size: 13px; color: #047857; font-weight: 800; display: inline-flex; gap: 4px; align-items: center; }
  & .ic {
    width: 44px; height: 44px; border-radius: 14px;
    display: grid; place-items: center;
    background: linear-gradient(135deg,#065f46,#10b981);
    color: white;
    svg { width: 22px; height: 22px; }
  }
  & .bars {
    margin-top: 10px;
    display: grid; gap: 8px;
  }
  & .bar {
    display: grid; grid-template-columns: 110px 1fr 90px; gap: 12px; align-items: center;
    font-size: 13px;
    .l { color: var(--lk-muted); font-weight: 600; }
    .track {
      position: relative; height: 8px; border-radius: 999px;
      background: rgba(15,23,42,0.06);
      overflow: hidden;
      & > i { position: absolute; inset: 0 auto 0 0; border-radius: 999px;
        background: linear-gradient(90deg,#2563eb,#10b981); }
    }
    .v { text-align: right; font-weight: 800; color: var(--lk-fg); letter-spacing: -0.02em; }
  }
`;
const PayHistory = styled.div`
  display: grid; gap: 10px;
  & > .item {
    padding: 12px 14px;
    border-radius: 14px;
    border: 1px solid var(--lk-border);
    background: var(--lk-elev);
    display: grid;
    grid-template-columns: 36px 1fr auto;
    gap: 12px;
    align-items: center;
    transition: all .2s ease;
    &:hover { transform: translateY(-1px); box-shadow: 0 12px 26px -16px rgba(15,23,42,0.18); }
    & .ic {
      width: 36px; height: 36px; border-radius: 11px;
      display: grid; place-items: center;
      color: #047857; background: rgba(16,185,129,0.10);
      svg { width: 16px; height: 16px; }
    }
    & .t { font-weight: 800; color: var(--lk-fg); font-size: 13.5px; letter-spacing: -0.01em; }
    & .s { font-size: 12px; color: var(--lk-muted); margin-top: 2px; }
    & .a { font-weight: 800; color: var(--lk-fg); font-size: 14.5px; letter-spacing: -0.02em; text-align: right; }
  }
`;

const months = [
  { m: 'Май',     base: 80_000, bonus: 188_500, bonusPct: 38 },
  { m: 'Апрель',  base: 80_000, bonus: 142_000, bonusPct: 32 },
  { m: 'Март',    base: 80_000, bonus: 96_000,  bonusPct: 26 },
  { m: 'Февраль', base: 80_000, bonus: 122_000, bonusPct: 30 },
];

export function LawyerSalary() {
  const totalMay = months[0].base + months[0].bonus;
  const totalYear = months.reduce((s, m) => s + m.base + m.bonus, 0);
  const maxMonthly = Math.max(...months.map((m) => m.base + m.bonus));

  return (
    <Page>
      <Hero tone="amber">
        <HeroLeft>
          <HeroEyebrow><Wallet /> Моя касса</HeroEyebrow>
          <HeroTitle>Заработок и&nbsp;бонусы — <span style={{ color: '#fde68a' }}>прозрачно</span></HeroTitle>
          <HeroSub>
            Оклад, бонус по&nbsp;закрытым делам, премии за&nbsp;скорость и&nbsp;качество. Всё считается автоматически по&nbsp;утверждённой схеме.
          </HeroSub>
        </HeroLeft>
        <HeroRight>
          <HeroChip><small>Май к&nbsp;выплате</small><strong>{fmtMoney(totalMay)}</strong></HeroChip>
          <HeroChip><small>С&nbsp;начала года</small><strong>{fmtMoney(totalYear)}</strong></HeroChip>
        </HeroRight>
      </Hero>

      <KPIRow>
        <KPI tone="green">
          <div className="ic"><Banknote /></div>
          <div className="lab">Май 2026 · итог</div>
          <div className="val">{fmtMoney(totalMay)}</div>
          <div className="delta"><b>+18%</b> к&nbsp;апрелю</div>
        </KPI>
        <KPI tone="blue">
          <div className="ic"><Briefcase /></div>
          <div className="lab">Оклад</div>
          <div className="val">{fmtMoney(months[0].base)}</div>
          <div className="delta">фикс часть</div>
        </KPI>
        <KPI tone="amber">
          <div className="ic"><BadgePercent /></div>
          <div className="lab">Бонус</div>
          <div className="val">{fmtMoney(months[0].bonus)}</div>
          <div className="delta"><b>{months[0].bonusPct}%</b> от&nbsp;поступлений</div>
        </KPI>
        <KPI tone="rose">
          <div className="ic"><Star /></div>
          <div className="lab">Премии и&nbsp;качество</div>
          <div className="val">+15 000 ₽</div>
          <div className="delta">за NPS&nbsp;5.0 в&nbsp;месяце</div>
        </KPI>
      </KPIRow>

      <PaySplit>
        <Card>
          <CardHead>
            <h3><span className="dot"><PiggyBank /></span>Динамика заработка</h3>
            <button className="linklike">Детальный расчёт <ChevronRight style={{ width: 14, height: 14 }} /></button>
          </CardHead>
          <PayCard>
            <div className="top">
              <div>
                <div className="label">К выплате · май</div>
                <div className="total">{fmtMoney(totalMay)}</div>
                <div className="delta"><TrendingUp style={{ width: 14, height: 14 }} /> +18% к&nbsp;апрелю</div>
              </div>
              <div className="ic"><Wallet /></div>
            </div>
            <div className="bars">
              {months.map((m) => {
                const t = m.base + m.bonus;
                const pct = Math.round((t / maxMonthly) * 100);
                return (
                  <div className="bar" key={m.m}>
                    <span className="l">{m.m}</span>
                    <div className="track"><i style={{ width: `${pct}%` }} /></div>
                    <span className="v">{fmtMoney(t)}</span>
                  </div>
                );
              })}
            </div>
          </PayCard>
        </Card>

        <Card>
          <CardHead>
            <h3><span className="dot"><Receipt /></span>История выплат</h3>
            <button className="linklike">Все <ChevronRight style={{ width: 14, height: 14 }} /></button>
          </CardHead>
          <PayHistory>
            {months.map((m, i) => (
              <div className="item" key={m.m}>
                <div className="ic"><CheckCircle2 /></div>
                <div>
                  <div className="t">{m.m} 2026</div>
                  <div className="s">оклад {fmtMoney(m.base)} + бонус {fmtMoney(m.bonus)}</div>
                </div>
                <div className="a">{fmtMoney(m.base + m.bonus)}</div>
              </div>
            ))}
          </PayHistory>
        </Card>
      </PaySplit>

      <Card>
        <CardHead>
          <h3><span className="dot"><Zap /></span>Как формируется ваш доход</h3>
        </CardHead>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }} className="rules">
          {[
            { ic: <Briefcase />, t: 'Оклад', d: 'Базовая часть — 80 000 ₽ в&nbsp;месяц.' },
            { ic: <BadgePercent />, t: 'Бонус', d: '38% от поступлений по&nbsp;вашим делам после акта.' },
            { ic: <Star />, t: 'Премии', d: 'До +25 000 ₽ за NPS ≥ 4.8 и&nbsp;соблюдение сроков.' },
          ].map((r) => (
            <div key={r.t}
              style={{
                padding: 16,
                borderRadius: 16,
                border: '1px solid var(--lk-border)',
                background: 'var(--lk-elev)',
                display: 'grid',
                gap: 8,
              }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: 11,
                display: 'grid', placeItems: 'center',
                color: '#1d4ed8', background: 'rgba(37,99,235,0.10)',
              }}>{r.ic}</div>
              <div style={{ fontWeight: 800, color: 'var(--lk-fg)', fontSize: 14 }}>{r.t}</div>
              <div style={{ color: 'var(--lk-muted)', fontSize: 13, lineHeight: 1.5 }} dangerouslySetInnerHTML={{ __html: r.d }} />
            </div>
          ))}
        </div>
      </Card>
    </Page>
  );
}
