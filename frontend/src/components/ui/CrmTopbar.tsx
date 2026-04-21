import React, { useState, useRef, useEffect } from 'react';
import styled from '@emotion/styled';
import { useNavigate } from 'react-router-dom';
import {
  SearchOutlined,
  BellOutlined,
  SunOutlined,
  MoonOutlined,
  UserOutlined,
  SettingOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { Badge, Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import { useThemeMode } from '../../shared/ui/AntThemeProvider';

interface CrmTopbarProps {
  title?: string;
  subtitle?: string;
  activeTab?: string;
  onSearch?: (query: string) => void;
  onNotificationClick?: () => void;
  unreadCount?: number;
  user?: {
    name?: string;
    surname?: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    avatar?: string;
    role?: string;
  };
  isMobile?: boolean;
  sidebarOffset?: number;
}

const Bar = styled.header<{ offset: number }>`
  position: sticky;
  top: 0;
  left: 0;
  right: 0;
  z-index: 90;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 20px;
  background: var(--glass-bg);
  backdrop-filter: blur(14px) saturate(140%);
  -webkit-backdrop-filter: blur(14px) saturate(140%);
  border-bottom: 1px solid var(--glass-border);
  transition: background 0.3s ease, border-color 0.3s ease;

  @media (max-width: 768px) {
    padding: 10px 14px;
  }
`;

const Heading = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex-shrink: 1;
`;

const Title = styled.h1`
  margin: 0;
  font-family: var(--font-display);
  font-size: 22px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--color-text);
  line-height: 1.1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  @media (max-width: 768px) {
    font-size: 17px;
  }
`;

const Subtitle = styled.span`
  font-size: 12.5px;
  color: var(--color-muted);

  @media (max-width: 768px) {
    display: none;
  }
`;

const ControlsRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
`;

const SearchWrap = styled.div<{ focused: boolean }>`
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  width: ${({ focused }) => (focused ? '340px' : '280px')};
  max-width: 40vw;
  border-radius: var(--radius-pill);
  background: var(--color-bg-alt);
  border: 1px solid ${({ focused }) => (focused ? 'var(--color-accent)' : 'var(--glass-border)')};
  transition: all 0.25s var(--ease-out);
  box-shadow: ${({ focused }) => (focused ? '0 0 0 3px rgba(192,155,70,0.12)' : 'none')};

  input {
    flex: 1;
    min-width: 0;
    border: none;
    outline: none;
    background: transparent;
    font-family: var(--font-sans);
    font-size: 13.5px;
    color: var(--color-text);
  }
  input::placeholder { color: var(--color-muted); }
  svg { color: var(--color-muted); }

  @media (max-width: 900px) {
    width: ${({ focused }) => (focused ? '260px' : '180px')};
  }
  @media (max-width: 640px) { display: none; }
`;

const IconBtn = styled.button`
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid var(--glass-border);
  background: var(--color-bg-alt);
  color: var(--color-text);
  cursor: pointer;
  transition: all 0.2s var(--ease-out);

  &:hover {
    border-color: var(--color-accent);
    color: var(--color-accent);
    transform: translateY(-1px);
    box-shadow: 0 6px 18px rgba(192,155,70,0.18);
  }
`;

const UserPill = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 6px 12px 6px 6px;
  border-radius: var(--radius-pill);
  border: 1px solid var(--glass-border);
  background: var(--color-bg-alt);
  color: var(--color-text);
  cursor: pointer;
  transition: all 0.2s var(--ease-out);

  &:hover {
    border-color: var(--color-accent);
    box-shadow: 0 6px 18px rgba(192,155,70,0.18);
  }
`;

const Avatar = styled.div`
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--color-accent), var(--color-accent-dark, #a67a2b));
  color: #fff;
  display: grid;
  place-items: center;
  font-size: 12px;
  font-weight: 600;
  overflow: hidden;

  img { width: 100%; height: 100%; object-fit: cover; }
`;

const UserMeta = styled.span`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  line-height: 1.1;
  max-width: 160px;
  font-size: 12.5px;
  strong { font-weight: 600; color: var(--color-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  em { font-style: normal; color: var(--color-muted); font-size: 11px; }
  @media (max-width: 900px) { display: none; }
`;

const roleLabel = (role?: string) => {
  switch (role) {
    case 'director': return 'Директор';
    case 'manager': return 'Менеджер';
    case 'lawyer': return 'Юрист';
    case 'expert': return 'Эксперт';
    case 'admin': return 'Администратор';
    case 'okk': return 'ОКК';
    default: return 'Сотрудник';
  }
};

const CrmTopbar: React.FC<CrmTopbarProps> = ({
  title,
  subtitle,
  activeTab,
  onSearch,
  onNotificationClick,
  unreadCount = 0,
  user,
  isMobile,
  sidebarOffset = 0,
}) => {
  const navigate = useNavigate();
  const { mode, toggle } = useThemeMode();
  const [focused, setFocused] = useState(false);
  const [query, setQuery] = useState('');
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = setTimeout(() => onSearch?.(query), 250);
    return () => clearTimeout(id);
  }, [query, onSearch]);

  const firstName = (user?.first_name || user?.name || '').trim();
  const lastName = (user?.last_name || user?.surname || '').trim();
  const initials = (firstName[0] || 'У') + (lastName[0] || '');

  const menu: MenuProps['items'] = [
    { key: 'profile', label: 'Профиль', icon: <UserOutlined />, onClick: () => navigate('/profile') },
    { key: 'settings', label: 'Настройки', icon: <SettingOutlined />, onClick: () => navigate('/settings') },
    { type: 'divider' },
    {
      key: 'logout',
      label: 'Выйти',
      icon: <LogoutOutlined />,
      danger: true,
      onClick: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/auth');
      },
    },
  ];

  return (
    <Bar offset={sidebarOffset}>
      <Heading>
        <Title>{title || activeTab || 'CRM'}</Title>
        <Subtitle>{subtitle || 'LawTech — рабочее пространство юриста'}</Subtitle>
      </Heading>
      <ControlsRow ref={wrapRef as any}>
        {!isMobile && (
          <SearchWrap focused={focused}>
            <SearchOutlined />
            <input
              type="text"
              placeholder="Поиск по клиентам, делам, документам…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
            />
          </SearchWrap>
        )}

        <IconBtn title={mode === 'dark' ? 'Светлая тема' : 'Тёмная тема'} onClick={toggle}>
          {mode === 'dark' ? <SunOutlined /> : <MoonOutlined />}
        </IconBtn>

        <IconBtn title="Уведомления" onClick={onNotificationClick}>
          <Badge count={unreadCount} size="small" offset={[-2, 2]}>
            <BellOutlined style={{ fontSize: 16 }} />
          </Badge>
        </IconBtn>

        <Dropdown menu={{ items: menu }} trigger={['click']} placement="bottomRight">
          <UserPill>
            <Avatar>
              {user?.avatar ? <img src={user.avatar} alt="" /> : initials.toUpperCase()}
            </Avatar>
            <UserMeta>
              <strong>{firstName || 'Пользователь'} {lastName}</strong>
              <em>{roleLabel(user?.role)}</em>
            </UserMeta>
          </UserPill>
        </Dropdown>
      </ControlsRow>
    </Bar>
  );
};

export default CrmTopbar;
