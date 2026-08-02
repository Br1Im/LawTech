import React, { useCallback, useEffect, useState } from 'react';
import styled from '@emotion/styled';
import { Button, Input, Popconfirm, Switch, Tag, message } from 'antd';
import leadApiKeysAPI, { type LeadApiKey } from '../shared/api/leadApiKeys';

const Section = styled.div`
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 20px 24px;
  margin-bottom: 20px;
`;

const Title = styled.h2`
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 4px;
  color: var(--color-text);
`;

const Description = styled.div`
  font-size: 13px;
  color: var(--color-text-secondary);
  margin-bottom: 16px;
`;

const KeyRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid var(--color-border);
  flex-wrap: wrap;
`;

const KeyInfo = styled.div`
  min-width: 0;
`;

const KeyLabel = styled.div`
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text);
`;

const KeyMeta = styled.div`
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-top: 2px;
`;

const KeyActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const AddForm = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 16px;

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

const FullRow = styled.div`
  grid-column: 1 / -1;
`;

const Hint = styled.div`
  font-size: 12px;
  color: var(--color-text-secondary);
`;

/**
 * Секция настроек: API-ключи лидов (Правовед / myleads.feedot.com).
 * Доступна только генеральному директору. Ключи привязаны к активному офису.
 */
const LeadApiKeysSettings: React.FC = () => {
  const [keys, setKeys] = useState<LeadApiKey[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [verifyingId, setVerifyingId] = useState<number | null>(null);
  const [label, setLabel] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setKeys(await leadApiKeysAPI.list());
    } catch (error) {
      console.error('Ошибка загрузки API-ключей лидов:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleAdd = async () => {
    if (!apiKey.trim() && !(email.trim() && password)) {
      message.warning('Укажите API-ключ, либо email и пароль аккаунта Правовед');
      return;
    }
    setSaving(true);
    try {
      const res = await leadApiKeysAPI.create({
        label: label.trim() || undefined,
        apiKey: apiKey.trim() || undefined,
        email: email.trim() || undefined,
        password: password || undefined,
      });
      message.success(res.message || 'Ключ добавлен');
      setLabel('');
      setApiKey('');
      setEmail('');
      setPassword('');
      await load();
    } catch (error: any) {
      message.error(error?.response?.data?.message || 'Не удалось добавить ключ');
    } finally {
      setSaving(false);
    }
  };

  const handleVerify = async (id: number) => {
    setVerifyingId(id);
    try {
      const res = await leadApiKeysAPI.verify(id);
      if (res.data?.ok) {
        message.success('Ключ работает: доступ к API Правовед подтверждён');
      } else {
        message.error(res.data?.message ? `Проверка не прошла: ${res.data.message}` : 'Проверка не прошла');
      }
      await load();
    } catch (error: any) {
      message.error(error?.response?.data?.message || 'Не удалось проверить ключ');
    } finally {
      setVerifyingId(null);
    }
  };

  const handleToggle = async (id: number, checked: boolean) => {
    try {
      await leadApiKeysAPI.toggle(id, checked);
      await load();
    } catch (error: any) {
      message.error(error?.response?.data?.message || 'Не удалось изменить статус ключа');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await leadApiKeysAPI.remove(id);
      message.success('Ключ удалён');
      await load();
    } catch (error: any) {
      message.error(error?.response?.data?.message || 'Не удалось удалить ключ');
    }
  };

  return (
    <Section>
      <Title>API-ключи лидов (Правовед)</Title>
      <Description>
        Ключи доступа к myleads.feedot.com для получения лидов в текущий офис. Можно добавить несколько
        ключей — по одному на каждую учётку Правовед.
      </Description>

      {loading && keys.length === 0 ? (
        <Hint>Загрузка…</Hint>
      ) : keys.length === 0 ? (
        <Hint>Ключи ещё не добавлены</Hint>
      ) : (
        keys.map((k) => (
          <KeyRow key={k.id}>
            <KeyInfo>
              <KeyLabel>
                {k.label || 'Без названия'} <Tag>{k.api_key_masked}</Tag>
              </KeyLabel>
              <KeyMeta>
                {k.last_verified_at
                  ? `Проверен: ${new Date(k.last_verified_at).toLocaleString('ru-RU')}`
                  : 'Ещё не проверялся'}
              </KeyMeta>
            </KeyInfo>
            <KeyActions>
              <Switch
                checked={Number(k.is_active) === 1}
                onChange={(checked) => handleToggle(k.id, checked)}
                checkedChildren="Вкл"
                unCheckedChildren="Выкл"
              />
              <Button size="small" loading={verifyingId === k.id} onClick={() => handleVerify(k.id)}>
                Проверить
              </Button>
              <Popconfirm
                title="Удалить ключ?"
                okText="Удалить"
                cancelText="Отмена"
                onConfirm={() => handleDelete(k.id)}
              >
                <Button size="small" danger>
                  Удалить
                </Button>
              </Popconfirm>
            </KeyActions>
          </KeyRow>
        ))
      )}

      <AddForm>
        <FullRow>
          <Input
            placeholder="Название (например, почта учётки Правовед)"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
        </FullRow>
        <FullRow>
          <Input.Password
            placeholder="API-ключ (access token) — если он у вас уже есть"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
        </FullRow>
        <FullRow>
          <Hint>…или получите ключ автоматически по логину и паролю аккаунта Правовед:</Hint>
        </FullRow>
        <Input placeholder="Email аккаунта" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input.Password
          placeholder="Пароль аккаунта"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <FullRow>
          <Button type="primary" loading={saving} onClick={handleAdd}>
            Добавить ключ
          </Button>
        </FullRow>
      </AddForm>
    </Section>
  );
};

export default LeadApiKeysSettings;
