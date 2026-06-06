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
  closing: Bucket;
  tax: number;
}

interface BalanceData {
  office_id: number;
  has_opening: boolean;
  start_date: string | null;
  tax_rate: number;
  date_from: string;
  date_to: string;
  opening: Bucket;
  current: Bucket;
  current_total: number;
  totals: { income: Bucket; expense: Bucket; tax: number };
  days: DayRow[];
}

interface DayDetail {
  date: string;
  income: {
    contracts: { id: number; payment_method: string; amount: number; title: string; client_name: string | null; lawyer_name: string | null }[];
    manual: { id: number; payment_method: string; amount: number; title: string; description: string | null }[];
  };
  expenses: { id: number; category: string; payment_method: string; amount: number; title: string; description: string | null; is_auto: boolean; expense_type: string }[];
}

interface OfficeOption { id: string; name: string; }

const DEFAULT_CATEGORIES = [
  'Зарплаты', 'Возвраты', 'Лиды', 'Реклама', 'Аренда',
  'Коммунальные услуги', 'Налоги', 'Интернет', 'Телефония', 'Техника', 'Прочее'
];

const PM_OPTS: { value: string; label: string }[] = [
  { value: 'cash', label: 'Наличные' },
  { value: 'noncash', label: 'Безнал/карта' },
  { value: 'bank', label: 'Р/С' },
];
const PM_LABEL: Record<string, string> = { cash: 'Наличные', noncash: 'Безнал/карта', bank: 'Р/С' };

const fmt = (n: number) => (Number(n) || 0).toLocaleString('ru-RU');
const fmtMoney = (n: number) => fmt(n) + ' \u20BD';
const todayStr = () => new Date().toISOString().slice(0, 10);

const ruDate = (d: string) => {
  const [y, m, day] = d.split('-');
  return `${day}.${m}.${y}`;
};

const ZERO: Bucket = { cash: 0, noncash: 0, bank: 0 };

/* ─── Component ─── */
const Balance: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const canEditOpening = ['director', 'manager', 'okk'].includes(user?.role || '');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<BalanceData | null>(null);

  const [offices, setOffices] = useState<OfficeOption[]>([]);
  const [selectedOfficeId, setSelectedOfficeId] = useState('');
  const [periodType, setPeriodType] = useState('month');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // modals
  const [showOpening, setShowOpening] = useState(false);
  const [openingForm, setOpeningForm] = useState({ start_date: todayStr(), cash: '', noncash: '', bank: '' });
  const [showIncome, setShowIncome] = useState(false);
  const [incomeForm, setIncomeForm] = useState({ amount: '', payment_method: 'cash', income_date: todayStr(), title: '' });
  const [showExpense, setShowExpense] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ amount: '', payment_method: 'cash', spent_on: todayStr(), title: '', category: 'Прочее' });
  const [saving, setSaving] = useState(false);

  // day drill-down
  const [expanded, setExpanded] = useState<string | null>(null);
  const [dayDetail, setDayDetail] = useState<Record<string, DayDetail>>({});

  /* ─── Period helper ─── */
  const computePeriod = useCallback((type: string) => {
    const now = new Date();
    let from = '';
    const to = now.toISOString().slice(0, 10);
    switch (type) {
      case 'week': { const d = new Date(now); d.setDate(d.getDate() - 7); from = d.toISOString().slice(0, 10); break; }
      case 'month': { from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10); break; }
      case 'quarter': { const qM = Math.floor(now.getMonth() / 3) * 3; from = new Date(now.getFullYear(), qM, 1).toISOString().slice(0, 10); break; }
      case 'year': { from = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10); break; }
      case 'custom': return;
    }
    setDateFrom(from);
    setDateTo(to);
  }, []);

  /* ─── Load offices ─── */
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

  useEffect(() => { computePeriod(periodType); }, [periodType, computePeriod]);

  /* ─── Fetch balance ─── */
  const fetchBalance = useCallback(async () => {
    if (!selectedOfficeId || !dateFrom) return;
    setLoading(true); setError(null);
    try {
      const p = new URLSearchParams();
      p.set('date_from', dateFrom);
      if (dateTo) p.set('date_to', dateTo);
      const res = await fetch(buildApiUrl(`/office/${selectedOfficeId}/balance?` + p.toString()), { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Не удалось загрузить баланс');
      const body = await res.json();
      setData(body.data || null);
      setExpanded(null); setDayDetail({});
    } catch (err) { setError((err as Error).message); }
    finally { setLoading(false); }
  }, [selectedOfficeId, dateFrom, dateTo]);

  useEffect(() => { fetchBalance(); }, [fetchBalance]);

  /* ─── Day drill-down ─── */
  const toggleDay = async (date: string) => {
    if (expanded === date) { setExpanded(null); return; }
    setExpanded(date);
    if (!dayDetail[date]) {
      try {
        const res = await fetch(buildApiUrl(`/office/${selectedOfficeId}/balance/day?date=${date}`), { headers: getAuthHeaders() });
        if (res.ok) { const body = await res.json(); setDayDetail(prev => ({ ...prev, [date]: body.data })); }
      } catch { /* ignore */ }
    }
  };

  /* ─── CRUD ─── */
  const saveOpening = async () => {
    setSaving(true);
    try {
      const res = await fetch(buildApiUrl(`/office/${selectedOfficeId}/balance/opening`), {
        method: 'PUT', headers: getAuthHeaders(),
        body: JSON.stringify({
          start_date: openingForm.start_date,
          cash: Number(openingForm.cash) || 0,
          noncash: Number(openingForm.noncash) || 0,
          bank: Number(openingForm.bank) || 0,
        }),
      });
      if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b.message || 'Ошибка сохранения'); }
      setShowOpening(false);
      await fetchBalance();
    } catch (err) { setError((err as Error).message); }
    finally { setSaving(false); }
  };

  const addIncome = async () => {
    if (!incomeForm.amount) return;
    setSaving(true);
    try {
      const res = await fetch(buildApiUrl(`/office/${selectedOfficeId}/income`), {
        method: 'POST', headers: getAuthHeaders(),
        body: JSON.stringify({
          amount: Number(incomeForm.amount), payment_method: incomeForm.payment_method,
          income_date: incomeForm.income_date, title: incomeForm.title || 'Поступление',
        }),
      });
      if (!res.ok) throw new Error('Ошибка добавления поступления');
      setShowIncome(false);
      setIncomeForm({ amount: '', payment_method: 'cash', income_date: todayStr(), title: '' });
      setDayDetail(prev => { const c = { ...prev }; delete c[incomeForm.income_date]; return c; });
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
          payment_method: expenseForm.payment_method, spent_on: expenseForm.spent_on,
          title: expenseForm.title, category: expenseForm.category,
        }),
      });
      if (!res.ok) throw new Error('Ошибка добавления расхода');
      setShowExpense(false);
      setExpenseForm({ amount: '', payment_method: 'cash', spent_on: todayStr(), title: '', category: 'Прочее' });
      setDayDetail(prev => { const c = { ...prev }; delete c[expenseForm.spent_on]; return c; });
      await fetchBalance();
    } catch (err) { setError((err as Error).message); }
    finally { setSaving(false); }
  };

  const delIncome = async (date: string, id: number) => {
    if (!window.confirm('Удалить поступление?')) return;
    await fetch(buildApiUrl(`/office/${selectedOfficeId}/income/${id}`), { method: 'DELETE', headers: getAuthHeaders() });
    setDayDetail(prev => { const c = { ...prev }; delete c[date]; return c; });
    await fetchBalance(); toggleDay(date); toggleDay(date);
  };
  const delExpense = async (date: string, id: number) => {
    if (!window.confirm('Удалить расход?')) return;
    await fetch(buildApiUrl(`/expenses/${id}`), { method: 'DELETE', headers: getAuthHeaders() });
    setDayDetail(prev => { const c = { ...prev }; delete c[date]; return c; });
    await fetchBalance();
  };

  /* ─── Export CSV ─── */
  const exportCsv = () => {
    if (!data) return;
    const head = ['Дата',
      'Начало Наличные', 'Начало Безнал', 'Начало Р/С',
      'Поступления Наличные', 'Поступления Безнал', 'Поступления Р/С',
      'Расходы Наличные', 'Расходы Безнал', 'Расходы Р/С',
      'Конец Наличные', 'Конец Безнал', 'Конец Р/С',
      'Налог 11%'];
    const rows = [...data.days].reverse().map(d => [
      ruDate(d.date),
      d.opening.cash, d.opening.noncash, d.opening.bank,
      d.income.cash, d.income.noncash, d.income.bank,
      d.expense.cash, d.expense.noncash, d.expense.bank,
      d.closing.cash, d.closing.noncash, d.closing.bank,
      d.tax,
    ]);
    const csv = [head, ...rows].map(r => r.join(';')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `balance_${dateFrom}_${dateTo}.csv`;
    a.click();
  };

  const cur = data?.current || ZERO;
  const totals = data?.totals || { income: ZERO, expense: ZERO, tax: 0 };

  const TriCell: React.FC<{ b: Bucket; neg?: boolean }> = ({ b, neg }) => (
    <div className="bal-tri">
      <span className={neg && b.cash < 0 ? 'bal-neg' : ''}><i>Нал</i>{fmt(b.cash)}</span>
      <span className={neg && b.noncash < 0 ? 'bal-neg' : ''}><i>Безн</i>{fmt(b.noncash)}</span>
      <span className={neg && b.bank < 0 ? 'bal-neg' : ''}><i>Р/С</i>{fmt(b.bank)}</span>
    </div>
  );

  return (
    <div className="bal-wrap">
      {/* Header */}
      <div className="bal-header">
        <h2 className="bal-title">Баланс денежных средств</h2>
        <div className="bal-controls">
          {offices.length > 1 && (
            <select className="bal-sel" value={selectedOfficeId} onChange={e => setSelectedOfficeId(e.target.value)}>
              {offices.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          )}
          <select className="bal-sel" value={periodType} onChange={e => setPeriodType(e.target.value)}>
            <option value="week">Неделя</option>
            <option value="month">Месяц</option>
            <option value="quarter">Квартал</option>
            <option value="year">Год</option>
            <option value="custom">Свой период</option>
          </select>
          {periodType === 'custom' && (
            <div className="bal-dates">
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
              <span>—</span>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
          )}
          <button className="bal-btn-ghost" onClick={exportCsv} disabled={!data}>Экспорт</button>
        </div>
      </div>

      {/* «Сейчас в кассе» tiles */}
      <div className="bal-kpi-row">
        <div className="bal-kpi bal-kpi--cash">
          <div className="bal-kpi__label">Наличные</div>
          <div className="bal-kpi__value">{fmtMoney(cur.cash)}</div>
        </div>
        <div className="bal-kpi bal-kpi--noncash">
          <div className="bal-kpi__label">Безнал / карта</div>
          <div className="bal-kpi__value">{fmtMoney(cur.noncash)}</div>
        </div>
        <div className="bal-kpi bal-kpi--bank">
          <div className="bal-kpi__label">Расчётный счёт (Р/С)</div>
          <div className="bal-kpi__value">{fmtMoney(cur.bank)}</div>
        </div>
        <div className="bal-kpi bal-kpi--total">
          <div className="bal-kpi__label">Всего сейчас</div>
          <div className="bal-kpi__value">{fmtMoney(data?.current_total || 0)}</div>
        </div>
      </div>

      {error && <div className="bal-error">{error}</div>}

      {/* No opening banner */}
      {data && !data.has_opening && (
        <div className="bal-banner">
          Стартовый остаток не задан — баланс считается от нуля.
          {canEditOpening && <button className="bal-btn-link" onClick={() => setShowOpening(true)}>Задать стартовый остаток</button>}
        </div>
      )}

      {/* Toolbar */}
      <div className="bal-toolbar">
        <div className="bal-tax-note">Налог {Math.round((data?.tax_rate || 0.11) * 100)}% считается от поступлений по Р/С</div>
        <div className="bal-toolbar-btns">
          {canEditOpening && <button className="bal-btn-ghost" onClick={() => setShowOpening(true)}>Стартовый остаток</button>}
          <button className="bal-btn-add bal-btn-add--income" onClick={() => setShowIncome(s => !s)}>+ Поступление</button>
          <button className="bal-btn-add" onClick={() => setShowExpense(s => !s)}>+ Расход</button>
        </div>
      </div>

      {/* Add income card */}
      {showIncome && (
        <div className="bal-add-card">
          <h3 className="bal-add-card__title">Ручное поступление</h3>
          <div className="bal-add-grid">
            <label className="bal-field"><span>Сумма</span>
              <input type="number" value={incomeForm.amount} onChange={e => setIncomeForm(f => ({ ...f, amount: e.target.value }))} /></label>
            <label className="bal-field"><span>Кошелёк</span>
              <select value={incomeForm.payment_method} onChange={e => setIncomeForm(f => ({ ...f, payment_method: e.target.value }))}>
                {PM_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>
            <label className="bal-field"><span>Дата</span>
              <input type="date" value={incomeForm.income_date} onChange={e => setIncomeForm(f => ({ ...f, income_date: e.target.value }))} /></label>
            <label className="bal-field bal-field--wide"><span>Назначение</span>
              <input value={incomeForm.title} onChange={e => setIncomeForm(f => ({ ...f, title: e.target.value }))} placeholder="Например: взнос учредителя" /></label>
            <div className="bal-add-card__actions">
              <button className="bal-btn-cancel" onClick={() => setShowIncome(false)}>Отмена</button>
              <button className="bal-btn-submit" onClick={addIncome} disabled={saving || !incomeForm.amount}>Добавить</button>
            </div>
          </div>
        </div>
      )}

      {/* Add expense card */}
      {showExpense && (
        <div className="bal-add-card">
          <h3 className="bal-add-card__title">Новый расход</h3>
          <div className="bal-add-grid">
            <label className="bal-field"><span>Сумма</span>
              <input type="number" value={expenseForm.amount} onChange={e => setExpenseForm(f => ({ ...f, amount: e.target.value }))} /></label>
            <label className="bal-field"><span>Кошелёк</span>
              <select value={expenseForm.payment_method} onChange={e => setExpenseForm(f => ({ ...f, payment_method: e.target.value }))}>
                {PM_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>
            <label className="bal-field"><span>Категория</span>
              <select value={expenseForm.category} onChange={e => setExpenseForm(f => ({ ...f, category: e.target.value }))}>
                {DEFAULT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></label>
            <label className="bal-field"><span>Дата</span>
              <input type="date" value={expenseForm.spent_on} onChange={e => setExpenseForm(f => ({ ...f, spent_on: e.target.value }))} /></label>
            <label className="bal-field bal-field--wide"><span>Назначение</span>
              <input value={expenseForm.title} onChange={e => setExpenseForm(f => ({ ...f, title: e.target.value }))} placeholder="Например: аренда офиса" /></label>
            <div className="bal-add-card__actions">
              <button className="bal-btn-cancel" onClick={() => setShowExpense(false)}>Отмена</button>
              <button className="bal-btn-submit" onClick={addExpense} disabled={saving || !expenseForm.amount || !expenseForm.title.trim()}>Добавить</button>
            </div>
          </div>
        </div>
      )}

      {/* Daily table */}
      {loading ? <TableSkeleton /> : (
        <div className="bal-tbl-wrap">
          <table className="bal-tbl">
            <thead>
              <tr className="bal-grp-row">
                <th rowSpan={2}>Дата</th>
                <th colSpan={3}>Остаток на начало</th>
                <th colSpan={3}>Поступления</th>
                <th colSpan={3}>Расходы</th>
                <th colSpan={3}>Остаток на конец</th>
                <th rowSpan={2}>Налог 11%</th>
              </tr>
              <tr className="bal-sub-row">
                <th>Нал</th><th>Безн</th><th>Р/С</th>
                <th>Нал</th><th>Безн</th><th>Р/С</th>
                <th>Нал</th><th>Безн</th><th>Р/С</th>
                <th>Нал</th><th>Безн</th><th>Р/С</th>
              </tr>
            </thead>
            <tbody>
              {(!data || data.days.length === 0) && (
                <tr><td colSpan={14} className="bal-empty">Нет движений за период</td></tr>
              )}
              {data?.days.map(d => (
                <React.Fragment key={d.date}>
                  <tr className={'bal-row' + (expanded === d.date ? ' bal-row--open' : '')} onClick={() => toggleDay(d.date)}>
                    <td className="bal-date">{ruDate(d.date)}<span className="bal-chev">{expanded === d.date ? '▾' : '▸'}</span></td>
                    <td>{fmt(d.opening.cash)}</td><td>{fmt(d.opening.noncash)}</td><td>{fmt(d.opening.bank)}</td>
                    <td className="bal-in">{d.income.cash ? fmt(d.income.cash) : '—'}</td><td className="bal-in">{d.income.noncash ? fmt(d.income.noncash) : '—'}</td><td className="bal-in">{d.income.bank ? fmt(d.income.bank) : '—'}</td>
                    <td className="bal-out">{d.expense.cash ? fmt(d.expense.cash) : '—'}</td><td className="bal-out">{d.expense.noncash ? fmt(d.expense.noncash) : '—'}</td><td className="bal-out">{d.expense.bank ? fmt(d.expense.bank) : '—'}</td>
                    <td className={d.closing.cash < 0 ? 'bal-neg' : ''}>{fmt(d.closing.cash)}</td>
                    <td className={d.closing.noncash < 0 ? 'bal-neg' : ''}>{fmt(d.closing.noncash)}</td>
                    <td className={d.closing.bank < 0 ? 'bal-neg' : ''}>{fmt(d.closing.bank)}</td>
                    <td className="bal-tax">{d.tax ? fmt(d.tax) : '—'}</td>
                  </tr>
                  {expanded === d.date && (
                    <tr className="bal-detail-row">
                      <td colSpan={14}>
                        <div className="bal-detail">
                          <div className="bal-detail-col">
                            <div className="bal-detail-h bal-detail-h--in">Поступления</div>
                            {dayDetail[d.date] ? (
                              <>
                                {dayDetail[d.date].income.contracts.map(it => (
                                  <div className="bal-item" key={'c' + it.id}>
                                    <span className="bal-item-title">{it.title}{it.client_name ? ` · ${it.client_name}` : ''}</span>
                                    <span className="bal-item-pm">{PM_LABEL[it.payment_method]}</span>
                                    <span className="bal-item-amt bal-in">{fmtMoney(it.amount)}</span>
                                  </div>
                                ))}
                                {dayDetail[d.date].income.manual.map(it => (
                                  <div className="bal-item" key={'m' + it.id}>
                                    <span className="bal-item-title">{it.title}<em> (ручное)</em></span>
                                    <span className="bal-item-pm">{PM_LABEL[it.payment_method]}</span>
                                    <span className="bal-item-amt bal-in">{fmtMoney(it.amount)}</span>
                                    <button className="bal-item-del" onClick={(e) => { e.stopPropagation(); delIncome(d.date, it.id); }}>✕</button>
                                  </div>
                                ))}
                                {dayDetail[d.date].income.contracts.length === 0 && dayDetail[d.date].income.manual.length === 0 && <div className="bal-item bal-item--empty">нет</div>}
                              </>
                            ) : <div className="bal-item bal-item--empty">загрузка…</div>}
                          </div>
                          <div className="bal-detail-col">
                            <div className="bal-detail-h bal-detail-h--out">Расходы</div>
                            {dayDetail[d.date] ? (
                              <>
                                {dayDetail[d.date].expenses.map(it => (
                                  <div className="bal-item" key={'e' + it.id}>
                                    <span className="bal-item-title">{it.title}<em> · {it.category}{it.is_auto ? ' · авто' : ''}</em></span>
                                    <span className="bal-item-pm">{PM_LABEL[it.payment_method]}</span>
                                    <span className="bal-item-amt bal-out">{fmtMoney(it.amount)}</span>
                                    {!it.is_auto && <button className="bal-item-del" onClick={(e) => { e.stopPropagation(); delExpense(d.date, it.id); }}>✕</button>}
                                  </div>
                                ))}
                                {dayDetail[d.date].expenses.length === 0 && <div className="bal-item bal-item--empty">нет</div>}
                              </>
                            ) : <div className="bal-item bal-item--empty">загрузка…</div>}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
            {data && data.days.length > 0 && (
              <tfoot>
                <tr className="bal-foot">
                  <td>Итого за период</td>
                  <td></td><td></td><td></td>
                  <td className="bal-in">{fmt(totals.income.cash)}</td><td className="bal-in">{fmt(totals.income.noncash)}</td><td className="bal-in">{fmt(totals.income.bank)}</td>
                  <td className="bal-out">{fmt(totals.expense.cash)}</td><td className="bal-out">{fmt(totals.expense.noncash)}</td><td className="bal-out">{fmt(totals.expense.bank)}</td>
                  <td></td><td></td><td></td>
                  <td className="bal-tax">{fmt(totals.tax)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      {/* Opening modal */}
      {showOpening && (
        <div className="bal-modal-backdrop" onClick={() => setShowOpening(false)}>
          <div className="bal-modal" onClick={e => e.stopPropagation()}>
            <h3>Стартовый остаток</h3>
            <p className="bal-modal-sub">Задаётся один раз — с этой даты «Баланс» считается автоматически.</p>
            <label className="bal-field"><span>Дата начала</span>
              <input type="date" value={openingForm.start_date} onChange={e => setOpeningForm(f => ({ ...f, start_date: e.target.value }))} /></label>
            <label className="bal-field"><span>Наличные</span>
              <input type="number" value={openingForm.cash} onChange={e => setOpeningForm(f => ({ ...f, cash: e.target.value }))} /></label>
            <label className="bal-field"><span>Безнал / карта</span>
              <input type="number" value={openingForm.noncash} onChange={e => setOpeningForm(f => ({ ...f, noncash: e.target.value }))} /></label>
            <label className="bal-field"><span>Расчётный счёт (Р/С)</span>
              <input type="number" value={openingForm.bank} onChange={e => setOpeningForm(f => ({ ...f, bank: e.target.value }))} /></label>
            <div className="bal-add-card__actions">
              <button className="bal-btn-cancel" onClick={() => setShowOpening(false)}>Отмена</button>
              <button className="bal-btn-submit" onClick={saveOpening} disabled={saving}>Сохранить</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Balance;
