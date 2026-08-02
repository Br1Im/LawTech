import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Users,
  FileText,
  TrendingUp,
  Wallet,
  UserCheck,
  Phone,
  Bot,
  Package,
  UsersRound,
  Clock,
  ChevronLeft,
  ChevronRight,
  LogOut,
  MessageSquare,
  Briefcase,
  Link2,

} from 'lucide-react';
import './Sidebar.css';
import apiClient from '../../shared/api/apiClient';

const ICON_SIZE = 20;
const ICON_STROKE = 1.5;

const RubleIcon = ({ size = 20, strokeWidth = 1.5 }: { size?: number; strokeWidth?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21V3h5a4 4 0 0 1 0 8H6" />
    <path d="M6 15h8" />
  </svg>
);

interface SidebarProps {
  collapsed: boolean;
  onCollapse: (collapsed: boolean) => void;
  activeTab: string;
  onTabClick: (tab: string) => void;
  isMobile: boolean;
  user?: {
    name?: string;
    surname?: string;
    email?: string;
    avatar?: string;
    role?: string;
  };
}

const getInitials = (name?: string, surname?: string) => {
  const s = (surname || '').charAt(0).toUpperCase();
  const n = (name || '').charAt(0).toUpperCase();
  return s + n || '?';
};

const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  onCollapse,
  activeTab,
  onTabClick,
  isMobile,
  user
}) => {
  const navigate = useNavigate();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [activeOfficeId, setActiveOfficeId] = useState<number | null>(null);

  useEffect(() => {
    const storedId = localStorage.getItem('activeOfficeId');
    if (storedId) setActiveOfficeId(Number(storedId));

    if (user?.role === 'director' || user?.role === 'cc_manager' || user?.role === 'cc_operator') {
      // Директор: загружаем все офисы
      apiClient.get('/offices/my')
        .then((res) => {
          const list = res.data?.data || [];
          if (list.length > 0 && !storedId) {
            setActiveOfficeId(list[0].id);
            localStorage.setItem('activeOfficeId', String(list[0].id));
          }
        })
        .catch(() => {});
    } else {
      // Мульти-офис: загружаем назначенные офисы (пустой если только 1)
      apiClient.get('/staff/my-offices')
        .then((res) => {
          const list = res.data?.offices || [];
          if (list.length > 0 && !storedId) {
            setActiveOfficeId(list[0].id);
            localStorage.setItem('activeOfficeId', String(list[0].id));
          }
        })
        .catch(() => {});
    }
  }, [user?.role]);

  const [chatUnread, setChatUnread] = useState<number>(0);

  useEffect(() => {
    let cancelled = false;
    const fetchUnread = async () => {
      if (!activeOfficeId) return;
      try {
        const res = await apiClient.get(`/offices/${activeOfficeId}/messages/unread`);
        const counts = res.data?.counts || res.data || {};
        const total = Object.values(counts).reduce((a: number, b: any) => a + Number(b || 0), 0);
        if (!cancelled) setChatUnread(total);
      } catch { /* skip */ }
    };
    fetchUnread();
    const t = setInterval(fetchUnread, 30000);
    return () => { cancelled = true; clearInterval(t); };
  }, [activeOfficeId]);

  const getMenuItemsByRole = (role?: string) => {
    const allItems = {
      office: { key: 'Офис', icon: <Building2 size={ICON_SIZE} strokeWidth={ICON_STROKE} />, label: 'Офис' },
      clients: { key: 'Клиенты', icon: <UsersRound size={ICON_SIZE} strokeWidth={ICON_STROKE} />, label: 'Клиенты' },
      acts: { key: 'Акты', icon: <FileText size={ICON_SIZE} strokeWidth={ICON_STROKE} />, label: 'Акты' },
      salary: { key: 'Зарплата', icon: <Wallet size={ICON_SIZE} strokeWidth={ICON_STROKE} />, label: 'Зарплата' },
      appointments: { key: 'Записи', icon: <Clock size={ICON_SIZE} strokeWidth={ICON_STROKE} />, label: 'Записи' },
      employees: { key: 'Сотрудники', icon: <Users size={ICON_SIZE} strokeWidth={ICON_STROKE} />, label: 'Сотрудники' },
      revenue: { key: 'Приходы', icon: <TrendingUp size={ICON_SIZE} strokeWidth={ICON_STROKE} />, label: 'Приходы' },
      expenses: { key: 'Баланс', icon: <RubleIcon size={ICON_SIZE} strokeWidth={ICON_STROKE} />, label: 'Баланс' },
      reception: { key: 'Чат', icon: <MessageSquare size={ICON_SIZE} strokeWidth={ICON_STROKE} />, label: 'Чат' },
      callCenter: { key: 'Колл-центр', icon: <Phone size={ICON_SIZE} strokeWidth={ICON_STROKE} />, label: 'Колл-центр' },
      connections: { key: 'Подключения', icon: <Link2 size={ICON_SIZE} strokeWidth={ICON_STROKE} />, label: 'Подключения' },
      materials: { key: 'Материалы', icon: <Package size={ICON_SIZE} strokeWidth={ICON_STROKE} />, label: 'Материалы' },
      ai: { key: 'AI инструменты', icon: <Bot size={ICON_SIZE} strokeWidth={ICON_STROKE} />, label: 'AI инструменты' },
      myCases: { key: 'Мои дела', icon: <Briefcase size={ICON_SIZE} strokeWidth={ICON_STROKE} />, label: 'Мои дела' },
      cashRegister: { key: 'Касса', icon: <Wallet size={ICON_SIZE} strokeWidth={ICON_STROKE} />, label: 'Касса' },
    };

    switch (role) {
      case 'representative':
        return [allItems.myCases, allItems.acts];

      case 'expert':
        return [allItems.clients, allItems.employees];

      case 'lawyer':
        return [allItems.office, allItems.clients, allItems.acts, allItems.salary];

      case 'administrator':
      case 'admin':
        return [allItems.appointments, allItems.revenue, allItems.cashRegister, allItems.clients, allItems.reception];

      case 'director':
        return [
          allItems.office,
          allItems.employees,
          allItems.clients,
          allItems.appointments,
          allItems.revenue,
          allItems.acts,
          allItems.salary,
          allItems.expenses,
          allItems.reception,
        ];

      case 'cc_manager':
        return [
          allItems.office,
          allItems.callCenter,
          allItems.connections,
          allItems.appointments,
          allItems.employees,
          allItems.reception,
        ];

      case 'cc_operator':
        return [
          allItems.office,
          allItems.callCenter,
          allItems.appointments,
          allItems.employees,
          allItems.reception,
        ];

      case 'manager':
      case 'okk':
        return [
          allItems.office,
          allItems.employees,
          allItems.clients,
          allItems.appointments,
          allItems.revenue,
          allItems.acts,
          allItems.salary,
          allItems.expenses,
          allItems.reception,
        ];

      default:
        return [
          allItems.office,
          allItems.employees,
          allItems.clients,
          allItems.appointments,
          allItems.revenue,
          allItems.acts,
          allItems.salary,
          allItems.expenses,
          allItems.reception,
        ];
    }
  };

  const menuItems = getMenuItemsByRole(user?.role);

  const handleProfileClick = () => {
    setIsUserMenuOpen(!isUserMenuOpen);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('activeOfficeId');
    navigate('/auth');
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };

    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isUserMenuOpen]);

  if (isMobile) {
    return null;
  }

  const initials = getInitials(user?.name, user?.surname);
  const fullName = user?.name || user?.surname
    ? `${user.surname || ''} ${user.name || ''}`.trim()
    : 'Пользователь';

  return (
    <div className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        {!collapsed && (
          <div className="sidebar-logo">
            <span className="logo-lockup">
              <span className="logo-text">Law<span className="logo-dot">.</span>Tech</span>
            </span>
          </div>
        )}
        <button
          className="collapse-button"
          onClick={() => onCollapse(!collapsed)}
          title={collapsed ? 'Развернуть' : 'Свернуть'}
        >
          {collapsed
            ? <ChevronRight size={14} strokeWidth={ICON_STROKE} />
            : <ChevronLeft size={14} strokeWidth={ICON_STROKE} />}
        </button>
      </div>


      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <button
            key={item.key}
            className={`sidebar-item ${activeTab === item.key ? 'active' : ''}`}
            onClick={() => onTabClick(item.key)}
            title={collapsed ? item.label : ''}
          >
            <span className="sidebar-icon" style={{ position: 'relative' }}>
              {item.icon}
              {item.key === 'Чат' && chatUnread > 0 && (
                <span
                  className="sidebar-badge"
                  style={{
                    position: 'absolute',
                    top: -4,
                    right: -6,
                    minWidth: 16,
                    height: 16,
                    padding: '0 4px',
                    borderRadius: 8,
                    background: '#EF4444',
                    color: 'white',
                    fontSize: 10,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    lineHeight: 1,
                  }}
                >{chatUnread > 99 ? '99+' : chatUnread}</span>
              )}
            </span>
            {!collapsed && <span className="sidebar-label">{item.label}</span>}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">


        <div className="sidebar-user-menu" ref={userMenuRef}>
          <button
            className="sidebar-item sidebar-profile"
            onClick={handleProfileClick}
            title={collapsed ? 'Профиль' : ''}
          >
            <div className="user-avatar-initials">{initials}</div>
            {!collapsed && (
              <div className="user-info">
                <span className="user-name">{fullName}</span>
                <span className="user-email">{user?.email || ''}</span>
              </div>
            )}
          </button>

          {isUserMenuOpen && !collapsed && (
            <div className="user-dropdown-menu">
              <button className="user-menu-item" onClick={handleLogout}>
                <LogOut size={14} strokeWidth={ICON_STROKE} className="user-menu-icon" />
                <span>Выйти</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
