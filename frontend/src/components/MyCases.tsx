import React, { useEffect, useState, useCallback } from 'react';
import {
  Table, Tag, Button, Modal, Select, Input, DatePicker, message,
  Drawer, Descriptions, Timeline, Space, Card, Statistic, Form, Popconfirm
} from 'antd';
import { TableSkeleton, EmptyState } from './ui';
import type { ColumnsType } from 'antd/es/table';
import {
  FileTextOutlined, PlusOutlined, ReloadOutlined,
  CalendarOutlined, UserOutlined, PhoneOutlined,
  DollarOutlined, HistoryOutlined, DeleteOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuth } from '../shared/lib/hooks/useAuth';
import { buildApiUrl, getAuthHeaders } from '../shared/utils/apiUtils';

const { TextArea } = Input;

interface CourtCase {
  id: number;
  id_client: number;
  id_employee: number;
  contract_type: string;
  amount: string;
  paid_amount: string;
  additional_payment_amount: string | null;
  additional_payment_date: string | null;
  status: string;
  title: string;
  description: string | null;
  customer_goal: string | null;
  situation_description: string | null;
  contract_date: string;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  client_name: string;
  client_phone: string;
  client_email: string | null;
  employee_name: string;
  actions_count: number;
}

interface CaseAction {
  id: number;
  contract_id: number;
  user_id: number;
  action_type: string;
  description: string | null;
  action_date: string;
  created_at: string;
  user_name: string;
}

// Тип действия вводится вручную

const STATUS_COLORS: Record<string, string> = {
  active: 'green',
  pending: 'orange',
  completed: 'blue',
  cancelled: 'red',
  draft: 'default',
  registered: 'cyan',
};

const MyCases: React.FC = () => {
  const { user } = useAuth();
  const isRepresentative = user?.role === 'representative';
  const isSupervisor = ['director', 'manager', 'okk', 'admin'].includes(user?.role || '');

  const [cases, setCases] = useState<CourtCase[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCase, setSelectedCase] = useState<CourtCase | null>(null);
  const [actions, setActions] = useState<CaseAction[]>([]);
  const [actionsLoading, setActionsLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Add action modal
  const [addActionOpen, setAddActionOpen] = useState(false);
  const [actionForm] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const authHeaders = useCallback(() => getAuthHeaders(), []);

  const fetchCases = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(buildApiUrl('/representative/cases'), { headers: authHeaders() });
      const data = await res.json();
      if (data.success) {
        setCases(data.data);
      } else {
        message.error(data.message || 'Ошибка загрузки дел');
      }
    } catch {
      message.error('Не удалось загрузить дела');
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  const fetchActions = useCallback(async (contractId: number) => {
    setActionsLoading(true);
    try {
      const res = await fetch(buildApiUrl(`/representative/cases/${contractId}/actions`), { headers: authHeaders() });
      const data = await res.json();
      if (data.success) {
        setActions(data.data);
      }
    } catch {
      message.error('Не удалось загрузить действия');
    } finally {
      setActionsLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  const openCase = (record: CourtCase) => {
    setSelectedCase(record);
    setDrawerOpen(true);
    fetchActions(record.id);
  };

  const handleAddAction = async () => {
    try {
      const values = await actionForm.validateFields();
      setSubmitting(true);

      const res = await fetch(buildApiUrl(`/representative/cases/${selectedCase!.id}/actions`), {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          action_type: values.action_type,
          description: values.description,
          action_date: values.action_date.format('YYYY-MM-DD'),
        }),
      });

      const data = await res.json();
      if (data.success) {
        message.success('Действие добавлено');
        setAddActionOpen(false);
        actionForm.resetFields();
        fetchActions(selectedCase!.id);
        fetchCases(); // обновить счётчик
      } else {
        message.error(data.message || 'Ошибка');
      }
    } catch {
      message.error('Ошибка при добавлении действия');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAction = async (actionId: number) => {
    try {
      const res = await fetch(buildApiUrl(`/representative/actions/${actionId}`), {
        method: 'DELETE',
        headers: authHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        message.success('Действие удалено');
        fetchActions(selectedCase!.id);
        fetchCases();
      } else {
        message.error(data.message || 'Ошибка');
      }
    } catch {
      message.error('Ошибка при удалении');
    }
  };

  const columns: ColumnsType<CourtCase> = [
    {
      title: 'Клиент',
      key: 'client',
      render: (_: unknown, r: CourtCase) => (
        <div style={{ lineHeight: 1.25 }}>
          <div style={{ fontWeight: 500 }}>{r.client_name || '—'}</div>
          <div style={{ fontSize: 12, color: 'var(--color-muted, #888)' }}>{r.client_phone || ''}</div>
        </div>
      ),
      width: 220,
    },
    {
      title: 'Договор',
      key: 'contract',
      render: (_: unknown, r: CourtCase) => (
        <div style={{ lineHeight: 1.25 }}>
          <div style={{ fontVariantNumeric: 'tabular-nums', fontSize: 12, color: 'var(--color-muted, #888)' }}>
            ДОГ-{String(r.id).padStart(8, '0')}
          </div>
          <div style={{ fontWeight: 500 }}>{r.title || r.customer_goal || '—'}</div>
        </div>
      ),
      ellipsis: true,
    },
    {
      title: 'Финансы',
      key: 'money',
      render: (_: unknown, r: CourtCase) => {
        const a = Number(r.amount || 0);
        const p = Number(r.paid_amount || 0);
        const left = Math.max(0, a - p);
        const fmt = (n: number) => n.toLocaleString('ru-RU');
        return (
          <div style={{ lineHeight: 1.25, fontVariantNumeric: 'tabular-nums', fontSize: 12 }}>
            <div><span style={{ color: 'var(--color-muted, #888)' }}>Сумма:</span> {fmt(a)} ₽</div>
            <div><span style={{ color: 'var(--color-muted, #888)' }}>Внесено:</span> {fmt(p)} ₽</div>
            {left > 0 && (
              <div style={{ color: '#d97706' }}>
                Остаток: {fmt(left)} ₽
              </div>
            )}
          </div>
        );
      },
      width: 180,
    },
    {
      title: 'Сотрудник',
      dataIndex: 'employee_name',
      key: 'employee_name',
      render: (name: string) => <span style={{ fontSize: 13 }}>{name?.trim() || '—'}</span>,
      width: 140,
      responsive: ['lg'],
    },
    {
      title: 'Статус',
      key: 'status',
      render: (_: unknown, r: CourtCase) => (
        <Space direction="vertical" size={2} style={{ alignItems: 'flex-start' }}>
          <Tag color={STATUS_COLORS[r.status] || 'default'} style={{ margin: 0 }}>
            {r.status === 'active' ? 'Активно'
              : r.status === 'completed' ? 'Завершено'
              : r.status === 'cancelled' ? 'Отменено'
              : r.status === 'registered' ? 'Зарегистрирован'
              : r.status === 'pending' ? 'Ожидание'
              : r.status === 'draft' ? 'Черновик'
              : r.status}
          </Tag>
          <Tag icon={<HistoryOutlined />} color={r.actions_count > 0 ? 'blue' : 'default'} style={{ margin: 0, fontSize: 11 }}>
            {r.actions_count} действ.
          </Tag>
        </Space>
      ),
      width: 130,
    },
  ];

  const stats = {
    total: cases.length,
    active: cases.filter(c => c.status === 'active').length,
    totalActions: cases.reduce((sum, c) => sum + c.actions_count, 0),
  };

  return (
    <div style={{ padding: '0 4px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>
          <FileTextOutlined style={{ marginRight: 8 }} />
          {isRepresentative ? 'Мои дела' : 'Дела представителей'}
        </h2>
      </div>

      <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
        <Card size="small" style={{ flex: 1 }}>
          <Statistic title="Всего дел" value={stats.total} prefix={<FileTextOutlined />} />
        </Card>
        <Card size="small" style={{ flex: 1 }}>
          <Statistic title="Активных" value={stats.active} valueStyle={{ color: '#52c41a' }} />
        </Card>
        <Card size="small" style={{ flex: 1 }}>
          <Statistic title="Процессуальных действий" value={stats.totalActions} prefix={<HistoryOutlined />} />
        </Card>
      </div>

      {loading && cases.length === 0 ? (
        <TableSkeleton rows={6} cols={columns.length} />
      ) : (
        <Table
          columns={columns}
          dataSource={cases}
          rowKey="id"
          loading={loading}
          onRow={(record) => ({
            onClick: () => openCase(record),
            style: { cursor: 'pointer' },
          })}
          pagination={{ pageSize: 10, showTotal: (total) => `Всего: ${total}` }}
          locale={{
            emptyText: (
              <EmptyState
                title="Нет назначенных дел"
                description="Новые дела появятся здесь после назначения на вас."
              />
            ),
          }}
          size="middle"
        />
      )}

      {/* Drawer — детали дела */}
      <Drawer
        title={selectedCase ? `Дело: ${selectedCase.client_name || 'Без имени'}` : 'Дело'}
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setSelectedCase(null); }}
        width={640}
      >
        {selectedCase && (
          <>
            <Descriptions bordered size="small" column={1} style={{ marginBottom: 20 }}>
              <Descriptions.Item label={<><UserOutlined /> ФИО клиента</>}>
                {selectedCase.client_name || '—'}
              </Descriptions.Item>
              <Descriptions.Item label={<><PhoneOutlined /> Телефон</>}>
                {selectedCase.client_phone || '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Номер договора">
                ДОГ-{String(selectedCase.id).padStart(8, '0')}
              </Descriptions.Item>
              <Descriptions.Item label="Тема договора">
                {selectedCase.title || '—'}
              </Descriptions.Item>
              <Descriptions.Item label={<><DollarOutlined /> Общая сумма</>}>
                {selectedCase.amount ? `${Number(selectedCase.amount).toLocaleString('ru-RU')} ₽` : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Внесено">
                {selectedCase.paid_amount ? `${Number(selectedCase.paid_amount).toLocaleString('ru-RU')} ₽` : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Остаток к оплате">
                {selectedCase.amount && selectedCase.paid_amount
                  ? `${(Number(selectedCase.amount) - Number(selectedCase.paid_amount)).toLocaleString('ru-RU')} ₽`
                  : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Дата следующего платежа">
                {selectedCase.additional_payment_date
                  ? dayjs(selectedCase.additional_payment_date).format('DD.MM.YYYY')
                  : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Сотрудник (заключил договор)">
                {selectedCase.employee_name?.trim() || '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Цель обращения">
                {selectedCase.customer_goal || '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Описание ситуации">
                {selectedCase.situation_description || selectedCase.description || '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Дата договора">
                {selectedCase.contract_date || '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Статус">
                <Tag color={STATUS_COLORS[selectedCase.status] || 'default'}>
                  {selectedCase.status === 'active' ? 'Активно' : selectedCase.status}
                </Tag>
              </Descriptions.Item>
            </Descriptions>

            {/* Процессуальные действия */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>
                <HistoryOutlined style={{ marginRight: 6 }} />
                Процессуальные действия
              </h3>
              {(isRepresentative || isSupervisor) && (
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  size="small"
                  onClick={() => {
                    actionForm.setFieldsValue({ action_date: dayjs() });
                    setAddActionOpen(true);
                  }}
                >
                  Добавить
                </Button>
              )}
            </div>

            {actionsLoading ? (
              <div style={{ textAlign: 'center', padding: 20 }}>Загрузка...</div>
            ) : actions.length === 0 ? (
              <Empty description="Нет зафиксированных действий" />
            ) : (
              <Timeline
                items={actions.map(a => ({
                  color: 'blue',
                  children: (
                    <div key={a.id} style={{ position: 'relative' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <strong>{a.action_type}</strong>
                        <Space>
                          <span style={{ color: '#999', fontSize: 12 }}>
                            <CalendarOutlined /> {a.action_date}
                          </span>
                          {(a.user_id === user?.id || isSupervisor) && (
                            <Popconfirm
                              title="Удалить действие?"
                              onConfirm={() => handleDeleteAction(a.id)}
                            >
                              <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                            </Popconfirm>
                          )}
                        </Space>
                      </div>
                      {a.description && (
                        <div style={{ color: '#666', marginTop: 4 }}>{a.description}</div>
                      )}
                      <div style={{ color: '#bbb', fontSize: 11, marginTop: 2 }}>
                        {a.user_name?.trim()}
                      </div>
                    </div>
                  ),
                }))}
              />
            )}
          </>
        )}
      </Drawer>

      {/* Modal — добавить действие */}
      <Modal
        title="Добавить процессуальное действие"
        open={addActionOpen}
        onCancel={() => { setAddActionOpen(false); actionForm.resetFields(); }}
        onOk={handleAddAction}
        confirmLoading={submitting}
        okText="Добавить"
        cancelText="Отмена"
      >
        <Form form={actionForm} layout="vertical">
          <Form.Item
            name="action_type"
            label="Тип действия"
            rules={[{ required: true, message: 'Укажите тип действия' }]}
          >
            <Input placeholder="Например: Подал документы, Проведено заседание..." />
          </Form.Item>
          <Form.Item
            name="action_date"
            label="Дата"
            rules={[{ required: true, message: 'Укажите дату' }]}
          >
            <DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" />
          </Form.Item>
          <Form.Item name="description" label="Комментарий">
            <TextArea rows={3} placeholder="Описание действия..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default MyCases;
