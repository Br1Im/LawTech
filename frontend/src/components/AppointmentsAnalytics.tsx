import React, { useState, useEffect, useCallback } from 'react';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import { notification } from 'antd';
import { apiInstance } from '../shared/api/instance';
import './AppointmentsAnalytics.css';

interface KPI {
  total_leads: number;
  recorded: number;
  arrived: number;
  no_show: number;
  contracts_signed: number;
  conversion: number;
  defect_rate: number;
  archived: number;
  in_progress: number;
}

interface FunnelStage {
  stage: string;
  count: number;
  rate: number;
}

interface SourceData {
  source: string;
  total_leads: number;
  booked: number;
  arrived: number;
  contracts_signed: number;
  archived: number;
  conversion: number;
  defect_rate: number;
  quality: 'good' | 'medium' | 'bad';
}

interface OperatorData {
  id: number;
  name: string;
  total_leads: number;
  booked: number;
  arrived: number;
  arrival_rate: number;
  archived: number;
  defect_rate: number;
}

interface ArchiveReason {
  status: string;
  label: string;
  count: number;
}

interface PrevPeriod {
  total_leads: number;
  recorded: number;
  arrived: number;
  contracts_signed: number;
  archived: number;
  conversion: number;
  defect_rate: number;
  period: string;
}

interface AnalyticsData {
  period: { from: string; to: string; label: string; has_plan: boolean };
  kpi: KPI;
  funnel: FunnelStage[];
  sources: SourceData[];
  best_source: { source: string; conversion: number } | null;
  worst_source: { source: string; conversion: number } | null;
  operators: OperatorData[];
  operator_totals: { total_leads: number; booked: number; arrived: number; archived: number; arrival_rate: number; defect_rate: number };
  archive_reasons: ArchiveReason[];
  losses: { total: number; rate: number };
  previous_period: PrevPeriod | null;
  city_stats?: { office_id: number; office_name: string; total_appointments: number; arrived: number; no_show: number; contracts_signed: number; conversion: number }[];
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch { return iso; }
}

function Delta({ current, previous, suffix = '', inverse = false }: { current: number; previous: number | undefined; suffix?: string; inverse?: boolean }) {
  if (previous === undefined || previous === null) return null;
  const diff = current - previous;
  if (diff === 0) return null;
  const isUp = diff > 0;
  const isGood = inverse ? !isUp : isUp;
  return (
    <span className={`aa-delta ${isGood ? 'aa-delta-good' : 'aa-delta-bad'}`}>
      {isUp ? '↑' : '↓'}{Math.abs(diff)}{suffix}
    </span>
  );
}

const AppointmentsAnalytics: React.FC = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [cycleOffset, setCycleOffset] = useState(0);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string | number> = {};
      if (cycleOffset !== 0) params.cycle_offset = cycleOffset;
      const res = await apiInstance.get('/analytics/call-center', { params });
      if (res.data?.success) {
        setData(res.data.data);
      }
    } catch {
      notification.error({ message: 'Ошибка', description: 'Не удалось загрузить аналитику' });
    } finally {
      setLoading(false);
    }
  }, [cycleOffset]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div className="aa-container">
        <div className="aa-loading">
          <div className="aa-loading-spinner" />
          <span>Загрузка аналитики…</span>
        </div>
      </div>
    );
  }

  if (!data) {
    return <div className="aa-container"><div className="aa-empty">Нет данных</div></div>;
  }

  const { kpi, funnel, sources, operators, operator_totals, archive_reasons, losses, previous_period: prev, city_stats } = data;
  const maxFunnel = Math.max(...funnel.map(f => f.count), 1);

  const qualityIcon: Record<string, string> = { good: '🟢', medium: '🟡', bad: '🔴' };

  return (
    <div className="aa-container">
      {/* Period navigation */}
      <div className="aa-period-nav">
        <button className="aa-period-arrow" onClick={() => setCycleOffset(o => o - 1)}><LeftOutlined /></button>
        <span className="aa-period-label">{formatDate(data.period.from)} – {formatDate(data.period.to)}</span>
        <button className="aa-period-arrow" onClick={() => setCycleOffset(o => Math.min(o + 1, 0))} disabled={cycleOffset >= 0}><RightOutlined /></button>
      </div>

      {/* KPI cards */}
      <div className="aa-kpi-grid">
        <div className="aa-kpi-card">
          <div className="aa-kpi-value">{kpi.total_leads}<Delta current={kpi.total_leads} previous={prev?.total_leads} /></div>
          <div className="aa-kpi-label">Всего лидов</div>
        </div>
        <div className="aa-kpi-card">
          <div className="aa-kpi-value">{kpi.recorded}<Delta current={kpi.recorded} previous={prev?.recorded} /></div>
          <div className="aa-kpi-label">Записано</div>
        </div>
        <div className="aa-kpi-card">
          <div className="aa-kpi-value">{kpi.arrived}<Delta current={kpi.arrived} previous={prev?.arrived} /></div>
          <div className="aa-kpi-label">Пришло</div>
        </div>
        <div className="aa-kpi-card aa-kpi-accent">
          <div className="aa-kpi-value">{kpi.contracts_signed}<Delta current={kpi.contracts_signed} previous={prev?.contracts_signed} /></div>
          <div className="aa-kpi-label">Заключено договоров</div>
        </div>
        <div className="aa-kpi-card">
          <div className="aa-kpi-value">{kpi.conversion}%<Delta current={kpi.conversion} previous={prev?.conversion} suffix="%" /></div>
          <div className="aa-kpi-label">Конверсия в договор</div>
        </div>
        <div className="aa-kpi-card">
          <div className="aa-kpi-value">{kpi.no_show}</div>
          <div className="aa-kpi-label">Не пришли</div>
        </div>
        <div className="aa-kpi-card aa-kpi-warn">
          <div className="aa-kpi-value">{kpi.archived} <span className="aa-kpi-sub">({kpi.defect_rate}%)</span><Delta current={kpi.defect_rate} previous={prev?.defect_rate} suffix="%" inverse /></div>
          <div className="aa-kpi-label">Брак</div>
        </div>
      </div>

      {/* Funnel + Best/Worst source side by side */}
      <div className="aa-two-col">
        {/* Funnel */}
        <div className="aa-block">
          <h3 className="aa-block-title">Воронка продаж</h3>
          <div className="aa-funnel">
            {funnel.map((f, i) => (
              <div key={f.stage} className="aa-funnel-row">
                <div className="aa-funnel-label">
                  <span className="aa-funnel-stage">{f.stage}</span>
                  <span className="aa-funnel-count">{f.count}</span>
                </div>
                <div className="aa-funnel-bar-wrap">
                  <div
                    className={`aa-funnel-bar aa-funnel-bar-${i}`}
                    style={{ width: `${Math.max((f.count / maxFunnel) * 100, 2)}%` }}
                  />
                </div>
                {i > 0 && <span className="aa-funnel-rate">{f.rate}%</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Best/worst source + losses */}
        <div className="aa-side-col">
          {data.best_source && (
            <div className="aa-highlight-card aa-highlight-good">
              <div className="aa-highlight-icon">🏆</div>
              <div className="aa-highlight-body">
                <div className="aa-highlight-label">Лучший источник</div>
                <div className="aa-highlight-value">{data.best_source.source}</div>
                <div className="aa-highlight-sub">{data.best_source.conversion}% конверсия</div>
              </div>
            </div>
          )}
          {data.worst_source && (
            <div className="aa-highlight-card aa-highlight-bad">
              <div className="aa-highlight-icon">⚠️</div>
              <div className="aa-highlight-body">
                <div className="aa-highlight-label">Худший источник</div>
                <div className="aa-highlight-value">{data.worst_source.source}</div>
                <div className="aa-highlight-sub">{data.worst_source.conversion}% конверсия</div>
              </div>
            </div>
          )}

          {/* Losses */}
          <div className="aa-block aa-losses-block">
            <h3 className="aa-block-title">Потери</h3>
            <div className="aa-losses-row">
              <span className="aa-losses-label">Потеряно лидов</span>
              <span className="aa-losses-value">{losses.total}</span>
            </div>
            <div className="aa-losses-row">
              <span className="aa-losses-label">Процент потерь</span>
              <span className="aa-losses-value aa-losses-pct">{losses.rate}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sources table */}
      <div className="aa-block">
        <h3 className="aa-block-title">Аналитика источников лидов</h3>
        <div className="aa-table-scroll">
          <table className="aa-table">
            <thead>
              <tr>
                <th></th>
                <th>Источник</th>
                <th className="num">Лидов</th>
                <th className="num">Записано</th>
                <th className="num">Пришло</th>
                <th className="num">Договоров</th>
                <th className="num">Брак</th>
                <th className="num">Конверсия</th>
              </tr>
            </thead>
            <tbody>
              {sources.length > 0 ? sources.map(s => (
                <tr key={s.source}>
                  <td className="aa-quality-cell">{qualityIcon[s.quality] || '🟡'}</td>
                  <td><b>{s.source}</b></td>
                  <td className="num">{s.total_leads}</td>
                  <td className="num">{s.booked}</td>
                  <td className="num">{s.arrived}</td>
                  <td className="num aa-accent">{s.contracts_signed}</td>
                  <td className="num">{s.archived}</td>
                  <td className="num"><b>{s.conversion}%</b></td>
                </tr>
              )) : (
                <tr><td colSpan={8} className="aa-table-empty">Нет данных за этот период</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Operators table */}
      <div className="aa-block">
        <h3 className="aa-block-title">Статистика операторов</h3>
        <div className="aa-table-scroll">
          <table className="aa-table">
            <thead>
              <tr>
                <th>Оператор</th>
                <th className="num">Лидов</th>
                <th className="num">Записано</th>
                <th className="num">Пришло</th>
                <th className="num">% прихода</th>
                <th className="num">Брак</th>
                <th className="num">% брака</th>
              </tr>
            </thead>
            <tbody>
              {operators.length > 0 ? (
                <>
                  {operators.map(o => (
                    <tr key={o.id}>
                      <td><b>{o.name}</b></td>
                      <td className="num">{o.total_leads}</td>
                      <td className="num">{o.booked}</td>
                      <td className="num">{o.arrived}</td>
                      <td className="num">{o.arrival_rate}%</td>
                      <td className="num">{o.archived}</td>
                      <td className="num">{o.defect_rate}%</td>
                    </tr>
                  ))}
                  <tr className="aa-table-totals">
                    <td><b>ИТОГО</b></td>
                    <td className="num"><b>{operator_totals.total_leads}</b></td>
                    <td className="num"><b>{operator_totals.booked}</b></td>
                    <td className="num"><b>{operator_totals.arrived}</b></td>
                    <td className="num"><b>{operator_totals.arrival_rate}%</b></td>
                    <td className="num"><b>{operator_totals.archived}</b></td>
                    <td className="num"><b>{operator_totals.defect_rate}%</b></td>
                  </tr>
                </>
              ) : (
                <tr><td colSpan={7} className="aa-table-empty">Нет данных за этот период</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Archive reasons */}
      <div className="aa-block">
        <h3 className="aa-block-title">Архив лидов</h3>
        {archive_reasons.length > 0 ? (
          <div className="aa-archive-grid">
            {archive_reasons.map(r => (
              <div key={r.status} className="aa-archive-item">
                <span className="aa-archive-label">{r.label}</span>
                <span className="aa-archive-count">{r.count}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="aa-table-empty">Нет архивных лидов за этот период</div>
        )}
      </div>
    
      {/* ── Статистика по городам ── */}
      {city_stats && city_stats.length > 0 && (
        <div className="aa-section">
          <h3 className="aa-section-title">📍 Статистика по городам</h3>
          <div className="aa-table-wrap">
            <table className="aa-table">
              <thead>
                <tr>
                  <th>Город</th>
                  <th>Записано</th>
                  <th>Пришло</th>
                  <th>Неявка</th>
                  <th>Договоры</th>
                  <th>Конверсия</th>
                </tr>
              </thead>
              <tbody>
                {city_stats.map((c: any) => (
                  <tr key={c.office_id}>
                    <td style={{ fontWeight: 500 }}>{c.office_name?.replace('Юридическая компания ', '') || '—'}</td>
                    <td>{c.total_appointments}</td>
                    <td>{c.arrived}</td>
                    <td>{c.no_show}</td>
                    <td>{c.contracts_signed}</td>
                    <td>{c.conversion}%</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ fontWeight: 700 }}>
                  <td>ИТОГО</td>
                  <td>{city_stats.reduce((s: number, c: any) => s + c.total_appointments, 0)}</td>
                  <td>{city_stats.reduce((s: number, c: any) => s + c.arrived, 0)}</td>
                  <td>{city_stats.reduce((s: number, c: any) => s + c.no_show, 0)}</td>
                  <td>{city_stats.reduce((s: number, c: any) => s + c.contracts_signed, 0)}</td>
                  <td>{(() => { const a = city_stats.reduce((s: number, c: any) => s + c.arrived, 0); const cs = city_stats.reduce((s: number, c: any) => s + c.contracts_signed, 0); return a > 0 ? Math.round(cs / a * 100) : 0; })()}%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      </div>
  );
};

export default AppointmentsAnalytics;
