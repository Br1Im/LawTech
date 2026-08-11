import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  BarChartOutlined,
  CheckOutlined,
  EditOutlined,
  FilterOutlined,
  PlusOutlined,
  StopOutlined,
} from '@ant-design/icons';
import { Modal, Select, notification } from 'antd';
import { apiInstance } from '../shared/api/instance';
import { useAuth } from '../shared/lib/hooks/useAuth';
import './AppointmentsAnalytics.css';

type Preset = 'today' | '7d' | '14d' | 'month' | 'custom';
type SortKey = 'source' | 'appointments' | 'arrived' | 'contracts' | 'conversion' | 'average_check' | 'revenue';

interface SourceItem {
  id: number;
  name: string;
  is_active: number;
  archived_at?: string | null;
}

interface OfficeItem {
  id: number;
  name: string;
}

interface SourceRow {
  source: string;
  appointments: number;
  arrived: number;
  contracts: number;
  conversion: number;
  average_check: number;
  revenue: number;
  no_show: number;
}

interface AnalyticsData {
  period: { from: string; to: string; label: string };
  kpi: {
    total_records: number;
    arrived: number;
    contracts_signed: number;
    conversion: number;
    no_show: number;
    attendance_rate: number;
    average_check: number;
    contract_revenue: number;
  };
  funnel: { stage: string; count: number; rate: number }[];
  source_ranking: SourceRow[];
  losses: {
    total: number;
    items: { reason: string; label: string; count: number; percentage: number }[];
  };
  quality: {
    total_records: number;
    arrived: number;
    attendance_rate: number;
    contracts_signed: number;
    conversion: number;
    average_check: number;
    revenue: number;
  };
}

const roleCanManageSources = ['director', 'manager', 'okk', 'admin', 'administrator'];

function formatMoney(value: number) {
  return `${Math.round(Number(value || 0)).toLocaleString('ru-RU')} ₽`;
}

function formatDate(value: string) {
  const [year, month, day] = String(value || '').slice(0, 10).split('-');
  return year && month && day ? `${day}.${month}.${year}` : '—';
}

function SortButton({
  label,
  sortKey,
  sort,
  onChange,
}: {
  label: string;
  sortKey: SortKey;
  sort: { key: SortKey; direction: 'asc' | 'desc' };
  onChange: (key: SortKey) => void;
}) {
  const active = sort.key === sortKey;
  return (
    <button className={`aa-sort-btn ${active ? 'is-active' : ''}`} onClick={() => onChange(sortKey)}>
      {label}
      {active && (sort.direction === 'asc' ? <ArrowUpOutlined /> : <ArrowDownOutlined />)}
    </button>
  );
}

const AppointmentsAnalytics: React.FC = () => {
  const { user } = useAuth();
  const canManageSources = roleCanManageSources.includes(user?.role || '');
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [sources, setSources] = useState<SourceItem[]>([]);
  const [offices, setOffices] = useState<OfficeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [preset, setPreset] = useState<Preset>('month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [officeId, setOfficeId] = useState('all');
  const [sourceId, setSourceId] = useState('all');
  const [sort, setSort] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({ key: 'revenue', direction: 'desc' });
  const [sourcePanelOpen, setSourcePanelOpen] = useState(false);
  const [sourceModalOpen, setSourceModalOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<SourceItem | null>(null);
  const [sourceName, setSourceName] = useState('');
  const [sourceSaving, setSourceSaving] = useState(false);

  const fetchSources = useCallback(async () => {
    try {
      const response = await apiInstance.get('/appointment-sources', {
        params: canManageSources ? { include_archived: 1 } : undefined,
      });
      if (response.data?.success) setSources(response.data.data || []);
    } catch {
      notification.error({ message: 'Не удалось загрузить источники записей' });
    }
  }, [canManageSources]);

  const fetchOffices = useCallback(async () => {
    try {
      const response = await apiInstance.get('/offices/my');
      if (response.data?.success) {
        const list = (response.data.data || []).map((office: any) => ({ id: Number(office.id), name: office.name }));
        setOffices(list);
        if (list.length === 1) setOfficeId(String(list[0].id));
      }
    } catch {
      // The backend still scopes the request to the current office.
    }
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {
        period: preset === 'custom' ? 'custom' : preset,
        office_id: officeId,
      };
      if (preset === 'custom') {
        if (customFrom) params.date_from = customFrom;
        if (customTo) params.date_to = customTo;
      }
      if (sourceId !== 'all') params.source_id = sourceId;
      const response = await apiInstance.get('/analytics/call-center', { params });
      if (response.data?.success) setData(response.data.data);
    } catch {
      notification.error({ message: 'Не удалось загрузить аналитику' });
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [customFrom, customTo, officeId, preset, sourceId]);

  useEffect(() => {
    fetchOffices();
    fetchSources();
  }, [fetchOffices, fetchSources]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const sortedSources = useMemo(() => {
    const rows = [...(data?.source_ranking || [])];
    const direction = sort.direction === 'asc' ? 1 : -1;
    return rows.sort((a, b) => {
      if (sort.key === 'source') return a.source.localeCompare(b.source, 'ru') * direction;
      return (Number(a[sort.key]) - Number(b[sort.key])) * direction;
    });
  }, [data?.source_ranking, sort]);

  const setSortKey = (key: SortKey) => {
    setSort(current => current.key === key
      ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
      : { key, direction: key === 'source' ? 'asc' : 'desc' });
  };

  const openCreateSource = () => {
    setEditingSource(null);
    setSourceName('');
    setSourceModalOpen(true);
  };

  const openEditSource = (source: SourceItem) => {
    setEditingSource(source);
    setSourceName(source.name);
    setSourceModalOpen(true);
  };

  const saveSource = async () => {
    const name = sourceName.trim();
    if (!name) return;
    try {
      setSourceSaving(true);
      if (editingSource) {
        await apiInstance.patch(`/appointment-sources/${editingSource.id}`, { name });
      } else {
        await apiInstance.post('/appointment-sources', { name });
      }
      setSourceModalOpen(false);
      await fetchSources();
      notification.success({ message: editingSource ? 'Источник обновлён' : 'Источник добавлен' });
    } catch (error: any) {
      notification.error({ message: error?.response?.data?.message || 'Не удалось сохранить источник' });
    } finally {
      setSourceSaving(false);
    }
  };

  const toggleSource = async (source: SourceItem) => {
    try {
      await apiInstance.patch(`/appointment-sources/${source.id}`, { is_active: !source.is_active });
      await fetchSources();
      notification.success({ message: source.is_active ? 'Источник архивирован' : 'Источник восстановлен' });
    } catch {
      notification.error({ message: 'Не удалось изменить статус источника' });
    }
  };

  if (loading && !data) {
    return <div className="aa-container"><div className="aa-loading"><span className="aa-loading-spinner" />Загружаем управленческую аналитику…</div></div>;
  }

  if (!data) {
    return <div className="aa-container"><div className="aa-empty">Не удалось получить данные за выбранный период</div></div>;
  }

  const maxFunnel = Math.max(...data.funnel.map(stage => stage.count), 1);
  const maxLoss = Math.max(...data.losses.items.map(item => item.count), 1);
  const activeSources = sources.filter(source => source.is_active);

  return (
    <div className="aa-container">
      <div className="aa-filter-bar">
        <div className="aa-filter-heading">
          <div className="aa-eyebrow"><BarChartOutlined /> Управленческая аналитика</div>
          <div className="aa-period-caption">{formatDate(data.period.from)} — {formatDate(data.period.to)}</div>
        </div>
        <div className="aa-filter-controls">
          <div className="aa-filter-group">
            <FilterOutlined />
            <Select
              size="small"
              value={preset}
              onChange={value => setPreset(value as Preset)}
              options={[
                { value: 'today', label: 'Сегодня' },
                { value: '7d', label: '7 дней' },
                { value: '14d', label: '14 дней' },
                { value: 'month', label: 'Текущий месяц' },
                { value: 'custom', label: 'Свой период' },
              ]}
            />
          </div>
          {preset === 'custom' && (
            <div className="aa-date-range">
              <input type="date" value={customFrom} onChange={event => setCustomFrom(event.target.value)} />
              <span>—</span>
              <input type="date" value={customTo} onChange={event => setCustomTo(event.target.value)} />
            </div>
          )}
          <Select
            size="small"
            value={officeId}
            onChange={setOfficeId}
            options={[
              { value: 'all', label: 'Все офисы' },
              ...offices.map(office => ({ value: String(office.id), label: office.name })),
            ]}
          />
          <Select
            size="small"
            value={sourceId}
            onChange={setSourceId}
            options={[
              { value: 'all', label: 'Все источники' },
              ...activeSources.map(source => ({ value: String(source.id), label: source.name })),
            ]}
          />
          {canManageSources && (
            <button className="aa-outline-btn" onClick={() => setSourcePanelOpen(open => !open)}>
              Источники
            </button>
          )}
        </div>
      </div>

      {sourcePanelOpen && canManageSources && (
        <div className="aa-source-directory">
          <div className="aa-block-head">
            <div>
              <h3 className="aa-block-title">Источники записей</h3>
              <p className="aa-block-subtitle">Общий справочник для ручных записей, API и импортов</p>
            </div>
            <button className="aa-primary-btn" onClick={openCreateSource}><PlusOutlined /> Добавить источник</button>
          </div>
          <div className="aa-source-list">
            {sources.map(source => (
              <div className={`aa-source-row ${source.is_active ? '' : 'is-archived'}`} key={source.id}>
                <span className="aa-source-status" />
                <span className="aa-source-name">{source.name}</span>
                {!source.is_active && <span className="aa-archived-label">В архиве</span>}
                <div className="aa-source-actions">
                  <button className="aa-icon-btn" title="Изменить" onClick={() => openEditSource(source)}><EditOutlined /></button>
                  <button className="aa-icon-btn" title={source.is_active ? 'Архивировать' : 'Восстановить'} onClick={() => toggleSource(source)}>
                    {source.is_active ? <StopOutlined /> : <CheckOutlined />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="aa-kpi-grid">
        <div className="aa-kpi-card"><span className="aa-kpi-label">Всего записей</span><strong>{data.kpi.total_records}</strong><small>за период</small></div>
        <div className="aa-kpi-card aa-kpi-positive"><span className="aa-kpi-label">Пришли на консультацию</span><strong>{data.kpi.arrived}</strong><small>{data.kpi.attendance_rate}% явки</small></div>
        <div className="aa-kpi-card aa-kpi-accent"><span className="aa-kpi-label">Заключено договоров</span><strong>{data.kpi.contracts_signed}</strong><small>из записей</small></div>
        <div className="aa-kpi-card"><span className="aa-kpi-label">Конверсия</span><strong>{data.kpi.conversion}%</strong><small>запись → договор</small></div>
        <div className="aa-kpi-card aa-kpi-warning"><span className="aa-kpi-label">Не пришли</span><strong>{data.kpi.no_show}</strong><small>неявка</small></div>
        <div className="aa-kpi-card"><span className="aa-kpi-label">Средний оплаченный чек</span><strong>{formatMoney(data.kpi.average_check)}</strong><small>на договор</small></div>
        <div className="aa-kpi-card aa-kpi-revenue"><span className="aa-kpi-label">Оплачено по договорам</span><strong>{formatMoney(data.kpi.contract_revenue)}</strong><small>за период</small></div>
      </div>

      <div className="aa-two-col">
        <section className="aa-block">
          <div className="aa-block-head">
            <div><h3 className="aa-block-title">Общая воронка продаж</h3><p className="aa-block-subtitle">Как записи превращаются в договоры</p></div>
          </div>
          <div className="aa-funnel">
            {data.funnel.map((stage, index) => (
              <div className="aa-funnel-row" key={stage.stage}>
                <div className="aa-funnel-meta"><span>{stage.stage}</span><strong>{stage.count}</strong></div>
                <div className="aa-funnel-track"><div className={`aa-funnel-bar aa-funnel-bar-${index}`} style={{ width: `${Math.max((stage.count / maxFunnel) * 100, stage.count ? 5 : 0)}%` }} /></div>
                <span className="aa-funnel-rate">{index === 0 ? '100%' : `${stage.rate}%`}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="aa-block">
          <div className="aa-block-head"><div><h3 className="aa-block-title">Качество записей</h3><p className="aa-block-subtitle">Эффективность работы с обращениями</p></div></div>
          <div className="aa-quality-grid">
            <div><span>Всего записей</span><strong>{data.quality.total_records}</strong></div>
            <div><span>Пришли</span><strong>{data.quality.arrived}</strong></div>
            <div><span>Явка</span><strong>{data.quality.attendance_rate}%</strong></div>
            <div><span>Договоры</span><strong>{data.quality.contracts_signed}</strong></div>
            <div><span>Конверсия</span><strong>{data.quality.conversion}%</strong></div>
            <div><span>Средний чек</span><strong>{formatMoney(data.quality.average_check)}</strong></div>
            <div className="aa-quality-revenue"><span>Общая выручка</span><strong>{formatMoney(data.quality.revenue)}</strong></div>
          </div>
        </section>
      </div>

      <section className="aa-block">
        <div className="aa-block-head">
          <div><h3 className="aa-block-title">Рейтинг источников</h3><p className="aa-block-subtitle">Сравнение всех каналов по качеству и выручке</p></div>
          <span className="aa-table-note">Сортировка доступна по каждому показателю</span>
        </div>
        <div className="aa-table-scroll">
          <table className="aa-table">
            <thead><tr>
              <th><SortButton label="Источник" sortKey="source" sort={sort} onChange={setSortKey} /></th>
              <th className="num"><SortButton label="Записи" sortKey="appointments" sort={sort} onChange={setSortKey} /></th>
              <th className="num"><SortButton label="Пришли" sortKey="arrived" sort={sort} onChange={setSortKey} /></th>
              <th className="num"><SortButton label="Договоры" sortKey="contracts" sort={sort} onChange={setSortKey} /></th>
              <th className="num"><SortButton label="Конверсия" sortKey="conversion" sort={sort} onChange={setSortKey} /></th>
              <th className="num"><SortButton label="Средний чек" sortKey="average_check" sort={sort} onChange={setSortKey} /></th>
              <th className="num"><SortButton label="Выручка" sortKey="revenue" sort={sort} onChange={setSortKey} /></th>
            </tr></thead>
            <tbody>
              {sortedSources.length ? sortedSources.map(row => (
                <tr key={row.source}>
                  <td><span className="aa-source-dot" /> <strong>{row.source}</strong></td>
                  <td className="num">{row.appointments}</td>
                  <td className="num">{row.arrived}</td>
                  <td className="num aa-accent">{row.contracts}</td>
                  <td className="num"><span className={`aa-conversion ${row.conversion >= 20 ? 'good' : row.conversion < 5 ? 'bad' : ''}`}>{row.conversion}%</span></td>
                  <td className="num">{formatMoney(row.average_check)}</td>
                  <td className="num"><strong>{formatMoney(row.revenue)}</strong></td>
                </tr>
              )) : <tr><td colSpan={7} className="aa-table-empty">Нет записей с источником за этот период</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="aa-block">
        <div className="aa-block-head"><div><h3 className="aa-block-title">Где компания теряет клиентов</h3><p className="aa-block-subtitle">Причины потерь за выбранный период</p></div><strong className="aa-loss-total">{data.losses.total} всего</strong></div>
        {data.losses.items.length ? <div className="aa-loss-list">{data.losses.items.map(item => (
          <div className="aa-loss-row" key={item.reason}>
            <div className="aa-loss-label"><span>{item.label}</span><strong>{item.count} <em>{item.percentage}%</em></strong></div>
            <div className="aa-loss-track"><div style={{ width: `${(item.count / maxLoss) * 100}%` }} /></div>
          </div>
        ))}</div> : <div className="aa-empty-inline">Потерь за выбранный период не зафиксировано</div>}
      </section>

      <Modal
        title={editingSource ? 'Изменить источник' : 'Новый источник'}
        open={sourceModalOpen}
        onCancel={() => setSourceModalOpen(false)}
        onOk={saveSource}
        okText="Сохранить"
        cancelText="Отмена"
        confirmLoading={sourceSaving}
      >
        <label className="aa-modal-label">Название источника</label>
        <input className="aa-source-input" autoFocus value={sourceName} onChange={event => setSourceName(event.target.value)} placeholder="Например, Telegram" maxLength={100} />
      </Modal>
    </div>
  );
};

export default AppointmentsAnalytics;
