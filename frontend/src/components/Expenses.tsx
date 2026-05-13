import React, { useState, useEffect, useCallback } from "react";
import { buildApiUrl, getAuthHeaders } from '../shared/utils/apiUtils';
import { useAuth } from '../shared/lib/hooks/useAuth';
import "./Expenses.css";

interface SalaryDetail {
  employee_name: string;
  position: string;
  amount: number;
}

interface BonusDetail {
  employee_name: string;
  position: string;
  amount: number;
}

interface LeadDetail {
  source: string;
  count: number;
  amount: number;
}

interface RefundDetail {
  client_name: string;
  contract_number: string;
  amount: number;
  comment: string;
  date: string;
}

interface ManualDetail {
  id: number;
  title: string;
  description: string;
  amount: number;
  spent_on: string;
}

type DetailItem = SalaryDetail | BonusDetail | LeadDetail | RefundDetail | ManualDetail;

interface ExpenseCategory {
  name: string;
  total: number;
  type: 'auto' | 'manual';
  details: DetailItem[];
}

interface ExpenseSummary {
  office_id: number;
  date_from: string | null;
  date_to: string | null;
  categories: ExpenseCategory[];
  total_expenses: number;
  office_cash: number;
  office_profit: number;
}

interface OfficeOption {
  id: string;
  name: string;
}

const Expenses: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<ExpenseSummary | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [offices, setOffices] = useState<OfficeOption[]>([]);
  const [selectedOfficeId, setSelectedOfficeId] = useState<string>('');
  const [periodType, setPeriodType] = useState<string>('month');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newExpense, setNewExpense] = useState({
    category: '\u0410\u0440\u0435\u043d\u0434\u0430',
    title: '',
    amount: '',
    description: '',
    spent_on: new Date().toISOString().slice(0, 10),
  });
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState({ title: '', amount: '', description: '', spent_on: '' });

  const computePeriodDates = useCallback((type: string) => {
    const now = new Date();
    let from = '';
    const to = now.toISOString().slice(0, 10);
    switch (type) {
      case 'week': { const d = new Date(now); d.setDate(d.getDate() - 7); from = d.toISOString().slice(0, 10); break; }
      case '2weeks': { const d = new Date(now); d.setDate(d.getDate() - 14); from = d.toISOString().slice(0, 10); break; }
      case 'month': { from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10); break; }
      case 'quarter': { const qMonth = Math.floor(now.getMonth() / 3) * 3; from = new Date(now.getFullYear(), qMonth, 1).toISOString().slice(0, 10); break; }
      case 'year': { from = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10); break; }
      case 'custom': return;
      default: from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    }
    setDateFrom(from);
    setDateTo(to);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    const fetchOffices = async () => {
      try {
        const res = await fetch(buildApiUrl('/offices/my'), { headers: getAuthHeaders() });
        if (!res.ok) return;
        const data = await res.json();
        const list: OfficeOption[] = (Array.isArray(data) ? data : data.data || []).map((o: { id: string; name?: string; title?: string }) => ({
          id: String(o.id),
          name: o.name || o.title || '\u041e\u0444\u0438\u0441 #' + o.id,
        }));
        setOffices(list);
        if (list.length > 0) {
          const activeId = localStorage.getItem('activeOfficeId');
          if (activeId && list.some(o => o.id === activeId)) {
            setSelectedOfficeId(activeId);
          } else {
            setSelectedOfficeId(list[0].id);
          }
        }
      } catch (err) { console.error('Error loading offices:', err); }
    };
    fetchOffices();
  }, [isAuthenticated]);

  useEffect(() => { computePeriodDates(periodType); }, [periodType, computePeriodDates]);

  const fetchExpenses = useCallback(async () => {
    if (!selectedOfficeId || !dateFrom) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.set('date_from', dateFrom);
      if (dateTo) params.set('date_to', dateTo);
      const res = await fetch(
        buildApiUrl('/office/' + selectedOfficeId + '/expenses-summary?' + params.toString()),
        { headers: getAuthHeaders() }
      );
      if (!res.ok) throw new Error('\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c \u0440\u0430\u0441\u0445\u043e\u0434\u044b');
      const body = await res.json();
      setSummary(body.data || null);
    } catch (err) {
      console.error('Error:', err);
      setError((err as Error).message);
    } finally { setLoading(false); }
  }, [selectedOfficeId, dateFrom, dateTo]);

  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

  const handleAddExpense = async () => {
    if (!newExpense.title.trim() || !newExpense.amount) return;
    setSaving(true);
    try {
      const res = await fetch(buildApiUrl('/expenses'), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          office_id: Number(selectedOfficeId),
          category: newExpense.category,
          title: newExpense.title,
          amount: Number(newExpense.amount),
          description: newExpense.description,
          spent_on: newExpense.spent_on,
        }),
      });
      if (!res.ok) throw new Error('\u041e\u0448\u0438\u0431\u043a\u0430 \u0434\u043e\u0431\u0430\u0432\u043b\u0435\u043d\u0438\u044f');
      setNewExpense({ category: '\u0410\u0440\u0435\u043d\u0434\u0430', title: '', amount: '', description: '', spent_on: new Date().toISOString().slice(0, 10) });
      setShowAddForm(false);
      await fetchExpenses();
    } catch (err) { setError((err as Error).message); } finally { setSaving(false); }
  };

  const handleDeleteExpense = async (id: number) => {
    try {
      await fetch(buildApiUrl('/expenses/' + id), { method: 'DELETE', headers: getAuthHeaders() });
      await fetchExpenses();
    } catch (err) { setError((err as Error).message); }
  };

  const handleStartEdit = (detail: ManualDetail) => {
    setEditingId(detail.id);
    setEditData({
      title: detail.title,
      amount: String(detail.amount),
      description: detail.description,
      spent_on: detail.spent_on ? new Date(detail.spent_on).toISOString().slice(0, 10) : '',
    });
  };

  const handleSaveEdit = async () => {
    if (editingId === null) return;
    try {
      await fetch(buildApiUrl('/expenses/' + editingId), {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          title: editData.title,
          amount: Number(editData.amount),
          description: editData.description,
          spent_on: editData.spent_on,
        }),
      });
      setEditingId(null);
      await fetchExpenses();
    } catch (err) { setError((err as Error).message); }
  };

  const toggleCategory = (name: string) => {
    setExpandedCategory(expandedCategory === name ? null : name);
  };

  const getCategoryIcon = (name: string): string => {
    const icons: Record<string, string> = {
      '\u0417\u0430\u0440\u043f\u043b\u0430\u0442\u044b \u0441\u043e\u0442\u0440\u0443\u0434\u043d\u0438\u043a\u043e\u0432': '\ud83d\udcb0',
      '\u0411\u043e\u043d\u0443\u0441\u044b': '\ud83c\udf81',
      '\u041f\u043e\u043a\u0443\u043f\u043a\u0430 \u043b\u0438\u0434\u043e\u0432': '\ud83d\udce2',
      '\u0412\u043e\u0437\u0432\u0440\u0430\u0442\u044b \u043a\u043b\u0438\u0435\u043d\u0442\u0430\u043c': '\u21a9\ufe0f',
      '\u0410\u0440\u0435\u043d\u0434\u0430': '\ud83c\udfe2',
      '\u041a\u043e\u043c\u043c\u0443\u043d\u0430\u043b\u044c\u043d\u044b\u0435 \u0443\u0441\u043b\u0443\u0433\u0438': '\ud83d\udca1',
      '\u0420\u0435\u043a\u043b\u0430\u043c\u0430': '\ud83d\udcfa',
      '\u041f\u0440\u043e\u0447\u0435\u0435': '\ud83d\udccb',
    };
    return icons[name] || '\ud83d\udccb';
  };

  const getTypeLabel = (type: string): string => {
    return type === 'auto' ? '\u0410\u0432\u0442\u043e\u043c\u0430\u0442\u0438\u0447\u0435\u0441\u043a\u0438\u0439' : '\u0420\u0443\u0447\u043d\u043e\u0439';
  };

  const getPeriodLabel = (): string => {
    if (!dateFrom || !dateTo) return '';
    const from = new Date(dateFrom).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
    const to = new Date(dateTo).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
    return from + ' \u2014 ' + to;
  };

  const manualCategories = ['\u0410\u0440\u0435\u043d\u0434\u0430', '\u041a\u043e\u043c\u043c\u0443\u043d\u0430\u043b\u044c\u043d\u044b\u0435 \u0443\u0441\u043b\u0443\u0433\u0438', '\u0420\u0435\u043a\u043b\u0430\u043c\u0430', '\u041f\u0440\u043e\u0447\u0435\u0435'];

  const renderDetails = (category: ExpenseCategory) => {
    if (category.type === 'auto' && category.name === '\u0417\u0430\u0440\u043f\u043b\u0430\u0442\u044b \u0441\u043e\u0442\u0440\u0443\u0434\u043d\u0438\u043a\u043e\u0432') {
      const details = category.details as SalaryDetail[];
      if (!details.length) return <p className="exp-no-details">{'\u041d\u0435\u0442 \u0434\u0430\u043d\u043d\u044b\u0445'}</p>;
      return (
        <table className="exp-detail-table">
          <thead><tr><th>{'\u0424\u0418\u041e \u0441\u043e\u0442\u0440\u0443\u0434\u043d\u0438\u043a\u0430'}</th><th>{'\u0414\u043e\u043b\u0436\u043d\u043e\u0441\u0442\u044c'}</th><th>{'\u0421\u0443\u043c\u043c\u0430'}</th></tr></thead>
          <tbody>
            {details.map((d, i) => (
              <tr key={i}><td>{d.employee_name}</td><td>{d.position}</td><td className="exp-amount-cell">{d.amount.toLocaleString('ru-RU')} {'\u20bd'}</td></tr>
            ))}
            <tr className="exp-detail-total"><td colSpan={2}>{'\u0418\u0442\u043e\u0433\u043e'}</td><td className="exp-amount-cell">{category.total.toLocaleString('ru-RU')} {'\u20bd'}</td></tr>
          </tbody>
        </table>
      );
    }

    if (category.type === 'auto' && category.name === '\u0411\u043e\u043d\u0443\u0441\u044b') {
      const details = category.details as BonusDetail[];
      if (!details.length) return <p className="exp-no-details">{'\u041d\u0435\u0442 \u0434\u0430\u043d\u043d\u044b\u0445'}</p>;
      return (
        <table className="exp-detail-table">
          <thead><tr><th>{'\u0424\u0418\u041e \u0441\u043e\u0442\u0440\u0443\u0434\u043d\u0438\u043a\u0430'}</th><th>{'\u0414\u043e\u043b\u0436\u043d\u043e\u0441\u0442\u044c'}</th><th>{'\u0411\u043e\u043d\u0443\u0441'}</th></tr></thead>
          <tbody>
            {details.map((d, i) => (
              <tr key={i}><td>{d.employee_name}</td><td>{d.position}</td><td className="exp-amount-cell">{d.amount.toLocaleString('ru-RU')} {'\u20bd'}</td></tr>
            ))}
            <tr className="exp-detail-total"><td colSpan={2}>{'\u0418\u0442\u043e\u0433\u043e'}</td><td className="exp-amount-cell">{category.total.toLocaleString('ru-RU')} {'\u20bd'}</td></tr>
          </tbody>
        </table>
      );
    }

    if (category.type === 'auto' && category.name === '\u041f\u043e\u043a\u0443\u043f\u043a\u0430 \u043b\u0438\u0434\u043e\u0432') {
      const details = category.details as LeadDetail[];
      if (!details.length) return <p className="exp-no-details">{'\u041d\u0435\u0442 \u0434\u0430\u043d\u043d\u044b\u0445'}</p>;
      return (
        <table className="exp-detail-table">
          <thead><tr><th>{'\u0418\u0441\u0442\u043e\u0447\u043d\u0438\u043a'}</th><th>{'\u041a\u043e\u043b-\u0432\u043e'}</th><th>{'\u0421\u0443\u043c\u043c\u0430'}</th></tr></thead>
          <tbody>
            {details.map((d, i) => (
              <tr key={i}><td>{d.source}</td><td>{d.count}</td><td className="exp-amount-cell">{d.amount.toLocaleString('ru-RU')} {'\u20bd'}</td></tr>
            ))}
            <tr className="exp-detail-total"><td colSpan={2}>{'\u0418\u0442\u043e\u0433\u043e'}</td><td className="exp-amount-cell">{category.total.toLocaleString('ru-RU')} {'\u20bd'}</td></tr>
          </tbody>
        </table>
      );
    }

    if (category.type === 'auto' && category.name === '\u0412\u043e\u0437\u0432\u0440\u0430\u0442\u044b \u043a\u043b\u0438\u0435\u043d\u0442\u0430\u043c') {
      const details = category.details as RefundDetail[];
      if (!details.length) return <p className="exp-no-details">{'\u041d\u0435\u0442 \u0434\u0430\u043d\u043d\u044b\u0445'}</p>;
      return (
        <table className="exp-detail-table">
          <thead><tr><th>{'\u041a\u043b\u0438\u0435\u043d\u0442'}</th><th>{'\u0414\u043e\u0433\u043e\u0432\u043e\u0440'}</th><th>{'\u041a\u043e\u043c\u043c\u0435\u043d\u0442\u0430\u0440\u0438\u0439'}</th><th>{'\u0421\u0443\u043c\u043c\u0430'}</th></tr></thead>
          <tbody>
            {details.map((d, i) => (
              <tr key={i}><td>{d.client_name}</td><td>{d.contract_number || '\u2014'}</td><td>{d.comment || '\u2014'}</td><td className="exp-amount-cell">{d.amount.toLocaleString('ru-RU')} {'\u20bd'}</td></tr>
            ))}
            <tr className="exp-detail-total"><td colSpan={3}>{'\u0418\u0442\u043e\u0433\u043e'}</td><td className="exp-amount-cell">{category.total.toLocaleString('ru-RU')} {'\u20bd'}</td></tr>
          </tbody>
        </table>
      );
    }

    // Manual expenses
    const details = category.details as ManualDetail[];
    if (!details.length) return <p className="exp-no-details">{'\u041d\u0435\u0442 \u0437\u0430\u043f\u0438\u0441\u0435\u0439. \u041d\u0430\u0436\u043c\u0438\u0442\u0435 \u00ab\u0414\u043e\u0431\u0430\u0432\u0438\u0442\u044c \u0440\u0430\u0441\u0445\u043e\u0434\u00bb \u0447\u0442\u043e\u0431\u044b \u0432\u043d\u0435\u0441\u0442\u0438.'}</p>;
    return (
      <table className="exp-detail-table">
        <thead><tr><th>{'\u041d\u0430\u0437\u0432\u0430\u043d\u0438\u0435'}</th><th>{'\u041e\u043f\u0438\u0441\u0430\u043d\u0438\u0435'}</th><th>{'\u0414\u0430\u0442\u0430'}</th><th>{'\u0421\u0443\u043c\u043c\u0430'}</th><th></th></tr></thead>
        <tbody>
          {details.map((d) => (
            <tr key={d.id}>
              {editingId === d.id ? (
                <>
                  <td><input value={editData.title} onChange={e => setEditData({ ...editData, title: e.target.value })} /></td>
                  <td><input value={editData.description} onChange={e => setEditData({ ...editData, description: e.target.value })} /></td>
                  <td><input type="date" value={editData.spent_on} onChange={e => setEditData({ ...editData, spent_on: e.target.value })} /></td>
                  <td><input type="number" value={editData.amount} onChange={e => setEditData({ ...editData, amount: e.target.value })} style={{ width: 100 }} /></td>
                  <td className="exp-actions-cell">
                    <button className="exp-btn-save" onClick={handleSaveEdit}>{'\u0421\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c'}</button>
                    <button className="exp-btn-cancel" onClick={() => setEditingId(null)}>{'\u041e\u0442\u043c\u0435\u043d\u0430'}</button>
                  </td>
                </>
              ) : (
                <>
                  <td>{d.title}</td>
                  <td>{d.description || '\u2014'}</td>
                  <td>{d.spent_on ? new Date(d.spent_on).toLocaleDateString('ru-RU') : '\u2014'}</td>
                  <td className="exp-amount-cell">{d.amount.toLocaleString('ru-RU')} {'\u20bd'}</td>
                  <td className="exp-actions-cell">
                    <button className="exp-btn-edit" onClick={() => handleStartEdit(d)}>{'\u0418\u0437\u043c.'}</button>
                    <button className="exp-btn-delete" onClick={() => handleDeleteExpense(d.id)}>{'\u0423\u0434\u0430\u043b\u0438\u0442\u044c'}</button>
                  </td>
                </>
              )}
            </tr>
          ))}
          <tr className="exp-detail-total">
            <td colSpan={3}>{'\u0418\u0442\u043e\u0433\u043e'}</td>
            <td className="exp-amount-cell">{category.total.toLocaleString('ru-RU')} {'\u20bd'}</td>
            <td></td>
          </tr>
        </tbody>
      </table>
    );
  };

  if (!isAuthenticated || !user) {
    return <div className="expenses-container"><p>{'\u0422\u0440\u0435\u0431\u0443\u0435\u0442\u0441\u044f \u0430\u0432\u0442\u043e\u0440\u0438\u0437\u0430\u0446\u0438\u044f'}</p></div>;
  }

  return (
    <div className="expenses-container">
      <div className="exp-header">
        <h2 className="exp-title">{'\u0420\u0430\u0441\u0445\u043e\u0434\u044b \u043e\u0444\u0438\u0441\u0430'}</h2>
        <div className="exp-header-controls">
          {offices.length > 1 && (
            <select className="exp-select" value={selectedOfficeId} onChange={(e) => setSelectedOfficeId(e.target.value)}>
              {offices.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          )}
          <select className="exp-select" value={periodType} onChange={(e) => setPeriodType(e.target.value)}>
            <option value="week">{'\u041d\u0435\u0434\u0435\u043b\u044f'}</option>
            <option value="2weeks">{'2 \u043d\u0435\u0434\u0435\u043b\u0438'}</option>
            <option value="month">{'\u041c\u0435\u0441\u044f\u0446'}</option>
            <option value="quarter">{'\u041a\u0432\u0430\u0440\u0442\u0430\u043b'}</option>
            <option value="year">{'\u0413\u043e\u0434'}</option>
            <option value="custom">{'\u0421\u0432\u043e\u0439 \u043f\u0435\u0440\u0438\u043e\u0434'}</option>
          </select>
          {periodType === 'custom' && (
            <div className="exp-custom-dates">
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
              <span>{'\u2014'}</span>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
          )}
        </div>
      </div>

      {summary && (
        <div className="exp-summary-cards">
          <div className="exp-card exp-card-expenses">
            <div className="exp-card-label">{'\u0412\u0441\u0435\u0433\u043e \u0440\u0430\u0441\u0445\u043e\u0434\u043e\u0432'}</div>
            <div className="exp-card-value">{summary.total_expenses.toLocaleString('ru-RU')} {'\u20bd'}</div>
            <div className="exp-card-period">{getPeriodLabel()}</div>
          </div>
          <div className="exp-card exp-card-cash">
            <div className="exp-card-label">{'\u041a\u0430\u0441\u0441\u0430 \u043e\u0444\u0438\u0441\u0430'}</div>
            <div className="exp-card-value">{summary.office_cash.toLocaleString('ru-RU')} {'\u20bd'}</div>
          </div>
          <div className={'exp-card ' + (summary.office_profit >= 0 ? 'exp-card-profit' : 'exp-card-loss')}>
            <div className="exp-card-label">{'\u041f\u0440\u0438\u0431\u044b\u043b\u044c'}</div>
            <div className="exp-card-value">{summary.office_profit.toLocaleString('ru-RU')} {'\u20bd'}</div>
          </div>
        </div>
      )}

      {error && <div className="exp-error">{error}</div>}

      <div className="exp-toolbar">
        <button className="exp-btn-add" onClick={() => setShowAddForm(!showAddForm)}>
          {showAddForm ? '\u041e\u0442\u043c\u0435\u043d\u0430' : '+ \u0414\u043e\u0431\u0430\u0432\u0438\u0442\u044c \u0440\u0430\u0441\u0445\u043e\u0434'}
        </button>
      </div>

      {showAddForm && (
        <div className="exp-add-form">
          <div className="exp-form-row">
            <select value={newExpense.category} onChange={e => setNewExpense({ ...newExpense, category: e.target.value })}>
              {manualCategories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input type="text" placeholder={'\u041d\u0430\u0437\u0432\u0430\u043d\u0438\u0435 \u0440\u0430\u0441\u0445\u043e\u0434\u0430'} value={newExpense.title} onChange={e => setNewExpense({ ...newExpense, title: e.target.value })} />
            <input type="number" placeholder={'\u0421\u0443\u043c\u043c\u0430'} value={newExpense.amount} onChange={e => setNewExpense({ ...newExpense, amount: e.target.value })} />
          </div>
          <div className="exp-form-row">
            <input type="text" placeholder={'\u041e\u043f\u0438\u0441\u0430\u043d\u0438\u0435 (\u043d\u0435\u043e\u0431\u044f\u0437\u0430\u0442\u0435\u043b\u044c\u043d\u043e)'} value={newExpense.description} onChange={e => setNewExpense({ ...newExpense, description: e.target.value })} />
            <input type="date" value={newExpense.spent_on} onChange={e => setNewExpense({ ...newExpense, spent_on: e.target.value })} />
            <button className="exp-btn-submit" onClick={handleAddExpense} disabled={saving || !newExpense.title.trim() || !newExpense.amount}>
              {saving ? '\u0421\u043e\u0445\u0440\u0430\u043d\u0435\u043d\u0438\u0435...' : '\u0414\u043e\u0431\u0430\u0432\u0438\u0442\u044c'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="exp-loading">{'\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430 \u0440\u0430\u0441\u0445\u043e\u0434\u043e\u0432...'}</div>
      ) : summary ? (
        <div className="exp-table-wrapper">
          <table className="exp-table">
            <thead>
              <tr>
                <th style={{ width: '30px' }}></th>
                <th>{'\u041a\u0430\u0442\u0435\u0433\u043e\u0440\u0438\u044f \u0440\u0430\u0441\u0445\u043e\u0434\u0430'}</th>
                <th>{'\u0421\u0443\u043c\u043c\u0430'}</th>
                <th>{'\u041f\u0435\u0440\u0438\u043e\u0434'}</th>
                <th>{'\u0422\u0438\u043f \u0440\u0430\u0441\u0445\u043e\u0434\u0430'}</th>
                <th>{'\u041f\u043e\u0434\u0440\u043e\u0431\u043d\u043e\u0441\u0442\u0438'}</th>
              </tr>
            </thead>
            <tbody>
              {summary.categories.map((cat) => (
                <React.Fragment key={cat.name}>
                  <tr
                    className={'exp-row' + (expandedCategory === cat.name ? ' exp-row-expanded' : '') + (cat.total > 0 ? ' exp-row-clickable' : '')}
                    onClick={() => cat.total > 0 && toggleCategory(cat.name)}
                  >
                    <td className="exp-icon-cell">{getCategoryIcon(cat.name)}</td>
                    <td className="exp-category-name">{cat.name}</td>
                    <td className="exp-amount-cell">
                      <span className={cat.total > 0 ? 'exp-amount-highlight' : 'exp-amount-zero'}>
                        {cat.total.toLocaleString('ru-RU')} {'\u20bd'}
                      </span>
                    </td>
                    <td className="exp-period-cell">{getPeriodLabel()}</td>
                    <td>
                      <span className={'exp-type-badge ' + (cat.type === 'auto' ? 'exp-type-auto' : 'exp-type-manual')}>
                        {getTypeLabel(cat.type)}
                      </span>
                    </td>
                    <td className="exp-details-hint">
                      {cat.total > 0 ? (
                        <span className="exp-expand-link">
                          {expandedCategory === cat.name ? '\u0421\u043a\u0440\u044b\u0442\u044c \u25b2' : '\u041f\u043e\u043a\u0430\u0437\u0430\u0442\u044c \u25bc'}
                        </span>
                      ) : (
                        <span className="exp-no-data">{'\u2014'}</span>
                      )}
                    </td>
                  </tr>
                  {expandedCategory === cat.name && (
                    <tr className="exp-expanded-row">
                      <td colSpan={6}>
                        <div className="exp-detail-panel">
                          <div className="exp-detail-header">
                            <h4>{getCategoryIcon(cat.name)} {cat.name} {'\u2014 \u043f\u043e\u0434\u0440\u043e\u0431\u043d\u0430\u044f \u0438\u043d\u0444\u043e\u0440\u043c\u0430\u0446\u0438\u044f'}</h4>
                          </div>
                          {renderDetails(cat)}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
            <tfoot>
              <tr className="exp-total-row">
                <td></td>
                <td><strong>{'\u0418\u0422\u041e\u0413\u041e \u0420\u0410\u0421\u0425\u041e\u0414\u041e\u0412'}</strong></td>
                <td className="exp-amount-cell">
                  <strong className="exp-grand-total">{summary.total_expenses.toLocaleString('ru-RU')} {'\u20bd'}</strong>
                </td>
                <td colSpan={3}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        <div className="exp-empty">{'\u041d\u0435\u0442 \u0434\u0430\u043d\u043d\u044b\u0445 \u043e \u0440\u0430\u0441\u0445\u043e\u0434\u0430\u0445'}</div>
      )}
    </div>
  );
};

export default Expenses;
