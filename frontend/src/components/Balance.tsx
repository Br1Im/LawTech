import React, { useState, useEffect, useCallback } from "react";
import { buildApiUrl, getAuthHeaders } from '../shared/utils/apiUtils';
import { useAuth } from '../shared/lib/hooks/useAuth';
import { TableSkeleton } from './ui';
import "./Balance.css";

/* ─── Types ─── */
type Bucket = { cash: number; noncash: number; bank: number };

interface DayRow {
  date: string;
  opening: Bucket;
  income: Bucket;
  expense: Bucket;
  transfer?: Bucket;
  transfer_total?: number;
  closing: Bucket;
}

interface PeriodInfo {
  label: string;
  from: string;
  to: string;
  today: string;
  cycle_index?: number | null;
  current_cycle_index?: number | null;
  duration_days?: number | null;
}

interface BalanceData {
  office_id: number;
  has_opening: boolean;
  start_date: string | null;
  date_from: string;
  date_to: string;
  opening: Bucket;
  current: Bucket;
  current_total: number;
  totals: { income: Bucket; expense: Bucket; transfer: Bucket };
  days: DayRow[];
  period?: PeriodInfo | null;
}

interface IncomeItem { id: number; payment_method: string; amount: number; title: string; client_name?: string | null; lawyer_name?: string | null; description?: string | null; time?: string | null; }
interface ExpenseItem { id: number; category: string; payment_method: string; amount: number; title: string; description: string | null; is_auto: boolean; expense_type: string; time?: string | null; }
interface TransferItem { id: number; source: string; destination: string; amount: number; comment?: string | null; time?: string | null; }
interface DayDetail {
  date: string;
  income: { contracts: IncomeItem[]; manual: IncomeItem[]; };
  expenses: ExpenseItem[];
  transfers: TransferItem[];
}

interface OfficeOption { id: string; name: string; }


const PM_LABEL: Record<string, string> = {
  cash: 'Наличные',
  noncash: 'Р/С',
  bank: 'Банковский перевод',
  sbp: 'СБП',
};
const TRANSFER_PM_OPTIONS = [
  { value: 'cash', label: 'Наличные' },
  { value: 'bank', label: 'Расчётный счёт' },
  { value: 'noncash', label: 'Банковская карта' },
];

const fmt = (n: number) => (Number(n) || 0).toLocaleString('ru-RU');
const clientShortName = (name?: string | null) => {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '';
  return [parts[0], ...parts.slice(1, 3).map(part => `${part.charAt(0).toUpperCase()}.`)].join(' ');
};
const fmtMoney = (n: number) => fmt(n) + ' ₽';
const fmtSigned = (n: number) => (n >= 0 ? '+ ' : '− ') + fmt(Math.abs(n)) + ' ₽';
const todayStr = () => new Date().toISOString().slice(0, 10);
const localDateStr = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const MONTHS = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
const ruLongDate = (d: string) => { const [y,m,day] = d.split('-'); return `${day} ${MONTHS[+m-1]} ${y}`; };
const ruShort = (d: string) => { const [y,m,day] = d.split('-'); return `${day}.${m}.${y}`; };

const ZERO: Bucket = { cash: 0, noncash: 0, bank: 0 };
const sumB = (b: Bucket) => (b.cash || 0) + (b.noncash || 0) + (b.bank || 0);

/* ─── Icons ─── */
const IcCash = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 9v.01M18 15v.01"/></svg>);
const IcCard = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>);
const IcBank = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 10l9-6 9 6"/><path d="M5 10v8M9 10v8M15 10v8M19 10v8M3 20h18"/></svg>);
const IcWallet = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7a2 2 0 0 1 2-2h13a1 1 0 0 1 1 1v2"/><path d="M3 7v10a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1H4"/><circle cx="16.5" cy="12.5" r="1.3" fill="currentColor" stroke="none"/></svg>);
const IcCalendar = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/></svg>);
const IcDoc = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/></svg>);
const IcDown = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4v12M6 11l6 6 6-6M4 20h16"/></svg>);
const IcUp = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20V8M6 13l6-6 6 6M4 4h16"/></svg>);
const IcChevron = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>);
const IcExport = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12M8 11l4 4 4-4M4 21h16"/></svg>);
const IcArrowL = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>);
const IcArrowR = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>);

/* сегментный переключатель способа оплаты (как на макете) */
const PmToggle: React.FC<{ value: string; onChange: (v: string) => void }> = ({ value, onChange }) => {
  const opts = [
    { v: 'cash', label: 'Наличные', icon: <IcCash />, cls: 'green' },
    { v: 'noncash', label: 'Безнал / Карта', icon: <IcCard />, cls: 'blue' },
    { v: 'bank', label: 'Расчётный счёт', icon: <IcBank />, cls: 'violet' },
  ];
  return (
    <div className="bal2-pm">
      {opts.map(o => (
        <button type="button" key={o.v} className={'bal2-pm-opt' + (value === o.v ? ' active' : '')} onClick={() => onChange(o.v)}>
          <span className={`bal2-pm-ic bal2-pm-ic--${o.cls}`}>{o.icon}</span>{o.label}
        </button>
      ))}
    </div>
  );
};

/* ─── Component ─── */
const Balance: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const canAccess = ['director', 'manager', 'okk'].includes(user?.role || '');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<BalanceData | null>(null);

  const [offices, setOffices] = useState<OfficeOption[]>([]);
  const [selectedOfficeId, setSelectedOfficeId] = useState('');
  const [cycleOffset, setCycleOffset] = useState(0); // 0 = текущий период, -1 = прошлый
  const [exportOpen, setExportOpen] = useState(false);

  const [showIncome, setShowIncome] = useState(false);
  const [incomeForm, setIncomeForm] = useState({ amount: '', payment_method: 'cash', comment: '' });
  const [showExpense, setShowExpense] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ amount: '', payment_method: 'bank', title: '', comment: '' });
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferForm, setTransferForm] = useState({ source: 'bank', destination: 'cash', amount: '', transfer_date: localDateStr(), comment: '' });
  const [saving, setSaving] = useState(false);

  const [expanded, setExpanded] = useState<string | null>(null);
  const [dayDetail, setDayDetail] = useState<Record<string, DayDetail>>({});
  const [showAllInc, setShowAllInc] = useState<Record<string, boolean>>({});
  const [showAllExp, setShowAllExp] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!isAuthenticated) return;
    (async () => {
      try {
        const res = await fetch(buildApiUrl('/offices/my'), { headers: getAuthHeaders() });
        if (!res.ok) return;
        const body = await res.json();
        const list: OfficeOption[] = (Array.isArray(body) ? body : body.data || []).map((o: any) => ({
          id: String(o.id), name: o.name || o.title || 'Офис #' + o.id,
        }));
        setOffices(list);
        if (list.length > 0) {
          const saved = localStorage.getItem('activeOfficeId');
          setSelectedOfficeId(saved && list.some(o => o.id === saved) ? saved : list[0].id);
        }
      } catch (err) { console.error('offices error:', err); }
    })();
  }, [isAuthenticated]);

  const fetchBalance = useCallback(async () => {
    if (!selectedOfficeId) return;
    setLoading(true); setError(null);
    try {
      const p = new URLSearchParams();
      p.set('period', 'plan');
      p.set('cycle_offset', String(cycleOffset));
      const res = await fetch(buildApiUrl(`/office/${selectedOfficeId}/balance?` + p.toString()), { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Не удалось загрузить баланс');
      const body = await res.json();
      setData(body.data || null);
      setExpanded(null); setDayDetail({});
    } catch (err) { setError((err as Error).message); }
    finally { setLoading(false); }
  }, [selectedOfficeId, cycleOffset]);

  useEffect(() => { fetchBalance(); }, [fetchBalance]);

  const loadDay = useCallback(async (date: string) => {
    try {
      const res = await fetch(buildApiUrl(`/office/${selectedOfficeId}/balance/day?date=${date}`), { headers: getAuthHeaders() });
      if (res.ok) { const body = await res.json(); setDayDetail(prev => ({ ...prev, [date]: body.data })); }
    } catch { /* ignore */ }
  }, [selectedOfficeId]);

  const toggleDay = (date: string) => {
    if (expanded === date) { setExpanded(null); return; }
    setExpanded(date);
    if (!dayDetail[date]) loadDay(date);
  };

  const addIncome = async () => {
    if (!incomeForm.amount) return;
    setSaving(true);
    try {
      const res = await fetch(buildApiUrl(`/office/${selectedOfficeId}/income`), {
        method: 'POST', headers: getAuthHeaders(),
        body: JSON.stringify({
          amount: Number(incomeForm.amount), payment_method: incomeForm.payment_method,
          income_date: todayStr(), title: incomeForm.comment.trim() || 'Поступление',
        }),
      });
      if (!res.ok) throw new Error('Ошибка добавления поступления');
      setShowIncome(false);
      setIncomeForm({ amount: '', payment_method: 'cash', comment: '' });
      const d = todayStr();
      setDayDetail(prev => { const c = { ...prev }; delete c[d]; return c; });
      await fetchBalance();
    } catch (err) { setError((err as Error).message); }
    finally { setSaving(false); }
  };

  const addExpense = async () => {
    if (!expenseForm.amount || !expenseForm.title.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(buildApiUrl('/expenses'), {
        method: 'POST', headers: getAuthHeaders(),
        body: JSON.stringify({
          office_id: Number(selectedOfficeId), amount: Number(expenseForm.amount),
          payment_method: expenseForm.payment_method, spent_on: todayStr(),
          title: expenseForm.title.trim(), category: 'Прочее',
          description: expenseForm.comment.trim() || null,
        }),
      });
      if (!res.ok) throw new Error('Ошибка добавления расхода');
      setShowExpense(false);
      const d = todayStr();
      setExpenseForm({ amount: '', payment_method: 'bank', title: '', comment: '' });
      setDayDetail(prev => { const c = { ...prev }; delete c[d]; return c; });
      await fetchBalance();
    } catch (err) { setError((err as Error).message); }
    finally { setSaving(false); }
  };

  const addTransfer = async () => {
    if (!transferForm.amount || transferForm.source === transferForm.destination) return;
    setSaving(true);
    try {
      const res = await fetch(buildApiUrl(`/office/${selectedOfficeId}/transfers`), {
        method: 'POST', headers: getAuthHeaders(),
        body: JSON.stringify({
          source: transferForm.source, destination: transferForm.destination,
          amount: Number(transferForm.amount), transfer_date: transferForm.transfer_date,
          comment: transferForm.comment.trim() || null,
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.message || 'Ошибка перевода средств');
      setShowTransfer(false);
      setTransferForm({ source: 'bank', destination: 'cash', amount: '', transfer_date: localDateStr(), comment: '' });
      setDayDetail({});
      await fetchBalance();
    } catch (err) { setError((err as Error).message); }
    finally { setSaving(false); }
  };

  const delExpense = async (date: string, id: number) => {
    if (!window.confirm('Удалить расход?')) return;
    await fetch(buildApiUrl(`/expenses/${id}`), { method: 'DELETE', headers: getAuthHeaders() });
    await fetchBalance(); await loadDay(date);
  };

  /* ─── Export ─── */
  const buildRows = () => {
    if (!data) return [] as (string | number)[][];
    const head = ['Дата', 'Поступило', 'Потрачено', 'Итого за день'];
    const rows = data.days.map(d => {
      const inc = sumB(d.income), exp = sumB(d.expense);
      return [ruShort(d.date), inc, exp, inc - exp];
    });
    return [head, ...rows];
  };
  const exportExcel = () => {
    const rows = buildRows();
    const csv = rows.map(r => r.join(';')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `balance_${data?.date_from}_${data?.date_to}.xls`;
    a.click();
    setExportOpen(false);
  };
  const exportPdf = () => {
    const rows = buildRows();
    const w = window.open('', '_blank');
    if (!w) return;
    const body = rows.map((r, i) => i === 0
      ? `<tr>${r.map(c => `<th>${c}</th>`).join('')}</tr>`
      : `<tr>${r.map((c, j) => `<td${j === 0 ? '' : ' style="text-align:right"'}>${j === 0 ? c : fmt(Number(c))}</td>`).join('')}</tr>`
    ).join('');
    const rng = data ? `${ruShort(data.date_from)} — ${ruShort(data.date_to)}` : '';
    w.document.write(`<html><head><meta charset="utf-8"><title>Баланс ${rng}</title>
      <style>body{font-family:Inter,Arial,sans-serif;padding:32px;color:#0F1115}h2{color:#2417C0}
      table{width:100%;border-collapse:collapse;margin-top:16px;font-size:14px}
      th,td{border:1px solid #e5e7eb;padding:8px 12px;text-align:left}th{background:#f5f6ff}</style></head>
      <body><h2>Баланс денежных средств</h2><div>Период: ${rng}</div>
      <table>${body}</table></body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 300);
    setExportOpen(false);
  };

  const cur = data?.current || ZERO;
  const totals = data?.totals || { income: ZERO, expense: ZERO, transfer: ZERO };
  const deltaCash = totals.income.cash - totals.expense.cash + totals.transfer.cash;
  const deltaNoncash = totals.income.noncash - totals.expense.noncash + totals.transfer.noncash;
  const deltaBank = totals.income.bank - totals.expense.bank + totals.transfer.bank;
  const deltaTotal = deltaCash + deltaNoncash + deltaBank;

  if (!canAccess) {
    return <div className="bal2-noaccess">У вас нет доступа к разделу «Баланс».</div>;
  }

  const cards = [
    { key: 'cash', label: 'Наличные', icon: <IcCash />, value: cur.cash, delta: deltaCash, cls: 'green' },
    { key: 'noncash', label: 'Безналичные', icon: <IcCard />, value: cur.noncash, delta: deltaNoncash, cls: 'blue' },
    { key: 'bank', label: 'Расчётный счёт', icon: <IcBank />, value: cur.bank, delta: deltaBank, cls: 'violet' },
  ];

  const period = data?.period || null;
  const cycIdx = period?.cycle_index ?? null;
  const curIdx = period?.current_cycle_index ?? null;
  const isCurrent = period ? (cycIdx === curIdx) : (cycleOffset === 0);
  const canPrev = period ? ((cycIdx ?? 0) > 0) : true;
  const rangeLabel = data ? `${ruShort(data.date_from)} — ${ruShort(data.date_to)}` : '';

  return (
    <div className="bal2">
      {/* Header — лаконичный */}
      <div className="bal2-head">
        <h1 className="bal2-title">Баланс денежных средств</h1>
        {offices.length > 1 && (
          <select className="bal2-office" value={selectedOfficeId} onChange={e => setSelectedOfficeId(e.target.value)}>
            {offices.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        )}
      </div>

      {error && <div className="bal2-error">{error}</div>}

      {/* KPI cards */}
      <div className="bal2-cards">
        {cards.map(c => (
          <div className={`bal2-card bal2-card--${c.cls}`} key={c.key}>
            <div className="bal2-card-top">
              <div className={`bal2-card-ic bal2-card-ic--${c.cls}`}>{c.icon}</div>
              <div className="bal2-card-label">{c.label}</div>
            </div>
            <div className="bal2-card-value">{fmtMoney(c.value)}</div>
            <div className="bal2-card-delta">Изменение за период <b className={c.delta >= 0 ? 'pos' : 'neg'}>{fmtSigned(c.delta)}</b></div>
          </div>
        ))}
        <div className="bal2-card bal2-card--total">
          <div className="bal2-card-top">
            <div className="bal2-card-ic bal2-card-ic--total"><IcWallet /></div>
            <div className="bal2-card-label">Всего сейчас</div>
          </div>
          <div className="bal2-card-value bal2-card-value--total">{fmtMoney(data?.current_total || 0)}</div>
          <div className="bal2-card-delta">Изменение за период <b className={deltaTotal >= 0 ? 'pos' : 'neg'}>{fmtSigned(deltaTotal)}</b></div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="bal2-actions">
        <button className="bal2-act bal2-act--income" onClick={() => { setShowIncome(true); setShowExpense(false); }}>+ Поступление</button>
        <button className="bal2-act bal2-act--expense" onClick={() => { setShowExpense(true); setShowIncome(false); }}>+ Расход</button>
        <button className="bal2-act bal2-act--transfer" onClick={() => { setShowTransfer(true); setShowIncome(false); setShowExpense(false); }}>↔ Перевод средств</button>
      </div>

      {/* Навигация по периодам — как во вкладке Офис, опущена перед историей */}
      <div className="bal2-periodbar">
        <div className="bal2-periodnav">
          <button className="bal2-navbtn" disabled={!canPrev} onClick={() => canPrev && setCycleOffset(o => o - 1)} title="Предыдущий период">
            <IcArrowL /><span>Пред. период</span>
          </button>
          <div className="bal2-periodlabel">
            <IcCalendar />
            <span>{rangeLabel || '—'}</span>
            {!isCurrent && <em>прошлый период</em>}
          </div>
          <button className="bal2-navbtn" disabled={isCurrent} onClick={() => !isCurrent && setCycleOffset(o => Math.min(0, o + 1))} title="Следующий период">
            <span>След. период</span><IcArrowR />
          </button>
          <button className="bal2-navbtn bal2-navbtn--now" disabled={isCurrent} onClick={() => setCycleOffset(0)} title="К текущему периоду">Текущий</button>
        </div>
        <div className="bal2-periodbar-spacer" />
        <div className="bal2-export">
          <button className="bal2-export-btn" onClick={() => setExportOpen(o => !o)} disabled={!data}>
            <IcExport /><span>Экспорт</span>
          </button>
          {exportOpen && (
            <div className="bal2-drop bal2-drop--right" onMouseLeave={() => setExportOpen(false)}>
              <button className="bal2-drop-item" onClick={exportExcel}>Excel</button>
              <button className="bal2-drop-item" onClick={exportPdf}>PDF</button>
            </div>
          )}
        </div>
      </div>

      {/* Days — бэкенд уже отдаёт свежие сверху (сегодня первым) */}
      {loading ? <TableSkeleton /> : (
        <div className="bal2-days">
          {(!data || data.days.length === 0) && <div className="bal2-empty">Нет движений за период</div>}
          {data && data.days.map(d => {
            const inc = sumB(d.income), exp = sumB(d.expense);
            const transferTotal = Number(d.transfer_total || 0);
            const total = inc - exp;
            const isToday = d.date === todayStr();
            const open = expanded === d.date;
            const det = dayDetail[d.date];
            const incAll: IncomeItem[] = det ? [...det.income.contracts, ...det.income.manual] : [];
            const expAll: ExpenseItem[] = det ? det.expenses : [];
            const incShown = showAllInc[d.date] ? incAll : incAll.slice(0, 2);
            const expShown = showAllExp[d.date] ? expAll : expAll.slice(0, 2);
            return (
              <div className={'bal2-day' + (open ? ' open' : '')} key={d.date}>
                <button className="bal2-day-head" onClick={() => toggleDay(d.date)}>
                  <span className="bal2-day-date"><span className="bal2-day-cal"><IcCalendar /></span>{ruLongDate(d.date)}{isToday && <span className="bal2-badge">Сегодня</span>}</span>
                  <span className="bal2-day-metrics">
                    <span className="bal2-m"><i>Поступило</i><b className="pos">+ {fmt(inc)} ₽</b></span>
                    <span className="bal2-m"><i>Потрачено</i><b className="neg">{exp ? '− ' + fmt(exp) : '− 0'} ₽</b></span>
                    {transferTotal > 0 && <span className="bal2-m"><i>Переводы</i><b className="transfer">↔ {fmt(transferTotal)} ₽</b></span>}
                    <span className="bal2-m"><i>Итого за день</i><b className="tot">+ {fmt(total)} ₽</b></span>
                  </span>
                  <span className="bal2-day-chev"><IcChevron /></span>
                </button>
                {open && (
                  <div className="bal2-day-body">
                    <div className="bal2-col">
                      <div className="bal2-col-h"><span className="bal2-col-ic in"><IcDown /></span>Поступления</div>
                      {!det && <div className="bal2-loading">загрузка…</div>}
                      {det && incShown.map((it, i) => (
                        <div className="bal2-op" key={'i' + i}>
                          <span className="bal2-op-ic in"><IcDoc /></span>
                          <span className="bal2-op-main">
                            <span className="bal2-op-title" title={it.client_name || it.title}>
                              {it.client_name ? clientShortName(it.client_name) : it.title}
                            </span>
                            <span className="bal2-op-sub" title={[it.title, it.lawyer_name, it.description].filter(Boolean).join(' · ')}>
                              {[it.title, it.lawyer_name, it.description].filter(Boolean).join(' · ')}
                            </span>
                          </span>
                          <span className="bal2-op-amt">{fmt(it.amount)} ₽</span>
                          <span className="bal2-op-pm">{PM_LABEL[it.payment_method] || it.payment_method}</span>
                          <span className="bal2-op-time">{it.time || ''}</span>
                        </div>
                      ))}
                      {det && incAll.length === 0 && <div className="bal2-op-empty">нет поступлений</div>}
                      {det && incAll.length > 2 && !showAllInc[d.date] && (
                        <button className="bal2-more" onClick={() => setShowAllInc(s => ({ ...s, [d.date]: true }))}>Показать все поступления ({incAll.length})</button>
                      )}
                    </div>
                    <div className="bal2-col">
                      <div className="bal2-col-h"><span className="bal2-col-ic out"><IcUp /></span>Расходы</div>
                      {!det && <div className="bal2-loading">загрузка…</div>}
                      {det && expShown.map((it) => (
                        <div className="bal2-op" key={'e' + it.id}>
                          <span className="bal2-op-ic out"><IcBank /></span>
                          <span className="bal2-op-main">
                            <span className="bal2-op-title" title={it.title}>{it.title}</span>
                            <span className="bal2-op-sub">{it.description || it.category}</span>
                          </span>
                          <span className="bal2-op-amt">{fmt(it.amount)} ₽</span>
                          <span className="bal2-op-pm">{PM_LABEL[it.payment_method] || it.payment_method}</span>
                          <span className="bal2-op-time">{it.time || ''}</span>
                          {!it.is_auto && <button className="bal2-op-del" onClick={() => delExpense(d.date, it.id)}>✕</button>}
                        </div>
                      ))}
                      {det && expAll.length === 0 && <div className="bal2-op-empty">нет расходов</div>}
                      {det && expAll.length > 2 && !showAllExp[d.date] && (
                        <button className="bal2-more" onClick={() => setShowAllExp(s => ({ ...s, [d.date]: true }))}>Показать все расходы ({expAll.length})</button>
                      )}
                    </div>
                    <div className="bal2-col bal2-col--transfer">
                      <div className="bal2-col-h"><span className="bal2-col-ic transfer"><span>↔</span></span>Переводы средств</div>
                      {!det && <div className="bal2-loading">загрузка…</div>}
                      {det && det.transfers.map(it => (
                        <div className="bal2-op bal2-op--transfer" key={'t' + it.id}>
                          <span className="bal2-op-ic transfer">↔</span>
                          <span className="bal2-op-main">
                            <span className="bal2-op-title">Перевод средств</span>
                            <span className="bal2-op-sub">{PM_LABEL[it.source] || it.source} → {PM_LABEL[it.destination] || it.destination}{it.comment ? ` · ${it.comment}` : ''}</span>
                          </span>
                          <span className="bal2-op-amt">{fmt(it.amount)} ₽</span>
                          <span className="bal2-op-time">{it.time || ''}</span>
                        </div>
                      ))}
                      {det && det.transfers.length === 0 && <div className="bal2-op-empty">нет переводов</div>}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Income modal — как на макете */}
      {showIncome && (
        <div className="bal2-modal-bg" onClick={() => setShowIncome(false)}>
          <div className="bal2-modal" onClick={e => e.stopPropagation()}>
            <div className="bal2-modal-head"><h3 className="bal2-modal-title">Новое поступление</h3><button className="bal2-modal-x" onClick={() => setShowIncome(false)}>✕</button></div>
            <div className="bal2-fld-b"><span>Способ поступления</span>
              <PmToggle value={incomeForm.payment_method} onChange={v => setIncomeForm(f => ({ ...f, payment_method: v }))} /></div>
            <div className="bal2-fld-b"><span>Сумма</span>
              <input type="number" value={incomeForm.amount} onChange={e => setIncomeForm(f => ({ ...f, amount: e.target.value }))} placeholder="15 000 ₽" autoFocus /></div>
            <div className="bal2-fld-b"><span>Комментарий</span>
              <input value={incomeForm.comment} onChange={e => setIncomeForm(f => ({ ...f, comment: e.target.value }))} placeholder="Например: Поступление по договору" /></div>
            <div className="bal2-modal-actions">
              <button className="bal2-btn-cancel" onClick={() => setShowIncome(false)}>Отмена</button>
              <button className="bal2-btn-ok bal2-btn-ok--income" onClick={addIncome} disabled={saving || !incomeForm.amount}>Сохранить</button>
            </div>
          </div>
        </div>
      )}

      {/* Expense modal — как на макете */}
      {showExpense && (
        <div className="bal2-modal-bg" onClick={() => setShowExpense(false)}>
          <div className="bal2-modal" onClick={e => e.stopPropagation()}>
            <div className="bal2-modal-head"><h3 className="bal2-modal-title">Новый расход</h3><button className="bal2-modal-x" onClick={() => setShowExpense(false)}>✕</button></div>
            <div className="bal2-fld-b"><span>Наименование расхода</span>
              <input value={expenseForm.title} onChange={e => setExpenseForm(f => ({ ...f, title: e.target.value }))} placeholder="Например: Аренда офиса" autoFocus /></div>
            <div className="bal2-fld-b"><span>Источник списания</span>
              <PmToggle value={expenseForm.payment_method} onChange={v => setExpenseForm(f => ({ ...f, payment_method: v }))} /></div>
            <div className="bal2-fld-b"><span>Сумма</span>
              <input type="number" value={expenseForm.amount} onChange={e => setExpenseForm(f => ({ ...f, amount: e.target.value }))} placeholder="15 000 ₽" /></div>
            <div className="bal2-fld-b"><span>Комментарий</span>
              <input value={expenseForm.comment} onChange={e => setExpenseForm(f => ({ ...f, comment: e.target.value }))} placeholder="Например: Оплата аренды за июль" /></div>
            <div className="bal2-modal-actions">
              <button className="bal2-btn-cancel" onClick={() => setShowExpense(false)}>Отмена</button>
              <button className="bal2-btn-ok bal2-btn-ok--expense" onClick={addExpense} disabled={saving || !expenseForm.amount || !expenseForm.title.trim()}>Сохранить</button>
            </div>
          </div>
        </div>
      )}

      {showTransfer && (
        <div className="bal2-modal-bg" onClick={() => setShowTransfer(false)}>
          <div className="bal2-modal" onClick={e => e.stopPropagation()}>
            <div className="bal2-modal-head"><h3 className="bal2-modal-title">Перевод средств</h3><button className="bal2-modal-x" onClick={() => setShowTransfer(false)}>✕</button></div>
            <div className="bal2-fld-b"><span>Откуда</span>
              <select value={transferForm.source} onChange={e => setTransferForm(f => ({ ...f, source: e.target.value }))}>
                {TRANSFER_PM_OPTIONS.map(o => <option key={o.value} value={o.value} disabled={o.value === transferForm.destination}>{o.label}</option>)}
              </select>
            </div>
            <div className="bal2-fld-b"><span>Куда</span>
              <select value={transferForm.destination} onChange={e => setTransferForm(f => ({ ...f, destination: e.target.value }))}>
                {TRANSFER_PM_OPTIONS.map(o => <option key={o.value} value={o.value} disabled={o.value === transferForm.source}>{o.label}</option>)}
              </select>
            </div>
            <div className="bal2-fld-b"><span>Сумма</span>
              <input type="number" min="0.01" step="0.01" value={transferForm.amount} onChange={e => setTransferForm(f => ({ ...f, amount: e.target.value }))} placeholder="50 000 ₽" autoFocus />
            </div>
            <div className="bal2-fld-b"><span>Дата</span>
              <input type="date" value={transferForm.transfer_date} onChange={e => setTransferForm(f => ({ ...f, transfer_date: e.target.value }))} />
            </div>
            <div className="bal2-fld-b"><span>Комментарий <small>(необязательно)</small></span>
              <input value={transferForm.comment} onChange={e => setTransferForm(f => ({ ...f, comment: e.target.value }))} placeholder="Например: внесение выручки в кассу" />
            </div>
            <div className="bal2-modal-actions">
              <button className="bal2-btn-cancel" onClick={() => setShowTransfer(false)}>Отмена</button>
              <button className="bal2-btn-ok bal2-btn-ok--transfer" onClick={addTransfer} disabled={saving || !transferForm.amount || transferForm.source === transferForm.destination}>Сохранить перевод</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Balance;
