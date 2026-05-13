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
  Settings,
  LogOut,
  ArrowLeftRight,
  MessageSquare,
  Briefcase,
  ChevronDown,
} from 'lucide-react';
import './Sidebar.css';
import apiClient from '../../shared/api/apiClient';

const ICON_SIZE = 20;
const ICON_STROKE = 1.5;

interface OfficeItem {
  id: number;
  name: string;
  address?: string;
}

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
  const [offices, setOffices] = useState<OfficeItem[]>([]);
  const [activeOfficeId, setActiveOfficeId] = useState<number | null>(null);
  const [isOfficeSwitcherOpen, setIsOfficeSwitcherOpen] = useState(false);
  const officeSwitcherRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user?.role === 'director') {
      const storedId = localStorage.getItem('activeOfficeId');
      if (storedId) setActiveOfficeId(Number(storedId));

      apiClient.get('/offices/my')
        .then((res) => {
          const list = res.data?.data || [];
          setOffices(list);
          if (list.length > 0 && !storedId) {
            setActiveOfficeId(list[0].id);
            localStorage.setItem('activeOfficeId', String(list[0].id));
          }
        })
        .catch(() => {});
    }
  }, [user?.role]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (officeSwitcherRef.current && !officeSwitcherRef.current.contains(e.target as Node)) {
        setIsOfficeSwitcherOpen(false);
      }
    };
    if (isOfficeSwitcherOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOfficeSwitcherOpen]);

  const handleSwitchOffice = async (officeId: number) => {
    try {
      const res = await apiClient.post('/offices/switch', { officeId });
      if (res.data?.token) {
        localStorage.setItem('token', res.data.token);
      }
      localStorage.setItem('activeOfficeId', String(officeId));
      setActiveOfficeId(officeId);
      setIsOfficeSwitcherOpen(false);
      window.location.reload();
    } catch (err) {
      console.error('Ошибка переключения офиса:', err);
    }
  };

  const activeOffice = offices.find(o => o.id === activeOfficeId);

  const getMenuItemsByRole = (role?: string) => {
    const allItems = {
      office: { key: 'Офис', icon: <Building2 size={ICON_SIZE} strokeWidth={ICON_STROKE} />, label: 'Офис' },
      clients: { key: 'Клиенты', icon: <UsersRound size={ICON_SIZE} strokeWidth={ICON_STROKE} />, label: 'Клиенты' },
      acts: { key: 'Акты', icon: <FileText size={ICON_SIZE} strokeWidth={ICON_STROKE} />, label: 'Акты' },
      salary: { key: 'Зарплата', icon: <Wallet size={ICON_SIZE} strokeWidth={ICON_STROKE} />, label: 'Зарплата' },
      appointments: { key: 'Записи', icon: <Clock size={ICON_SIZE} strokeWidth={ICON_STROKE} />, label: 'Записи' },
      employees: { key: 'Сотрудники', icon: <Users size={ICON_SIZE} strokeWidth={ICON_STROKE} />, label: 'Сотрудники' },
      revenue: { key: 'Приходы', icon: <TrendingUp size={ICON_SIZE} strokeWidth={ICON_STROKE} />, label: 'Приходы' },
      expenses: { key: 'Расходы', icon: <Wallet size={ICON_SIZE} strokeWidth={ICON_STROKE} />, label: 'Расходы' },
      reception: { key: 'Чат', icon: <MessageSquare size={ICON_SIZE} strokeWidth={ICON_STROKE} />, label: 'Чат' },
      callCenter: { key: 'Колл-центр', icon: <Phone size={ICON_SIZE} strokeWidth={ICON_STROKE} />, label: 'Колл-центр' },
      materials: { key: 'Материалы', icon: <Package size={ICON_SIZE} strokeWidth={ICON_STROKE} />, label: 'Материалы' },
      ai: { key: 'AI инструменты', icon: <Bot size={ICON_SIZE} strokeWidth={ICON_STROKE} />, label: 'AI инструменты' },
      myCases: { key: 'Мои дела', icon: <Briefcase size={ICON_SIZE} strokeWidth={ICON_STROKE} />, label: 'Мои дела' },
      cashRegister: { key: 'Касса', icon: <Wallet size={ICON_SIZE} strokeWidth={ICON_STROKE} />, label: 'Касса' },
    };

    switch (role) {
      case 'representative':
        return [allItems.myCases, allItems.acts];

      case 'expert':
        return [allItems.employees, allItems.clients];

      case 'lawyer':
        return [allItems.office, allItems.clients, allItems.acts, allItems.salary];

      case 'admin':
        return [allItems.clients, allItems.revenue, allItems.cashRegister, allItems.reception, allItems.appointments];

      case 'director':
        return [
          allItems.office,
          allItems.clients,
          allItems.acts,
          allItems.salary,
          allItems.appointments,
          allItems.employees,
          allItems.revenue,
          allItems.expenses,
          allItems.reception,
        ];

      case 'cc_manager':
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
          allItems.clients,
          allItems.acts,
          allItems.salary,
          allItems.appointments,
          allItems.employees,
          allItems.revenue,
          allItems.expenses,
          allItems.reception,
        ];

      default:
        return [
          allItems.office,
          allItems.clients,
          allItems.acts,
          allItems.salary,
          allItems.appointments,
          allItems.employees,
          allItems.revenue,
          allItems.expenses,
          allItems.reception,
        ];
    }
  };

  const menuItems = getMenuItemsByRole(user?.role);

  const handleProfileClick = () => {
    setIsUserMenuOpen(!isUserMenuOpen);
  };

  const handleSettingsClick = () => {
    navigate('/settings');
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
            <span className="logo-text">Law<span className="logo-dot">.</span>Tech</span>
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
            <span className="sidebar-icon">{item.icon}</span>
            {!collapsed && <span className="sidebar-label">{item.label}</span>}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button
          className="sidebar-item"
          onClick={handleSettingsClick}
          title={collapsed ? 'Настройки' : ''}
        >
          <span className="sidebar-icon"><Settings size={ICON_SIZE} strokeWidth={ICON_STROKE} /></span>
          {!collapsed && <span className="sidebar-label">Настройки</span>}
        </button>

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
