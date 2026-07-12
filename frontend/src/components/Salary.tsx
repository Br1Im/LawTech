import React, { useCallback, useEffect, useMemo, useState } from 'react';
import styled from '@emotion/styled';
import {
  Table,
  Tabs,
  Button,
  Space,
  App,
  Modal,
  DatePicker,
  Select,
  Tag,
  InputNumber,
  Popover,
  Empty,
  Popconfirm,
  Input,
  Tooltip,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs, { Dayjs } from 'dayjs';
import {
  ReloadOutlined,
  SettingOutlined,
  LeftOutlined,
  RightOutlined,
  EditOutlined,
  PlusOutlined,
  DeleteOutlined,
  CalculatorOutlined,
} from '@ant-design/icons';
import {
  salaryApi,
  employeesApi,
  type SalaryCalcResult,
  type SalaryRow,
  type SalarySettings,
  type EmployeeSalary,
  type CrmEmployee,
  type ShiftRecord,
} from '../shared/api/crm';
import useAuth from '../shared/lib/hooks/useAuth';
import { useIsMobile } from '../shared/lib/useIsMobile';

const Page = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 8px 0 0;
`;

const ToolRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: space-between;
`;

const TableCard = styled.div`
  border-radius: var(--radius-lg);
  background: var(--glass-bg);
  backdrop-filter: blur(14px) saturate(140%);
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-shadow);
  padding: 8px 8px 4px;
  overflow: hidden;
  .ant-table-thead > tr > th { background: transparent !important; font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-muted); }
  .ant-table-tbody > tr > td { background: transparent !important; }
`;

const SalaryCards = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  .salary-m-card {
    border-radius: var(--radius-md);
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    box-shadow: var(--glass-shadow);
    padding: 12px 14px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .sm-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
  .sm-name { font-weight: 700; font-size: 15px; }
  .sm-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 12px; }
  .sm-cell { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .sm-cell.sm-total { grid-column: 1 / -1; padding-top: 8px; border-top: 1px solid var(--glass-border); }
  .sm-lbl { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-muted); }
  .sm-val { font-size: 15px; font-weight: 600; }
  .sm-total .sm-val { font-size: 19px; font-weight: 800; }
`;

const StatRow = styled.div`
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  margin-top: 4px;
`;

const Stat = styled.div`
  border-radius: var(--radius-md);
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  padding: 10px 14px;
  min-width: 200px;
  .lbl { color: var(--color-muted); font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em; }
  .val { font-weight: 700; font-size: 18px; }
`;

const formatMoney = (v?: number | string | null) => {
  const n = typeof v === 'string' ? parseFloat(v) : (v ?? 0);
  if (!Number.isFinite(n)) return '0 ₽';
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(n);
};

const shortName = (full?: string | null) => {
  if (!full) return '—';
  const parts = String(full).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '—';
  const [last, first, middle] = parts;
  const initials = [first, middle].filter(Boolean).map((p) => `${p[0]}.`).join('');
  return `${last}${initials ? ' ' + initials : ''}`;
};

const ROLE_TAG_COLORS: Record<string, string> = {
  lawyer: 'gold',
  okk: 'cyan',
  manager: 'purple',
  representative: 'geekblue',
  reception: 'magenta',
  expert: 'green',
  director: 'red',
};

type PeriodKey = 'today' | 'yesterday' | 'week' | 'month' | 'custom';

const Salary: React.FC = () => {
  const { user } = useAuth();
  const { message } = App.useApp();
  const isDirector = ['director', 'admin', 'owner'].includes(String(user?.role || '').toLowerCase());
  const isManagerOrAbove = ['director', 'admin', 'owner', 'manager'].includes(String(user?.role || '').toLowerCase());
  const isLawyer = String(user?.role || '').toLowerCase() === 'lawyer';
  const isMobile = useIsMobile();

  const [period, setPeriod] = useState<PeriodKey>('custom');
  const [customRange, setCustomRange] = useState<[Dayjs, Dayjs]>([dayjs().startOf('month'), dayjs()]);
  const [data, setData] = useState<SalaryCalcResult | null>(null);
  const [loading, setLoading] = useState(false);

  const [employees, setEmployees] = useState<CrmEmployee[]>([]);
  const [shifts, setShifts] = useState<ShiftRecord[]>([]);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsForm, setSettingsForm] = useState<SalarySettings | null>(null);

  const [salaryEditEmp, setSalaryEditEmp] = useState<SalaryRow | null>(null);
  const [salaryEditForm, setSalaryEditForm] = useState<EmployeeSalary | null>(null);

  const [shiftAddOpen, setShiftAddOpen] = useState(false);
  const [shiftForm, setShiftForm] = useState<{ employee_id?: number; shift_date: Dayjs; note: string }>(
    { employee_id: undefined, shift_date: dayjs(), note: '' }
  );

  const range = useMemo<[string, string]>(() => {
    const today = dayjs();
    switch (period) {
      case 'today': return [today.format('YYYY-MM-DD'), today.format('YYYY-MM-DD')];
      case 'yesterday': {
        const y = today.subtract(1, 'day');
        return [y.format('YYYY-MM-DD'), y.format('YYYY-MM-DD')];
      }
      case 'week': return [today.subtract(6, 'day').format('YYYY-MM-DD'), today.format('YYYY-MM-DD')];
      case 'month': return [today.startOf('month').format('YYYY-MM-DD'), today.format('YYYY-MM-DD')];
      case 'custom':
        return [customRange[0].format('YYYY-MM-DD'), customRange[1].format('YYYY-MM-DD')];
    }
  }, [period, customRange]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [from, to] = range;
      const result = await salaryApi.calculate({ date_from: from, date_to: to });
      setData(result);
    } catch (e: any) {
      message.error(e?.response?.data?.message || 'Ошибка расчёта зарплаты');
    } finally {
      setLoading(false);
    }
  }, [range, message]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    employeesApi.list().then((d) => setEmployees(Array.isArray(d) ? d : [])).catch(() => undefined);
  }, []);

  const loadShifts = useCallback(async () => {
    try {
      const [from, to] = range;
      const list = await salaryApi.listShifts({ date_from: from, date_to: to });
      setShifts(Array.isArray(list) ? list : []);
    } catch {
      // тихо
    }
  }, [range]);

  useEffect(() => { loadShifts(); }, [loadShifts]);

  const openSettings = async () => {
    if (!data) return;
    const officeId = data.office_id;
    try {
      const s = await salaryApi.getSettings(officeId);
      setSettingsForm(s);
      setSettingsOpen(true);
    } catch (e: any) {
      message.error(e?.response?.data?.message || 'Не удалось загрузить настройки');
    }
  };

  const saveSettings = async () => {
    if (!settingsForm || !data) return;
    try {
      await salaryApi.updateSettings(data.office_id, {
        lawyer_percent: Number(settingsForm.lawyer_percent),
        lawyer_bonus_threshold: Number(settingsForm.lawyer_bonus_threshold),
        lawyer_bonus_percent: Number(settingsForm.lawyer_bonus_percent),
        okk_percent: Number(settingsForm.okk_percent),
        okk_bonus_threshold: Number(settingsForm.okk_bonus_threshold),
        okk_bonus_percent: Number(settingsForm.okk_bonus_percent),
        manager_office_percent: Number(settingsForm.manager_office_percent),
        representative_percent: Number(settingsForm.representative_percent),
        admin_shift_rate: Number(settingsForm.admin_shift_rate),
        expert_per_doc_amount: Number(settingsForm.expert_per_doc_amount),
      });
      message.success('Настройки сохранены');
      setSettingsOpen(false);
      load();
    } catch (e: any) {
      message.error(e?.response?.data?.message || 'Не удалось сохранить настройки');
    }
  };

  const openSalaryEditor = async (row: SalaryRow) => {
    try {
      const s = await salaryApi.getEmployeeSalary(row.employee_id);
      setSalaryEditEmp(row);
      setSalaryEditForm(s);
    } catch (e: any) {
      message.error(e?.response?.data?.message || 'Ошибка');
    }
  };

  const saveEmployeeSalary = async () => {
    if (!salaryEditEmp || !salaryEditForm) return;
    try {
      await salaryApi.upsertEmployeeSalary(salaryEditEmp.employee_id, {
        base_salary: Number(salaryEditForm.base_salary) || 0,
        custom_percent: salaryEditForm.custom_percent === null || salaryEditForm.custom_percent === undefined || salaryEditForm.custom_percent === ''
          ? null : Number(salaryEditForm.custom_percent),
        custom_shift_rate: salaryEditForm.custom_shift_rate === null || salaryEditForm.custom_shift_rate === undefined || salaryEditForm.custom_shift_rate === ''
          ? null : Number(salaryEditForm.custom_shift_rate),
        custom_per_doc: salaryEditForm.custom_per_doc === null || salaryEditForm.custom_per_doc === undefined || salaryEditForm.custom_per_doc === ''
          ? null : Number(salaryEditForm.custom_per_doc),
      });
      message.success('Окладные данные обновлены');
      setSalaryEditEmp(null);
      setSalaryEditForm(null);
      load();
    } catch (e: any) {
      message.error(e?.response?.data?.message || 'Ошибка сохранения');
    }
  };

  const submitShift = async () => {
    if (!shiftForm.employee_id) {
      message.error('Выберите сотрудника');
      return;
    }
    try {
      await salaryApi.createShift({
        employee_id: shiftForm.employee_id,
        shift_date: shiftForm.shift_date.format('YYYY-MM-DD'),
        note: shiftForm.note || undefined,
      });
      message.success('Смена добавлена');
      setShiftAddOpen(false);
      setShiftForm({ employee_id: undefined, shift_date: dayjs(), note: '' });
      loadShifts();
      load();
    } catch (e: any) {
      message.error(e?.response?.data?.message || 'Ошибка');
    }
  };

  const removeShift = async (id: number) => {
    try {
      await salaryApi.removeShift(id);
      message.success('Смена удалена');
      loadShifts();
      load();
    } catch (e: any) {
      message.error(e?.response?.data?.message || 'Ошибка');
    }
  };

  const reception = useMemo(
    () => employees.filter((e: any) => String(e.user_role || '').toLowerCase() === 'admin'),
    [employees]
  );

  const columns: ColumnsType<SalaryRow> = [
    { title: 'Сотрудник', dataIndex: 'full_name', key: 'name', render: (v) => shortName(v) },
    {
      title: 'Роль',
      dataIndex: 'role_label',
      key: 'role',
      width: 180,
      render: (v, r) => (
        <Space size={4}>
          <Tag color={ROLE_TAG_COLORS[r.role || ''] || 'default'}>{v}</Tag>
          {r.external ? <Tag color="default">внешний</Tag> : null}
        </Space>
      ),
      filters: [
        { text: 'Юрист', value: 'lawyer' },
        { text: 'Руководитель', value: 'okk' },
        { text: 'Менеджер', value: 'manager' },
        { text: 'Представитель', value: 'representative' },
        { text: 'Администратор', value: 'reception' },
        { text: 'Эксперт', value: 'expert' },
      ],
      onFilter: (v, r) => r.role === v,
    },
    {
      title: 'Оклад',
      dataIndex: 'base_salary',
      key: 'base',
      align: 'right',
      width: 130,
      render: (v) => formatMoney(v),
    },
    {
      title: 'Процент',
      dataIndex: 'bonus',
      key: 'bonus',
      align: 'right',
      width: 160,
      render: (v, r) => (
        <Popover
          title="Расчёт процента"
          content={
            r.bonus_breakdown.length === 0
              ? <span>—</span>
              : (
                <ul style={{ paddingLeft: 16, margin: 0 }}>
                  {r.bonus_breakdown.map((b, i) => (
                    <li key={i}>{b.label}: <b>{formatMoney(b.value)}</b></li>
                  ))}
                </ul>
              )
          }
        >
          <span style={{ borderBottom: '1px dashed #aaa', cursor: 'help' }}>{formatMoney(v)}</span>
        </Popover>
      ),
    },
    {
      title: 'Итого ЗП',
      dataIndex: 'total',
      key: 'total',
      align: 'right',
      width: 140,
      render: (v) => <b>{formatMoney(v)}</b>,
      sorter: (a, b) => a.total - b.total,
      defaultSortOrder: 'descend',
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 110,
      render: (_, r) => (
        <Button size="small" icon={<EditOutlined />} disabled={!isManagerOrAbove} onClick={() => openSalaryEditor(r)}>
          Настроить
        </Button>
      ),
    },
  ];

  // Юрист видит только свою зарплату
  const visibleRows = isLawyer && user?.id
    ? (data?.rows || []).filter(r => r.employee_id === user.id)
    : (data?.rows || []);

  // ФОТ — сумма зарплат всех сотрудников офиса
  const totalPayroll = visibleRows
    .reduce((acc, r) => acc + (Number(r.total) || 0), 0);

  return (
    <Page>
      <ToolRow>
        <Space size={8} wrap align="center">
          <Tooltip title="Предыдущий период">
            <Button
              icon={<LeftOutlined />}
              onClick={() => {
                const len = customRange[1].diff(customRange[0], 'day') + 1;
                setPeriod('custom');
                setCustomRange([
                  customRange[0].subtract(len, 'day'),
                  customRange[1].subtract(len, 'day'),
                ]);
              }}
            />
          </Tooltip>
          <span style={{ fontSize: 14, fontWeight: 600, minWidth: 220, textAlign: 'center' }}>
            {customRange[0].format('DD.MM.YYYY')} — {customRange[1].format('DD.MM.YYYY')}
          </span>
          <Tooltip title="Следующий период">
            <Button
              icon={<RightOutlined />}
              onClick={() => {
                const len = customRange[1].diff(customRange[0], 'day') + 1;
                setPeriod('custom');
                setCustomRange([
                  customRange[0].add(len, 'day'),
                  customRange[1].add(len, 'day'),
                ]);
              }}
            />
          </Tooltip>
          <DatePicker.RangePicker
            value={customRange}
            onChange={(v) => { if (v && v[0] && v[1]) { setPeriod('custom'); setCustomRange([v[0], v[1]]); } }}
            format="DD.MM.YYYY"
            allowClear={false}
          />
        </Space>
        <Space wrap>
{isDirector && (
            <Button icon={<SettingOutlined />} onClick={openSettings}>Настройки расчёта</Button>
          )}
        </Space>
      </ToolRow>

      <StatRow>
        <Stat>
          <div className="lbl">Период</div>
          <div className="val">{range[0]} — {range[1]}</div>
        </Stat>
        {!isLawyer && (
          <>
            <Stat>
              <div className="lbl">Касса офиса</div>
              <div className="val">{formatMoney(data?.office_cash)}</div>
            </Stat>
            <Stat>
              <div className="lbl">Расходы офиса</div>
              <div className="val">{formatMoney(data?.office_expenses)}</div>
            </Stat>
            <Stat>
              <div className="lbl">Прибыль офиса</div>
              <div className="val">{formatMoney(data?.office_profit)}</div>
            </Stat>
          </>
        )}
      </StatRow>

      <Tabs
        items={[
          {
            key: 'payroll',
            label: <span><CalculatorOutlined /> Расчёт</span>,
            children: isMobile ? (
              loading ? (
                <div style={{ textAlign: 'center', padding: 24, color: 'var(--color-muted)' }}>Загрузка…</div>
              ) : visibleRows.length === 0 ? (
                <Empty description="Нет сотрудников или акт за период" />
              ) : (
                <SalaryCards>
                  {visibleRows.map((r) => (
                    <div className="salary-m-card" key={r.employee_id}>
                      <div className="sm-head">
                        <span className="sm-name">{shortName(r.full_name)}</span>
                        <Space size={4}>
                          <Tag color={ROLE_TAG_COLORS[r.role || ''] || 'default'}>{r.role_label}</Tag>
                          {r.external ? <Tag color="default">внешний</Tag> : null}
                        </Space>
                      </div>
                      <div className="sm-grid">
                        <div className="sm-cell">
                          <span className="sm-lbl">Оклад</span>
                          <span className="sm-val">{formatMoney(r.base_salary)}</span>
                        </div>
                        <div className="sm-cell">
                          <span className="sm-lbl">Процент</span>
                          <span className="sm-val">
                            {r.bonus_breakdown && r.bonus_breakdown.length > 0 ? (
                              <Popover
                                title="Расчёт процента"
                                content={
                                  <ul style={{ paddingLeft: 16, margin: 0 }}>
                                    {r.bonus_breakdown.map((b, i) => (
                                      <li key={i}>{b.label}: <b>{formatMoney(b.value)}</b></li>
                                    ))}
                                  </ul>
                                }
                              >
                                <span style={{ borderBottom: '1px dashed #aaa', cursor: 'help' }}>{formatMoney(r.bonus)}</span>
                              </Popover>
                            ) : (
                              formatMoney(r.bonus)
                            )}
                          </span>
                        </div>
                        <div className="sm-cell sm-total">
                          <span className="sm-lbl">Итого ЗП</span>
                          <span className="sm-val">{formatMoney(r.total)}</span>
                        </div>
                      </div>
                      <Button
                        block
                        size="small"
                        icon={<EditOutlined />}
                        disabled={!isManagerOrAbove}
                        onClick={() => openSalaryEditor(r)}
                      >
                        Настроить
                      </Button>
                    </div>
                  ))}
                </SalaryCards>
              )
            ) : (
              <TableCard>
                <Table<SalaryRow>
                  rowKey="employee_id"
                  columns={columns}
                  dataSource={visibleRows}
                  loading={loading}
                  pagination={false}
                  locale={{ emptyText: <Empty description="Нет сотрудников или акт за период" /> }}
                />
              </TableCard>
            ),
          },
          ...(!isLawyer ? [{
            key: 'shifts',
            label: 'Смены администраторов',
            children: (
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                <Space>
                  <Button type="primary" icon={<PlusOutlined />} disabled={!isManagerOrAbove} onClick={() => setShiftAddOpen(true)}>
                    Добавить смену
                  </Button>
                </Space>
                <TableCard>
                  <Table<ShiftRecord>
                    rowKey="id"
                    pagination={false}
                    dataSource={shifts}
                    locale={{ emptyText: <Empty description="Нет смен в периоде" /> }}
                    columns={[
                      { title: 'Дата', dataIndex: 'shift_date', width: 130, render: (v) => dayjs(v).format('DD.MM.YYYY') },
                      { title: 'Сотрудник', dataIndex: 'employee_full_name', render: (v) => shortName(v) },
                      { title: 'Должность', dataIndex: 'position' },
                      { title: 'Заметка', dataIndex: 'note' },
                      {
                        title: '', key: 'actions', width: 60,
                        render: (_, r) => (
                          <Popconfirm title="Удалить смену?" okText="Удалить" cancelText="Отмена" onConfirm={() => removeShift(r.id)}>
                            <Button size="small" danger icon={<DeleteOutlined />} disabled={!isManagerOrAbove} />
                          </Popconfirm>
                        ),
                      },
                    ]}
                  />
                </TableCard>
              </Space>
            ),
          }] : []),

        ]}
      />

      {/* Настройки расчёта (директор) */}
      <Modal
        title="Настройки расчёта зарплаты"
        open={settingsOpen}
        onCancel={() => setSettingsOpen(false)}
        onOk={saveSettings}
        okText="Сохранить"
        cancelText="Отмена"
        width={640}
        destroyOnClose
      >
        {settingsForm && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <SettingField label="Юрист — % от актов" suffix="%" value={settingsForm.lawyer_percent}
              onChange={(v) => setSettingsForm({ ...settingsForm, lawyer_percent: v })} />
            <SettingField label="Юрист — % при кассе ниже порога" suffix="%" value={settingsForm.lawyer_bonus_percent}
              onChange={(v) => setSettingsForm({ ...settingsForm, lawyer_bonus_percent: v })} />
            <SettingField label="Юрист — порог кассы, ₽" suffix="₽" value={settingsForm.lawyer_bonus_threshold}
              onChange={(v) => setSettingsForm({ ...settingsForm, lawyer_bonus_threshold: v })} />
            <div />
            <SettingField label="Руководитель — % от актов" suffix="%" value={settingsForm.okk_percent}
              onChange={(v) => setSettingsForm({ ...settingsForm, okk_percent: v })} />
            <SettingField label="Руководитель — % при кассе ниже порога" suffix="%" value={settingsForm.okk_bonus_percent}
              onChange={(v) => setSettingsForm({ ...settingsForm, okk_bonus_percent: v })} />
            <SettingField label="Руководитель — порог кассы, ₽" suffix="₽" value={settingsForm.okk_bonus_threshold}
              onChange={(v) => setSettingsForm({ ...settingsForm, okk_bonus_threshold: v })} />
            <div />
            <SettingField label="Менеджер — % от общей кассы" suffix="%" value={settingsForm.manager_office_percent}
              onChange={(v) => setSettingsForm({ ...settingsForm, manager_office_percent: v })} />
            <SettingField label="Представитель — % от актов" suffix="%" value={settingsForm.representative_percent}
              onChange={(v) => setSettingsForm({ ...settingsForm, representative_percent: v })} />
            <SettingField label="Админ ресепшена — оплата за смену" suffix="₽" value={settingsForm.admin_shift_rate}
              onChange={(v) => setSettingsForm({ ...settingsForm, admin_shift_rate: v })} />
            <SettingField label="Эксперт — оплата за пакет" suffix="₽" value={settingsForm.expert_per_doc_amount}
              onChange={(v) => setSettingsForm({ ...settingsForm, expert_per_doc_amount: v })} />
          </div>
        )}
      </Modal>

      {/* Настройка зарплаты сотрудника */}
      <Modal
        title={salaryEditEmp ? `Настройка: ${shortName(salaryEditEmp.full_name)} (${salaryEditEmp.role_label})` : 'Настройка'}
        open={!!salaryEditEmp}
        onCancel={() => { setSalaryEditEmp(null); setSalaryEditForm(null); }}
        onOk={saveEmployeeSalary}
        okText="Сохранить"
        cancelText="Отмена"
        destroyOnClose
        width={520}
      >
        {salaryEditForm && salaryEditEmp && (() => {
          const role = salaryEditEmp.role;
          const s = data?.settings;
          const hint = (text: string) => (
            <div style={{ color: 'var(--color-muted)', fontSize: 12 }}>{text}</div>
          );
          return (
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              {role === 'manager' ? (
                <>
                  <SettingField label="Оклад, ₽" suffix="₽" value={salaryEditForm.base_salary}
                    onChange={(v) => setSalaryEditForm({ ...salaryEditForm, base_salary: v })} />
                  <SettingField label="Процент от кассы офиса, %" suffix="%" value={salaryEditForm.custom_percent ?? ''}
                    onChange={(v) => setSalaryEditForm({ ...salaryEditForm, custom_percent: v })} allowEmpty />
                  {hint(`Оставьте пустым — офисное значение: ${s?.manager_office_percent ?? '—'}%`)}
                </>
              ) : role === 'okk' ? (
                <>
                  <SettingField label="Оклад, ₽" suffix="₽" value={salaryEditForm.base_salary}
                    onChange={(v) => setSalaryEditForm({ ...salaryEditForm, base_salary: v })} />
                  <SettingField label="Процент от актов, %" suffix="%" value={salaryEditForm.custom_percent ?? ''}
                    onChange={(v) => setSalaryEditForm({ ...salaryEditForm, custom_percent: v })} allowEmpty />
                  {hint(`Оставьте пустым — офисное значение: ${s?.okk_percent ?? '—'}%`)}
                </>
              ) : role === 'lawyer' ? (
                <>
                  <SettingField label="Оклад, ₽" suffix="₽" value={salaryEditForm.base_salary}
                    onChange={(v) => setSalaryEditForm({ ...salaryEditForm, base_salary: v })} />
                  <SettingField label="Процент от актов, %" suffix="%" value={salaryEditForm.custom_percent ?? ''}
                    onChange={(v) => setSalaryEditForm({ ...salaryEditForm, custom_percent: v })} allowEmpty />
                  {hint(`Оставьте пустым — офисное значение: ${s?.lawyer_percent ?? '—'}%`)}
                </>
              ) : role === 'representative' ? (
                <>
                  <SettingField label="Оклад, ₽" suffix="₽" value={salaryEditForm.base_salary}
                    onChange={(v) => setSalaryEditForm({ ...salaryEditForm, base_salary: v })} />
                  <SettingField label="Процент от актов, %" suffix="%" value={salaryEditForm.custom_percent ?? ''}
                    onChange={(v) => setSalaryEditForm({ ...salaryEditForm, custom_percent: v })} allowEmpty />
                  {hint(`Оставьте пустым — офисное значение: ${s?.representative_percent ?? '—'}%`)}
                </>
              ) : role === 'reception' ? (
                <>
                  <SettingField label="Стоимость смены, ₽" suffix="₽" value={salaryEditForm.custom_shift_rate ?? ''}
                    onChange={(v) => setSalaryEditForm({ ...salaryEditForm, custom_shift_rate: v })} allowEmpty />
                  {hint(`Оставьте пустым — офисное значение: ${s ? formatMoney(s.admin_shift_rate) : '—'} за смену`)}
                </>
              ) : role === 'expert' ? (
                <>
                  <SettingField label="Оклад, ₽" suffix="₽" value={salaryEditForm.base_salary}
                    onChange={(v) => setSalaryEditForm({ ...salaryEditForm, base_salary: v })} />
                  <SettingField label="Оплата за пакет документов, ₽" suffix="₽" value={salaryEditForm.custom_per_doc ?? ''}
                    onChange={(v) => setSalaryEditForm({ ...salaryEditForm, custom_per_doc: v })} allowEmpty />
                  {hint(`Оставьте пустым — офисное значение: ${s ? formatMoney(s.expert_per_doc_amount) : '—'} за пакет`)}
                </>
              ) : (
                <>
                  <SettingField label="Оклад, ₽" suffix="₽" value={salaryEditForm.base_salary}
                    onChange={(v) => setSalaryEditForm({ ...salaryEditForm, base_salary: v })} />
                  {hint('Роль не определена — задайте оклад вручную.')}
                </>
              )}
            </Space>
          );
        })()}
      </Modal>

      {/* Добавление смены */}
      <Modal
        title="Новая смена"
        open={shiftAddOpen}
        onCancel={() => setShiftAddOpen(false)}
        onOk={submitShift}
        okText="Сохранить"
        cancelText="Отмена"
        destroyOnClose
      >
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <div>
            <label style={{ display: 'block', marginBottom: 4 }}>Сотрудник *</label>
            <Select
              showSearch
              style={{ width: '100%' }}
              placeholder="Администратор ресепшена"
              value={shiftForm.employee_id}
              onChange={(v) => setShiftForm((p) => ({ ...p, employee_id: v }))}
              optionFilterProp="label"
              options={reception.map((e: any) => ({
                value: e.id,
                label: shortName([e.last_name, e.first_name, e.middle_name].filter(Boolean).join(' ')),
              }))}
              notFoundContent="Нет администраторов в офисе"
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 4 }}>Дата</label>
            <DatePicker
              value={shiftForm.shift_date}
              onChange={(d) => setShiftForm((p) => ({ ...p, shift_date: d || dayjs() }))}
              format="DD.MM.YYYY"
              style={{ width: '100%' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 4 }}>Заметка</label>
            <Input.TextArea
              rows={3}
              value={shiftForm.note}
              onChange={(e) => setShiftForm((p) => ({ ...p, note: e.target.value }))}
              placeholder="Дополнительная информация о смене"
              maxLength={500}
              showCount
            />
          </div>
        </Space>
      </Modal>
    </Page>
  );
};

const SettingField: React.FC<{
  label: string;
  value: number | string | null | undefined;
  suffix?: string;
  allowEmpty?: boolean;
  onChange: (v: any) => void;
}> = ({ label, value, suffix, allowEmpty, onChange }) => (
  <div>
    <label style={{ display: 'block', marginBottom: 4, fontSize: 13, color: 'var(--color-muted)' }}>{label}</label>
    <InputNumber
      style={{ width: '100%' }}
      value={value === '' || value === null || value === undefined ? (allowEmpty ? null : 0) : Number(value)}
      onChange={(v) => onChange(v === null ? '' : v)}
      addonAfter={suffix}
      step={suffix === '₽' ? 1000 : 0.5}
      min={0}
      formatter={(v) => `${v ?? ''}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
    />
  </div>
);

export default Salary;
