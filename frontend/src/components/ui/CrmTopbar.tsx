import React, { useState, useRef, useEffect } from 'react';
import styled from '@emotion/styled';
import { keyframes } from '@emotion/react';
import { useNavigate } from 'react-router-dom';
import {
  SearchOutlined,
  BellOutlined,
  SunOutlined,
  MoonOutlined,
  UserOutlined,
  SettingOutlined,
  LogoutOutlined,
  MenuOutlined,
  CloseOutlined,
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
  onMenuClick?: () => void;
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

const pulse = keyframes`
  0%   { box-shadow: 0 0 0 0 rgba(255, 69, 58, 0.55); }
  70%  { box-shadow: 0 0 0 10px rgba(255, 69, 58, 0); }
  100% { box-shadow: 0 0 0 0 rgba(255, 69, 58, 0); }
`;

const slideDown = keyframes`
  from { opacity: 0; transform: translateY(-10px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const spin = keyframes`
  from { transform: rotate(0deg) scale(0.6); opacity: 0; }
  to   { transform: rotate(360deg) scale(1); opacity: 1; }
`;

const Bar = styled.header<{ offset: number; scrolled: boolean }>`
  position: sticky;
  top: 0;
  left: 0;
  right: 0;
  z-index: 90;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: ${({ scrolled }) => (scrolled ? '10px 20px' : '14px 20px')};
  background: var(--glass-bg);
  backdrop-filter: blur(${({ scrolled }) => (scrolled ? '18px' : '14px')}) saturate(140%);
  -webkit-backdrop-filter: blur(${({ scrolled }) => (scrolled ? '18px' : '14px')}) saturate(140%);
  border-bottom: 1px solid var(--glass-border);
  box-shadow: ${({ scrolled }) => (scrolled ? '0 8px 24px rgba(15,23,42,0.06)' : 'none')};
  transition: padding 0.3s var(--ease-out), background 0.3s var(--ease-out),
              border-color 0.3s var(--ease-out), box-shadow 0.3s var(--ease-out),
              backdrop-filter 0.3s var(--ease-out);
  animation: ${slideDown} 0.4s var(--ease-out);

  @media (max-width: 768px) {
    padding: 10px 14px;
    gap: 10px;
  }
`;

const MenuBtn = styled.button`
  display: none;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 10px;
  border: 1px solid var(--glass-border);
  background: var(--color-bg-alt);
  color: var(--color-text);
  cursor: pointer;
  transition: all 0.2s var(--ease-out);
  flex-shrink: 0;

  &:hover {
    border-color: var(--color-accent);
    color: var(--color-accent);
  }

  @media (max-width: 900px) { display: inline-flex; }
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
  width: ${({ focused }) => (focused ? '360px' : '280px')};
  max-width: 42vw;
  border-radius: var(--radius-pill);
  background: var(--color-bg-alt);
  border: 1px solid ${({ focused }) => (focused ? 'var(--color-accent)' : 'var(--glass-border)')};
  transition: width 0.3s var(--ease-out), border-color 0.25s var(--ease-out),
              box-shadow 0.25s var(--ease-out), background 0.25s var(--ease-out);
  box-shadow: ${({ focused }) => (focused ? '0 0 0 4px rgba(192,155,70,0.14)' : 'none')};

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
  svg { color: ${({ focused }) => (focused ? 'var(--color-accent)' : 'var(--color-muted)')}; transition: color 0.2s var(--ease-out); }

  @media (max-width: 900px) {
    width: ${({ focused }) => (focused ? '240px' : '180px')};
  }
  @media (max-width: 640px) { display: none; }
`;

const MobileSearchBar = styled.div`
  position: absolute;
  left: 0;
  right: 0;
  top: 100%;
  padding: 10px 14px 14px;
  background: var(--glass-bg);
  backdrop-filter: blur(16px) saturate(140%);
  -webkit-backdrop-filter: blur(16px) saturate(140%);
  border-bottom: 1px solid var(--glass-border);
  animation: ${slideDown} 0.25s var(--ease-out);
  display: none;

  &.open { display: block; }

  input {
    width: 100%;
    padding: 12px 16px;
    border-radius: var(--radius-pill);
    border: 1px solid var(--color-accent);
    background: var(--color-bg-alt);
    color: var(--color-text);
    font-size: 14px;
    outline: none;
    box-shadow: 0 0 0 4px rgba(192,155,70,0.14);
  }
`;

const IconBtn = styled.button<{ pulsing?: boolean }>`
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
  overflow: visible;

  &:hover {
    border-color: var(--color-accent);
    color: var(--color-accent);
    transform: translateY(-1px);
    box-shadow: 0 6px 18px rgba(192,155,70,0.18);
  }

  &:active { transform: translateY(0) scale(0.97); }

  ${({ pulsing }) => pulsing && `
    &::after {
      content: '';
      position: absolute;
      inset: 4px;
      border-radius: 50%;
      animation: ${pulse.name} 2s ease-out infinite;
      pointer-events: none;
    }
  `}

  .theme-icon {
    display: inline-flex;
    animation: ${spin} 0.45s var(--ease-out);
  }

  @media (max-width: 768px) {
    width: 36px;
    height: 36px;
  }
`;

const MobileSearchBtn = styled(IconBtn)`
  display: none;
  @media (max-width: 640px) { display: inline-flex; }
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
  onMenuClick,
  unreadCount = 0,
  user,
  isMobile,
  sidebarOffset = 0,
}) => {
  const navigate = useNavigate();
  const { mode, toggle } = useThemeMode();
  const [focused, setFocused] = useState(false);
  const [query, setQuery] = useState('');
  const [scrolled, setScrolled] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = setTimeout(() => onSearch?.(query), 250);
    return () => clearTimeout(id);
  }, [query, onSearch]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

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
    <Bar offset={sidebarOffset} scrolled={scrolled}>
      {onMenuClick && (
        <MenuBtn onClick={onMenuClick} aria-label="Меню">
          <MenuOutlined />
        </MenuBtn>
      )}
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

        <MobileSearchBtn
          title="Поиск"
          onClick={() => setMobileSearchOpen((v) => !v)}
        >
          {mobileSearchOpen ? <CloseOutlined /> : <SearchOutlined />}
        </MobileSearchBtn>

        <IconBtn title={mode === 'dark' ? 'Светлая тема' : 'Тёмная тема'} onClick={toggle}>
          <span key={mode} className="theme-icon">
            {mode === 'dark' ? <SunOutlined /> : <MoonOutlined />}
          </span>
        </IconBtn>

        <IconBtn title="Уведомления" onClick={onNotificationClick} pulsing={unreadCount > 0}>
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

      <MobileSearchBar className={mobileSearchOpen ? 'open' : ''}>
        <input
          type="text"
          placeholder="Поиск…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus={mobileSearchOpen}
        />
      </MobileSearchBar>
    </Bar>
  );
};

export default CrmTopbar;
