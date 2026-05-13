import React, { useEffect, useState, useCallback } from 'react';
import { Table, Tag, Button, Modal, Select, message, Drawer, Descriptions, List, Typography, Space, Empty, Tabs } from 'antd';
import { useAuth } from '../shared/lib/hooks/useAuth';
import { buildApiUrl, getAuthHeaders } from '../shared/utils/apiUtils';

const { Text, Title } = Typography;

type CaseRow = {
  id: number;
  office_id: number;
  client_id: number | null;
  contract_id: number | null;
  title: string;
  category: string | null;
  status: string;
  workflow_status: 'with_manager' | 'assigned_to_expert' | 'in_progress' | 'done' | 'closed';
  description: string | null;
  manager_id: number | null;
  expert_id: number | null;
  created_at: string;
  client_name?: string;
  client_fio?: string;
  client_phone?: string;
  contract_title?: string;
  contract_goal?: string;
  contract_situation?: string;
  contract_deadline?: number;
  contract_amount?: string;
  employee_name?: string;
  expert_name?: string;
  manager_name?: string;
  contract_legal_cost_comp?: string;
  contract_moral_comp?: string;
  contract_payment_date?: string;
  contract_paid?: string;
  contract_type?: string;
  client_email?: string;
  client_acting_for?: string;
};

type RepresentationRow = {
  id: number;
  id_client: number | null;
  id_employee: number | null;
  contract_type: string;
  amount: string;
  paid_amount: string;
  status: string;
  title: string;
  description: string | null;
  customer_goal: string | null;
  situation_description: string | null;
  contract_date: string;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  client_name?: string;
  client_fio?: string;
  client_phone?: string;
  client_email?: string;
  employee_name?: string;
  actions_count?: number;
};

type Expert = { id: number; name: string };
type Representative = { id: number; first_name: string; last_name: string; email: string; cases_count: number };
type Material = {
  id: number; name: string; file_url?: string | null; category?: string | null; created_at: string;
};
type AdditionalTz = {
  id: number; document_type: string; description?: string | null; purpose?: string | null;
  status: string; deadline_days?: number | null; deadline_date?: string | null;
  expert_id?: number | null; expert_name?: string | null; created_at: string;
};

const WORKFLOW_LABEL: Record<string, { label: string; color: string }> = {
  with_manager: { label: 'Ожидает менеджера', color: 'orange' },
  assigned_to_expert: { label: 'Назначен эксперт', color: 'blue' },
  in_progress: { label: 'В работе', color: 'processing' },
  done: { label: 'Выполнено', color: 'green' },
  closed: { label: 'Закрыто', color: 'default' },
};

const Cases: React.FC = () => {
  const { user } = useAuth();
  const role = user?.role;
  const isManager = role === 'manager' || role === 'okk' || role === 'director' || role === 'admin';
  const isExpert = role === 'expert';

  // ---------- Cases (docs) state ----------
  const [rows, setRows] = useState<CaseRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [experts, setExperts] = useState<Expert[]>([]);

  const [assignFor, setAssignFor] = useState<CaseRow | null>(null);
  const [assignExpertId, setAssignExpertId] = useState<number | null>(null);

  const [detail, setDetail] = useState<CaseRow | null>(null);
  const [detailMaterials, setDetailMaterials] = useState<Material[]>([]);
  const [detailAdditional, setDetailAdditional] = useState<AdditionalTz[]>([]);

  // ---------- Representation state ----------
  const [repRows, setRepRows] = useState<RepresentationRow[]>([]);
  const [repLoading, setRepLoading] = useState(false);
  const [representatives, setRepresentatives] = useState<Representative[]>([]);
  const [assignRepFor, setAssignRepFor] = useState<RepresentationRow | null>(null);
  const [assignRepId, setAssignRepId] = useState<number | null>(null);
  const [repDetail, setRepDetail] = useState<RepresentationRow | null>(null);

  const authHeaders = () => getAuthHeaders();

  // ---------- Load cases (docs) ----------
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const endpoint = isExpert ? '/cases/my-assigned' : '/cases/inbox';
      const res = await fetch(buildApiUrl(endpoint), { headers: authHeaders() });
      const j = await res.json();
      setRows(Array.isArray(j?.data) ? j.data : []);
    } catch (e) {
      console.warn(e);
      message.error('Не удалось загрузить дела');
    } finally {
      setLoading(false);
    }
  }, [isExpert]);

  const loadExperts = useCallback(async () => {
    try {
      const officeId = user?.office_id;
      const url = officeId ? `/office/${officeId}/employees` : '/employees';
      const res = await fetch(buildApiUrl(url), { headers: authHeaders() });
      const j = await res.json();
      const arr = Array.isArray(j?.data) ? j.data : [];
      const list: Expert[] = arr
        .filter((e: any) => {
          const p = String(e.position || '').toLowerCase();
          const r = String(e.user_role || '').toLowerCase();
          return r === 'expert' || p.includes('экспер');
        })
        .map((e: any) => ({
          id: Number(e.id),
          name:
            [e.last_name, e.first_name, e.middle_name].filter(Boolean).join(' ') ||
            e.name ||
            `#${e.id}`,
        }));
      setExperts(list);
    } catch (e) {
      console.warn('experts load err', e);
    }
  }, [user?.office_id]);

  // ---------- Load representation contracts ----------
  const loadRepresentation = useCallback(async () => {
    if (!isManager) return;
    setRepLoading(true);
    try {
      const res = await fetch(buildApiUrl('/cases/inbox-representation'), { headers: authHeaders() });
      const j = await res.json();
      setRepRows(Array.isArray(j?.data) ? j.data : []);
    } catch (e) {
      console.warn(e);
      message.error('Не удалось загрузить дела на представление интересов');
    } finally {
      setRepLoading(false);
    }
  }, [isManager]);

  const loadRepresentatives = useCallback(async () => {
    if (!isManager) return;
    try {
      const res = await fetch(buildApiUrl('/representative/representatives'), { headers: authHeaders() });
      const j = await res.json();
      setRepresentatives(Array.isArray(j?.data) ? j.data : []);
    } catch (e) {
      console.warn('representatives load err', e);
    }
  }, [isManager]);

  useEffect(() => { load(); loadExperts(); loadRepresentation(); loadRepresentatives(); }, [load, loadExperts, loadRepresentation, loadRepresentatives]);

  // ---------- Case detail (docs) ----------
  const openDetail = async (row: CaseRow) => {
    setDetail(row);
    setDetailMaterials([]);
    setDetailAdditional([]);
    try {
      const res = await fetch(buildApiUrl(`/cases/${row.id}`), { headers: authHeaders() });
      const j = await res.json();
      if (j?.data) {
        setDetail({ ...row, ...j.data });
        setDetailMaterials(Array.isArray(j.data.materials) ? j.data.materials : []);
        setDetailAdditional(Array.isArray(j.data.additional_tz) ? j.data.additional_tz : []);
      }
    } catch (e) { console.warn(e); }
  };

  const submitAssign = async () => {
    if (!assignFor || !assignExpertId) { message.warning('Выберите эксперта'); return; }
    try {
      const res = await fetch(buildApiUrl(`/cases/${assignFor.id}/assign-expert`), {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ expert_id: assignExpertId }),
      });
      const j = await res.json();
      if (!res.ok || !j?.success) throw new Error(j?.message || 'assign failed');
      message.success('Эксперт назначен');
      setAssignFor(null);
      setAssignExpertId(null);
      load();
    } catch (e: any) {
      message.error(e?.message || 'Ошибка назначения');
    }
  };

  const updateWorkflow = async (row: CaseRow, status: CaseRow['workflow_status']) => {
    try {
      const res = await fetch(buildApiUrl(`/cases/${row.id}/workflow-status`), {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ workflow_status: status }),
      });
      const j = await res.json();
      if (!res.ok || !j?.success) throw new Error(j?.message || 'update failed');
      message.success('Статус обновлён');
      load();
      if (detail && detail.id === row.id) openDetail(row);
    } catch (e: any) { message.error(e?.message || 'Ошибка'); }
  };

  // ---------- Assign representative ----------
  const submitAssignRep = async () => {
    if (!assignRepFor || !assignRepId) { message.warning('Выберите представителя'); return; }
    try {
      const res = await fetch(buildApiUrl(`/cases/assign-representative/${assignRepFor.id}`), {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ representative_id: assignRepId }),
      });
      const j = await res.json();
      if (!res.ok || !j?.success) throw new Error(j?.message || 'assign failed');
      message.success('Представитель назначен');
      setAssignRepFor(null);
      setAssignRepId(null);
      loadRepresentation();
    } catch (e: any) {
      message.error(e?.message || 'Ошибка назначения');
    }
  };

  // ---------- Docs cases columns ----------
  const columns = [
    { title: '№', dataIndex: 'id', key: 'id', width: 60 },
    {
      title: 'Клиент',
      dataIndex: 'client_name',
      key: 'client_name',
      render: (_: any, r: CaseRow) => r.client_fio || r.client_name || '—',
    },
    { title: 'Телефон', dataIndex: 'client_phone', key: 'client_phone' },
    { title: 'Название дела', dataIndex: 'title', key: 'title' },
    {
      title: 'Статус',
      dataIndex: 'workflow_status',
      key: 'workflow_status',
      render: (s: string) => {
        const m = WORKFLOW_LABEL[s] || { label: s, color: 'default' };
        return <Tag color={m.color}>{m.label}</Tag>;
      },
    },
    {
      title: 'Эксперт',
      dataIndex: 'expert_name',
      key: 'expert_name',
      render: (v?: string) => v || <Text type="secondary">—</Text>,
    },
    {
      title: 'Дедлайн (дн)',
      dataIndex: 'contract_deadline',
      key: 'contract_deadline',
      render: (v?: number) => v || <Text type="secondary">—</Text>,
    },
    {
      title: 'Действия',
      key: 'actions',
      render: (_: any, row: CaseRow) => (
        <Space wrap>
          <Button size="small" onClick={() => openDetail(row)}>Открыть</Button>
          {isManager && row.workflow_status === 'with_manager' && (
            <Button size="small" type="primary" onClick={() => { setAssignFor(row); setAssignExpertId(null); }}>
              Назначить эксперта
            </Button>
          )}
          {isExpert && row.workflow_status === 'assigned_to_expert' && (
            <Button size="small" type="primary" onClick={() => updateWorkflow(row, 'in_progress')}>
              В работу
            </Button>
          )}
          {isExpert && row.workflow_status === 'in_progress' && (
            <Button size="small" onClick={() => updateWorkflow(row, 'done')}>
              Выполнено
            </Button>
          )}
        </Space>
      ),
    },
  ];

  // ---------- Representation columns ----------
  const repColumns = [
    { title: '№', dataIndex: 'id', key: 'id', width: 60 },
    {
      title: 'Клиент',
      key: 'client_name',
      render: (_: any, r: RepresentationRow) => r.client_fio || r.client_name || '—',
    },
    { title: 'Телефон', dataIndex: 'client_phone', key: 'client_phone' },
    { title: 'Договор', dataIndex: 'title', key: 'title' },
    {
      title: 'Сумма',
      dataIndex: 'amount',
      key: 'amount',
      render: (v: string) => v ? `${Number(v).toLocaleString('ru-RU')} ₽` : '—',
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      render: (s: string) => {
        const colorMap: Record<string, string> = { active: 'green', closed: 'default', pending: 'orange' };
        return <Tag color={colorMap[s] || 'default'}>{s === 'active' ? 'Активный' : s === 'closed' ? 'Закрыт' : s}</Tag>;
      },
    },
    {
      title: 'Представитель',
      dataIndex: 'employee_name',
      key: 'employee_name',
      render: (v?: string) => v && v.trim() ? v : <Text type="secondary">Не назначен</Text>,
    },
    {
      title: 'Действия',
      key: 'actions',
      render: (_: any, row: RepresentationRow) => (
        <Space wrap>
          <Button size="small" onClick={() => setRepDetail(row)}>Открыть</Button>
          {isManager && (
            <Button size="small" type="primary" onClick={() => { setAssignRepFor(row); setAssignRepId(null); }}>
              Назначить представителя
            </Button>
          )}
        </Space>
      ),
    },
  ];

  // ---------- Docs cases table ----------
  const renderDocsTab = () => (
    <>
      <Table
        rowKey="id"
        loading={loading}
        dataSource={rows}
        columns={columns as any}
        size="small"
        locale={{ emptyText: isExpert ? 'Нет назначенных дел' : 'Новых дел нет' }}
      />

      <Modal
        open={!!assignFor}
        title={`Назначить эксперта на дело #${assignFor?.id || ''}`}
        onCancel={() => { setAssignFor(null); setAssignExpertId(null); }}
        onOk={submitAssign}
        okText="Назначить"
        cancelText="Отмена"
      >
        <div style={{ marginBottom: 8 }}>
          <Text>Клиент: <b>{assignFor?.client_fio || assignFor?.client_name}</b></Text>
        </div>
        <Select
          style={{ width: '100%' }}
          placeholder="Выберите эксперта офиса"
          showSearch
          optionFilterProp="label"
          value={assignExpertId as any}
          onChange={(v) => setAssignExpertId(Number(v))}
          options={experts.map((e) => ({ value: e.id, label: e.name }))}
          notFoundContent={<Empty description="В офисе нет экспертов" />}
        />
      </Modal>

      <Drawer
        open={!!detail}
        width={640}
        onClose={() => setDetail(null)}
        title={detail ? `Дело #${detail.id} — ${detail.title}` : ''}
      >
        {detail && (
          <>
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="Статус">
                <Tag color={WORKFLOW_LABEL[detail.workflow_status]?.color}>
                  {WORKFLOW_LABEL[detail.workflow_status]?.label || detail.workflow_status}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Клиент">
                {detail.client_fio || detail.client_name || '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Телефон">{detail.client_phone || '—'}</Descriptions.Item>
              <Descriptions.Item label="В чьих интересах">
                {detail.client_acting_for || <Text type="secondary">—</Text>}
              </Descriptions.Item>
              <Descriptions.Item label="Договор">
                {detail.contract_title || '—'}
                {detail.contract_type === 'docs' && ' (документы)'}
                {detail.contract_type === 'court_rep' && ' (представительство)'}
              </Descriptions.Item>
              <Descriptions.Item label="Цель заказчика">
                {detail.contract_goal || <Text type="secondary">—</Text>}
              </Descriptions.Item>
              <Descriptions.Item label="Описание ситуации">
                {detail.contract_situation || <Text type="secondary">—</Text>}
              </Descriptions.Item>
              <Descriptions.Item label="Дедлайн эксперту (дн)">
                {detail.contract_deadline ?? <Text type="secondary">—</Text>}
              </Descriptions.Item>
              <Descriptions.Item label="Назначенный эксперт">
                {detail.expert_name || <Text type="secondary">—</Text>}
              </Descriptions.Item>
              <Descriptions.Item label="Менеджер">
                {detail.manager_name || <Text type="secondary">—</Text>}
              </Descriptions.Item>
              <Descriptions.Item label="Стоимость договора">
                {detail.contract_amount || '0'} ₽
              </Descriptions.Item>
              <Descriptions.Item label="Юр. расходы (план. возмещение)">
                {detail.contract_legal_cost_comp ?? <Text type="secondary">—</Text>}
              </Descriptions.Item>
              <Descriptions.Item label="Моральная компенсация (план.)">
                {detail.contract_moral_comp ?? <Text type="secondary">—</Text>}
              </Descriptions.Item>
              <Descriptions.Item label="Оплачено">
                {detail.contract_paid || '0'} ₽
              </Descriptions.Item>
              <Descriptions.Item label="Дата внесения оплаты">
                {detail.contract_payment_date
                  ? new Date(detail.contract_payment_date).toLocaleDateString('ru-RU')
                  : <Text type="secondary">—</Text>}
              </Descriptions.Item>
            </Descriptions>

            <Title level={5} style={{ marginTop: 16 }}>Материалы дела</Title>
            {detailMaterials.length === 0 ? (
              <Text type="secondary">Файлов пока нет</Text>
            ) : (
              <List
                size="small"
                dataSource={detailMaterials}
                renderItem={(m) => (
                  <List.Item
                    actions={m.file_url ? [
                      <a key="open" href={m.file_url} target="_blank" rel="noreferrer">Открыть</a>
                    ] : []}
                  >
                    <List.Item.Meta
                      title={m.name}
                      description={`${m.category || 'Документ'} • ${new Date(m.created_at).toLocaleDateString('ru-RU')}`}
                    />
                  </List.Item>
                )}
              />
            )}

            <Title level={5} style={{ marginTop: 16 }}>Доп. ТЗ по делу</Title>
            {detailAdditional.length === 0 ? (
              <Text type="secondary">Дополнительных ТЗ нет</Text>
            ) : (
              <List
                size="small"
                dataSource={detailAdditional}
                renderItem={(a) => (
                  <List.Item>
                    <List.Item.Meta
                      title={a.document_type}
                      description={
                        <>
                          <div>{a.purpose || a.description || ''}</div>
                          <div style={{ marginTop: 4 }}>
                            <Tag color={WORKFLOW_LABEL[a.status]?.color || 'default'}>
                              {WORKFLOW_LABEL[a.status]?.label || a.status}
                            </Tag>
                            {a.expert_name && <Text type="secondary">Эксперт: {a.expert_name}</Text>}
                          </div>
                        </>
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </>
        )}
      </Drawer>
    </>
  );

  // ---------- Representation tab ----------
  const renderRepresentationTab = () => (
    <>
      <Table
        rowKey="id"
        loading={repLoading}
        dataSource={repRows}
        columns={repColumns as any}
        size="small"
        locale={{ emptyText: 'Нет договоров на представление интересов' }}
      />

      <Modal
        open={!!assignRepFor}
        title={`Назначить представителя — договор #${assignRepFor?.id || ''}`}
        onCancel={() => { setAssignRepFor(null); setAssignRepId(null); }}
        onOk={submitAssignRep}
        okText="Назначить"
        cancelText="Отмена"
      >
        <div style={{ marginBottom: 8 }}>
          <Text>Клиент: <b>{assignRepFor?.client_fio || assignRepFor?.client_name}</b></Text>
        </div>
        <div style={{ marginBottom: 8 }}>
          <Text>Договор: <b>{assignRepFor?.title}</b></Text>
        </div>
        {assignRepFor?.employee_name && assignRepFor.employee_name.trim() && (
          <div style={{ marginBottom: 8 }}>
            <Text>Текущий представитель: <b>{assignRepFor.employee_name}</b></Text>
          </div>
        )}
        <Select
          style={{ width: '100%' }}
          placeholder="Выберите представителя"
          showSearch
          optionFilterProp="label"
          value={assignRepId as any}
          onChange={(v) => setAssignRepId(Number(v))}
          options={representatives.map((r) => ({
            value: r.id,
            label: `${r.last_name} ${r.first_name} (дел: ${r.cases_count})`,
          }))}
          notFoundContent={<Empty description="Нет доступных представителей" />}
        />
      </Modal>

      <Drawer
        open={!!repDetail}
        width={640}
        onClose={() => setRepDetail(null)}
        title={repDetail ? `Договор #${repDetail.id} — ${repDetail.title}` : ''}
      >
        {repDetail && (
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label="Тип">
              <Tag color="purple">Представление интересов</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Статус">
              <Tag color={repDetail.status === 'active' ? 'green' : 'default'}>
                {repDetail.status === 'active' ? 'Активный' : repDetail.status}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Клиент">
              {repDetail.client_fio || repDetail.client_name || '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Телефон">{repDetail.client_phone || '—'}</Descriptions.Item>
            <Descriptions.Item label="Email">{repDetail.client_email || '—'}</Descriptions.Item>
            <Descriptions.Item label="Цель заказчика">
              {repDetail.customer_goal || <Text type="secondary">—</Text>}
            </Descriptions.Item>
            <Descriptions.Item label="Описание ситуации">
              {repDetail.situation_description || <Text type="secondary">—</Text>}
            </Descriptions.Item>
            <Descriptions.Item label="Представитель">
              {repDetail.employee_name && repDetail.employee_name.trim()
                ? repDetail.employee_name
                : <Text type="secondary">Не назначен</Text>}
            </Descriptions.Item>
            <Descriptions.Item label="Сумма договора">
              {repDetail.amount ? `${Number(repDetail.amount).toLocaleString('ru-RU')} ₽` : '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Оплачено">
              {repDetail.paid_amount ? `${Number(repDetail.paid_amount).toLocaleString('ru-RU')} ₽` : '0 ₽'}
            </Descriptions.Item>
            <Descriptions.Item label="Дата договора">
              {repDetail.contract_date
                ? new Date(repDetail.contract_date).toLocaleDateString('ru-RU')
                : '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Процессуальных действий">
              {repDetail.actions_count ?? 0}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>
    </>
  );

  // ---------- Render ----------
  if (isExpert) {
    return (
      <div style={{ padding: 16 }}>
        <Title level={4} style={{ marginBottom: 12 }}>Мои дела</Title>
        {renderDocsTab()}
      </div>
    );
  }

  return (
    <div style={{ padding: 16 }}>
      <Title level={4} style={{ marginBottom: 12 }}>Входящие дела</Title>
      {isManager ? (
        <Tabs
          defaultActiveKey="docs"
          items={[
            {
              key: 'docs',
              label: `Документы (${rows.length})`,
              children: renderDocsTab(),
            },
            {
              key: 'representation',
              label: `Представление интересов (${repRows.length})`,
              children: renderRepresentationTab(),
            },
          ]}
        />
      ) : (
        renderDocsTab()
      )}
    </div>
  );
};

export default Cases;
