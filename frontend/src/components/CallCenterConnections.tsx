import React, { useCallback, useEffect, useState } from 'react';
import { Button, Card, Empty, List, message, Modal, Space, Spin, Tag, Typography } from 'antd';
import { CheckOutlined, CopyOutlined, LinkOutlined, ReloadOutlined, StopOutlined } from '@ant-design/icons';
import apiClient from '../shared/api/apiClient';

const { Title, Text } = Typography;

interface ConnectionData {
  center: {
    id: number;
    public_id: string;
    name: string;
    connection_code: string;
    code_rotated_at?: string | null;
  };
  offices: Array<{ office_id: number; office_name: string; address?: string; connected_at: string }>;
  requests: Array<{
    id: number;
    status: 'pending' | 'accepted' | 'rejected';
    office_name: string;
    address?: string;
    director_name?: string;
    created_at: string;
  }>;
  history: Array<{ id: number; action: string; office_name?: string; created_at: string }>;
  rotations: Array<{ rotated_at: string }>;
}

const actionLabels: Record<string, string> = {
  request_created: 'Получена заявка',
  connected: 'Офис подключён',
  request_rejected: 'Заявка отклонена',
  disconnected: 'Офис отключён',
};

const CallCenterConnections: React.FC = () => {
  const [data, setData] = useState<ConnectionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await apiClient.get('/call-center-connections/me');
      setData(response.data?.data || null);
    } catch (error: any) {
      message.error(error?.response?.data?.message || 'Не удалось загрузить подключения');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const copyCode = async () => {
    if (!data?.center.connection_code) return;
    await navigator.clipboard.writeText(data.center.connection_code);
    message.success('Код подключения скопирован');
  };

  const rotateCode = () => {
    Modal.confirm({
      title: 'Сгенерировать новый код?',
      content: 'Старый код сразу перестанет работать. Дата перевыпуска сохранится в истории.',
      okText: 'Сгенерировать',
      cancelText: 'Отмена',
      onOk: async () => {
        const response = await apiClient.post('/call-center-connections/me/rotate-code');
        setData((current) => current ? {
          ...current,
          center: { ...current.center, ...response.data.data },
          rotations: [{ rotated_at: new Date().toISOString() }, ...current.rotations],
        } : current);
        message.success('Новый код создан');
      },
    });
  };

  const respond = async (id: number, decision: 'accept' | 'reject') => {
    setBusyId(id);
    try {
      await apiClient.post(`/call-center-connections/requests/${id}/${decision}`);
      message.success(decision === 'accept' ? 'Офис подключён' : 'Заявка отклонена');
      await load();
    } catch (error: any) {
      message.error(error?.response?.data?.message || 'Не удалось обработать заявку');
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <div style={{ padding: 48, textAlign: 'center' }}><Spin size="large" /></div>;
  if (!data) return <Empty description="Колл-центр не найден" />;

  const pending = data.requests.filter((item) => item.status === 'pending');

  return (
    <div className="lt-page lt-page-connections" style={{ maxWidth: 1100, margin: '0 auto', padding: '8px 0 32px' }}>
      <Title level={2} style={{ marginTop: 0 }}>Подключения</Title>

      <Card style={{ marginBottom: 16 }}>
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <div>
            <Text type="secondary">Колл-центр</Text>
            <Title level={4} style={{ margin: '2px 0' }}>{data.center.name}</Title>
            <Text>{data.center.public_id}</Text>
          </div>
          <div>
            <Text type="secondary">Код подключения</Text>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginTop: 6 }}>
              <Text code copyable={false} style={{ fontSize: 18 }}>{data.center.connection_code}</Text>
              <Button icon={<CopyOutlined />} onClick={copyCode}>Скопировать</Button>
              <Button icon={<ReloadOutlined />} onClick={rotateCode}>Сгенерировать новый</Button>
            </div>
            {data.center.code_rotated_at && (
              <Text type="secondary">Последнее перевыпускание: {new Date(data.center.code_rotated_at).toLocaleString('ru-RU')}</Text>
            )}
          </div>
        </Space>
      </Card>

      <Card title={`Входящие заявки (${pending.length})`} style={{ marginBottom: 16 }}>
        {pending.length === 0 ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Новых заявок нет" /> : (
          <List
            dataSource={pending}
            renderItem={(item) => (
              <List.Item actions={[
                <Button key="accept" type="primary" icon={<CheckOutlined />} loading={busyId === item.id} onClick={() => respond(item.id, 'accept')}>Принять</Button>,
                <Button key="reject" danger icon={<StopOutlined />} disabled={busyId === item.id} onClick={() => respond(item.id, 'reject')}>Отклонить</Button>,
              ]}>
                <List.Item.Meta
                  avatar={<LinkOutlined style={{ fontSize: 22 }} />}
                  title={item.office_name}
                  description={[item.address, item.director_name && `Генеральный директор: ${item.director_name}`].filter(Boolean).join(' · ')}
                />
              </List.Item>
            )}
          />
        )}
      </Card>

      <Card title={`Подключённые офисы (${data.offices.length})`} style={{ marginBottom: 16 }}>
        <List
          locale={{ emptyText: 'Подключённых офисов пока нет' }}
          dataSource={data.offices}
          renderItem={(item) => (
            <List.Item extra={<Tag color="green">Подключён</Tag>}>
              <List.Item.Meta title={item.office_name} description={item.address || 'Адрес не указан'} />
            </List.Item>
          )}
        />
      </Card>

      <Card title="История подключений">
        <List
          locale={{ emptyText: 'История пока пуста' }}
          dataSource={data.history}
          renderItem={(item) => (
            <List.Item>
              <Text>{actionLabels[item.action] || item.action}{item.office_name ? `: ${item.office_name}` : ''}</Text>
              <Text type="secondary">{new Date(item.created_at).toLocaleString('ru-RU')}</Text>
            </List.Item>
          )}
        />
      </Card>
    </div>
  );
};

export default CallCenterConnections;
