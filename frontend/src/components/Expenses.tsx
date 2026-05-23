import React, { useState, useEffect, useCallback } from "react";
import { buildApiUrl, getAuthHeaders } from '../shared/utils/apiUtils';
import { useAuth } from '../shared/lib/hooks/useAuth';
import { TableSkeleton } from './ui';
import "./Expenses.css";

/* ─── Types ─── */
interface ExpenseItem {
  id: number;
  category: string;
  title: string;
  amount: number;
  expense_type: string;
  is_auto: boolean;
  source_type: string | null;
  description: string;
  spent_on: string;
  created_at: string;
}

interface KPI {
  total: number;
  salaries: number;
  refunds: number;
  other: number;
}

interface ExpenseSummary {
  expenses: ExpenseItem[];
  kpi: KPI;
  office_cash: number;
  office_profit: number;
  categories: string[];
  filter: string;
}

interface OfficeOption {
  id: string;
  name: string;
}

const EXPENSE_TYPES = ['Разовый', 'Постоянный'];

const DEFAULT_CATEGORIES = [
  'Зарплаты', 'Возвраты', 'Лиды', 'Реклама', 'Аренда',
  'Коммунальные услуги', 'Налоги', 'Интернет', 'Телефония', 'Техника', 'Прочее'
];

const fmtMoney = (n: number) => n.toLocaleString('ru-RU') + ' \u20BD';

/* ─── Component ─── */
const Expenses: React.FC = () => {
  const { isAuthenticated, user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<ExpenseSummary | null>(null);

  const [offices, setOffices] = useState<OfficeOption[]>([]);
  const [selectedOfficeId, setSelectedOfficeId] = useState('');
  const [periodType, setPeriodType] = useState('month');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newExp, setNewExp] = useState({
    category: 'Прочее',
    title: '',
    amount: '',
    spent_on: new Date().toISOString().slice(0, 10),
    description: '',
    expense_type: 'Разовый',
  });

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState({
    category: '', title: '', amount: '', spent_on: '', description: '', expense_type: '',
  });

  /* ─── Period helper ─── */
  const computePeriod = useCallback((type: string) => {
    const now = new Date();
    let from = '';
    const to = now.toISOString().slice(0, 10);
    switch (type) {
      case 'week': { const d = new Date(now); d.setDate(d.getDate() - 7); from = d.toISOString().slice(0, 10); break; }
      case '2weeks': { const d = new Date(now); d.setDate(d.getDate() - 14); from = d.toISOString().slice(0, 10); break; }
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
        const data = await res.json();
        const list: OfficeOption[] = (Array.isArray(data) ? data : data.data || []).map((o: any) => ({
          id: String(o.id),
          name: o.name || o.title || 'Офис #' + o.id,
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

  /* ─── Fetch expenses ─── */
  const fetchExpenses = useCallback(async () => {
    if (!selectedOfficeId || !dateFrom) return;
    setLoading(true);
    setError(null);
    try {
      const p = new URLSearchParams();
      if (dateFrom) p.set('date_from', dateFrom);
      if (dateTo) p.set('date_to', dateTo);
      if (activeFilter !== 'all') p.set('filter', activeFilter);
      const res = await fetch(
        buildApiUrl('/office/' + selectedOfficeId + '/expenses-summary?' + p.toString()),
        { headers: getAuthHeaders() }
      );
      if (!res.ok) throw new Error('Не удалось загрузить данные');
      const body = await res.json();
      setSummary(body.data || null);
    } catch (err) {
      setError((err as Error).message);
    } finally { setLoading(false); }
  }, [selectedOfficeId, dateFrom, dateTo, activeFilter]);

  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

  /* ─── CRUD ─── */
  const handleAdd = async () => {
    if (!newExp.title.trim() || !newExp.amount) return;
    setSaving(true);
    try {
      const res = await fetch(buildApiUrl('/expenses'), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          office_id: Number(selectedOfficeId),
          category: newExp.category,
          title: newExp.title,
          amount: Number(newExp.amount),
          description: newExp.description,
          spent_on: newExp.spent_on,
          expense_type: newExp.expense_type,
        }),
      });
      if (!res.ok) throw new Error('Ошибка добавления');
      setNewExp({ category: 'Прочее', title: '', amount: '', spent_on: new Date().toISOString().slice(0, 10), description: '', expense_type: 'Разовый' });
      setShowAdd(false);
      await fetchExpenses();
    } catch (err) { setError((err as Error).message); } finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Удалить расход?')) return;
    try {
      await fetch(buildApiUrl('/expenses/' + id), { method: 'DELETE', headers: getAuthHeaders() });
      await fetchExpenses();
    } catch (err) { setError((err as Error).message); }
  };

  const startEdit = (item: ExpenseItem) => {
    setEditingId(item.id);
    setEditData({
      category: item.category || 'Прочее',
      title: item.title,
      amount: String(item.amount),
      spent_on: item.spent_on ? new Date(item.spent_on).toISOString().slice(0, 10) : '',
      description: item.description || '',
      expense_type: item.expense_type || 'Разовый',
    });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    try {
      await fetch(buildApiUrl('/expenses/' + editingId), {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          category: editData.category,
          title: editData.title,
          amount: Number(editData.amount),
          description: editData.description,
          spent_on: editData.spent_on,
          expense_type: editData.expense_type,
        }),
      });
      setEditingId(null);
      await fetchExpenses();
    } catch (err) { setError((err as Error).message); }
  };

  const getPeriodLabel = (): string => {
    if (!dateFrom || !dateTo) return '';
    const f = new Date(dateFrom).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
    const t = new Date(dateTo).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
    return f + ' \u2014 ' + t;
  };

  if (!isAuthenticated || !user) return <div className="expenses-wrap"><p>Требуется авторизация</p></div>;

  const categories = summary?.categories || DEFAULT_CATEGORIES;
  const kpi = summary?.kpi || { total: 0, salaries: 0, refunds: 0, other: 0 };

  return (
    <div className="expenses-wrap">
      {/* ── Header ── */}
      <div className="exp-header">
        <h2 className="exp-title">Расходы</h2>
        <div className="exp-controls">
          {offices.length > 1 && (
            <select className="exp-sel" value={selectedOfficeId} onChange={e => setSelectedOfficeId(e.target.value)}>
              {offices.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          )}
          <select className="exp-sel" value={periodType} onChange={e => setPeriodType(e.target.value)}>
            <option value="week">Неделя</option>
            <option value="2weeks">2 недели</option>
            <option value="month">Месяц</option>
            <option value="quarter">Квартал</option>
            <option value="year">Год</option>
            <option value="custom">Свой период</option>
          </select>
          {periodType === 'custom' && (
            <div className="exp-dates">
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
              <span>\u2014</span>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
          )}
        </div>
      </div>

      {/* Period label */}
      {dateFrom && dateTo && <div className="exp-period-label">{getPeriodLabel()}</div>}

      {/* ── KPI Cards ── */}
      <div className="exp-kpi-row">
        <div className="exp-kpi exp-kpi--total">
          <div className="exp-kpi__label">Общие расходы</div>
          <div className="exp-kpi__value">{fmtMoney(kpi.total)}</div>
        </div>
        <div className="exp-kpi exp-kpi--salary">
          <div className="exp-kpi__label">Зарплаты</div>
          <div className="exp-kpi__value">{fmtMoney(kpi.salaries)}</div>
        </div>
        <div className="exp-kpi exp-kpi--refund">
          <div className="exp-kpi__label">Возвраты</div>
          <div className="exp-kpi__value">{fmtMoney(kpi.refunds)}</div>
        </div>
        <div className="exp-kpi exp-kpi--other">
          <div className="exp-kpi__label">Прочие расходы</div>
          <div className="exp-kpi__value">{fmtMoney(kpi.other)}</div>
        </div>
      </div>

      {error && <div className="exp-error">{error}</div>}

      {/* ── Toolbar: filter + add ── */}
      <div className="exp-toolbar">
        <div className="exp-filter-group">
          {(['all', 'auto', 'manual'] as const).map(f => (
            <button
              key={f}
              className={'exp-filter-btn' + (activeFilter === f ? ' exp-filter-btn--active' : '')}
              onClick={() => setActiveFilter(f)}
            >
              {f === 'all' ? 'Все' : f === 'auto' ? 'Автоматические' : 'Ручные'}
            </button>
          ))}
        </div>
        <button className="exp-btn-add" onClick={() => setShowAdd(!showAdd)}>
          {showAdd ? 'Отмена' : '+ Добавить расход'}
        </button>
      </div>

      {/* ── Add Form (popup-like card) ── */}
      {showAdd && (
        <div className="exp-add-card">
          <h3 className="exp-add-card__title">Новый расход</h3>
          <div className="exp-add-grid">
            <div className="exp-field">
              <label>Категория</label>
              <select value={newExp.category} onChange={e => setNewExp({...newExp, category: e.target.value})}>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="exp-field">
              <label>Название расхода</label>
              <input
                type="text"
                placeholder="Например: Аренда офиса"
                value={newExp.title}
                onChange={e => setNewExp({...newExp, title: e.target.value})}
              />
            </div>
            <div className="exp-field">
              <label>Сумма</label>
              <input
                type="number"
                placeholder="0"
                value={newExp.amount}
                onChange={e => setNewExp({...newExp, amount: e.target.value})}
              />
            </div>
            <div className="exp-field">
              <label>Дата</label>
              <input
                type="date"
                value={newExp.spent_on}
                onChange={e => setNewExp({...newExp, spent_on: e.target.value})}
              />
            </div>
            <div className="exp-field">
              <label>Тип</label>
              <select value={newExp.expense_type} onChange={e => setNewExp({...newExp, expense_type: e.target.value})}>
                {EXPENSE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="exp-field exp-field--wide">
              <label>Комментарий</label>
              <input
                type="text"
                placeholder="Необязательно"
                value={newExp.description}
                onChange={e => setNewExp({...newExp, description: e.target.value})}
              />
            </div>
          </div>
          <div className="exp-add-card__actions">
            <button
              className="exp-btn-submit"
              onClick={handleAdd}
              disabled={saving || !newExp.title.trim() || !newExp.amount}
            >
              {saving ? 'Сохранение...' : 'Добавить'}
            </button>
            <button className="exp-btn-cancel" onClick={() => setShowAdd(false)}>Отмена</button>
          </div>
        </div>
      )}

      {/* ── Table ── */}
      {loading ? (
        <TableSkeleton rows={6} cols={5} withToolbar={false} />
      ) : summary && summary.expenses.length > 0 ? (
        <div className="exp-tbl-wrap">
          <table className="exp-tbl">
            <thead>
              <tr>
                <th>Категория</th>
                <th>Название</th>
                <th>Сумма</th>
                <th>Тип</th>
                <th>Дата</th>
                <th style={{ width: 130 }}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {summary.expenses.map(item => (
                <tr key={item.id} className="exp-tbl-row">
                  {editingId === item.id ? (
                    <>
                      <td>
                        <select className="exp-edit-sel" value={editData.category} onChange={e => setEditData({...editData, category: e.target.value})}>
                          {categories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </td>
                      <td><input className="exp-edit-inp" value={editData.title} onChange={e => setEditData({...editData, title: e.target.value})} /></td>
                      <td><input className="exp-edit-inp" type="number" style={{ width: 90 }} value={editData.amount} onChange={e => setEditData({...editData, amount: e.target.value})} /></td>
                      <td>
                        <select className="exp-edit-sel" value={editData.expense_type} onChange={e => setEditData({...editData, expense_type: e.target.value})}>
                          {EXPENSE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </td>
                      <td><input className="exp-edit-inp" type="date" value={editData.spent_on} onChange={e => setEditData({...editData, spent_on: e.target.value})} /></td>
                      <td className="exp-act-cell">
                        <button className="exp-btn--save" onClick={saveEdit}>OK</button>
                        <button className="exp-btn--cancel" onClick={() => setEditingId(null)}>X</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td>
                        <span className={'exp-cat-badge exp-cat--' + item.category.replace(/\s/g, '_').toLowerCase()}>
                          {item.category}
                        </span>
                        {item.is_auto && <span className="exp-auto-tag">авто</span>}
                      </td>
                      <td className="exp-title-cell">
                        {item.title}
                        {item.description && <span className="exp-desc-sub">{item.description}</span>}
                      </td>
                      <td className="exp-amt-cell">{fmtMoney(Number(item.amount))}</td>
                      <td><span className={'exp-type-tag exp-type--' + (item.expense_type === 'Постоянный' ? 'perm' : 'once')}>{item.expense_type || 'Разовый'}</span></td>
                      <td className="exp-date-cell">{item.spent_on ? new Date(item.spent_on).toLocaleDateString('ru-RU') : '\u2014'}</td>
                      <td className="exp-act-cell">
                        <button className="exp-btn--edit" onClick={() => startEdit(item)} title="Редактировать">&#9998;</button>
                        <button className="exp-btn--del" onClick={() => handleDelete(item.id)} title="Удалить">&#128465;</button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="exp-empty">
          {summary ? 'Нет расходов за выбранный период' : 'Загрузка...'}
        </div>
      )}
    </div>
  );
};

export default Expenses;
