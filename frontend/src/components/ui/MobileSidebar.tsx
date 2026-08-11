import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaBuilding,
  FaUsers,
  FaFileContract,

  FaChartLine,
  FaMoneyBillWave,
  FaRubleSign,
  FaUserTie,
  FaPhoneAlt,
  FaRobot,
  FaBox,
  FaUserFriends,
  FaClock,
  FaUser,
  FaSignOutAlt,
  FaComments,
  FaExchangeAlt,

} from 'react-icons/fa';

import './MobileSidebar.css';
import ThemeToggle from './ThemeToggle';
import { buildApiUrl, getAuthHeaders } from '../../shared/utils/apiUtils';

interface MobileSidebarProps {
  isOpen: boolean;
  isMobile: boolean;
  onClose: () => void;
  activeTab: string;
  onTabClick: (tab: string) => void;
  user?: {
    name?: string;
    surname?: string;
    first_name?: string;
    last_name?: string;
    middle_name?: string;
    email?: string;
    avatar?: string;
    role?: string;
  };
}

const MobileSidebar: React.FC<MobileSidebarProps> = ({
  isOpen,
  isMobile,
  onClose,
  activeTab,
  onTabClick,
  user
}) => {
  const navigate = useNavigate();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [offices, setOffices] = useState<{id: number; name: string}[]>([]);
  const [selectedOfficeId, setSelectedOfficeId] = useState<string>(() => localStorage.getItem('selected_office_id') || '');

  useEffect(() => {
    if (user?.role !== 'director') return;
    const fetchOffices = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(buildApiUrl('/offices/all'), {
          headers: getAuthHeaders(),
        });
        if (!res.ok) return;
        const data = await res.json();
        const list = data?.data || data || [];
        if (Array.isArray(list)) {
          setOffices(list.map((o: any) => ({ id: o.id, name: o.name || o.title || `Офис #${o.id}` })));
        }
      } catch { /* ignore */ }
    };
    fetchOffices();
  }, [user?.role]);

  const handleOfficeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedOfficeId(val);
    if (val) {
      localStorage.setItem('selected_office_id', val);
    } else {
      localStorage.removeItem('selected_office_id');
    }
    window.location.reload();
  };

  // Определяем пункты меню в зависимости от роли
  const getMenuItemsByRole = (role?: string) => {
    const allItems = {
      office: { key: 'Офис', icon: <FaBuilding />, label: 'Офис' },
      clients: { key: 'Клиенты', icon: <FaUserFriends />, label: 'Клиенты' },

      appointments: { key: 'Записи', icon: <FaClock />, label: 'Записи' },
      employees: { key: 'Сотрудники', icon: <FaUsers />, label: 'Сотрудники' },
      revenue: { key: 'Приходы', icon: <FaChartLine />, label: 'Приходы' },
      expenses: { key: 'Баланс', icon: <FaRubleSign />, label: 'Баланс' },
      reception: { key: 'Чат', icon: <FaUserTie />, label: 'Чат' },
      callCenter: { key: 'Колл-центр', icon: <FaPhoneAlt />, label: 'Колл-центр' },
      connections: { key: 'Подключения', icon: <FaPhoneAlt />, label: 'Подключения' },
      materials: { key: 'Материалы', icon: <FaBox />, label: 'Материалы' },
      ai: { key: 'AI инструменты', icon: <FaRobot />, label: 'AI инструменты' },
      officeChat: { key: 'Чат', icon: <FaComments />, label: 'Чат' },
      myCases: { key: 'Мои дела', icon: <FaFileContract />, label: 'Мои дела' },
      acts: { key: 'Акты', icon: <FaFileContract />, label: 'Акты' },
      cashRegister: { key: 'Касса', icon: <FaMoneyBillWave />, label: 'Касса' },
    };

    switch (role) {
      case 'representative':
        return [allItems.myCases, allItems.acts];
      case 'expert':
        return [allItems.employees, allItems.clients];
      case 'lawyer':
        return [allItems.office, allItems.clients];
      case 'administrator':
      case 'admin':
        return [allItems.appointments, allItems.revenue, allItems.cashRegister, allItems.clients, allItems.reception];
      case 'cc_manager':
        return [
          allItems.office,
          allItems.callCenter,
          allItems.connections,
          allItems.employees,
          allItems.reception,
        ];
      case 'cc_operator':
        // Колл-центр: Офис, Колл-центр, Сотрудники, Чат
        return [
          allItems.office,
          allItems.callCenter,
          allItems.employees,
          allItems.reception,
        ];
      case 'director':
        return [
          allItems.office, allItems.clients,
          allItems.appointments, allItems.employees, allItems.revenue, allItems.expenses,
          allItems.reception,
        ];
      case 'manager':
      case 'okk':
        return [
          allItems.office, allItems.clients,
          allItems.appointments, allItems.employees, allItems.revenue, allItems.expenses,
          allItems.reception,
        ];
      default:
        return [
          allItems.office, allItems.clients,
          allItems.appointments, allItems.employees, allItems.revenue, allItems.expenses,
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
    localStorage.removeItem('selected_office_id');
    navigate('/auth');
    onClose();
  };

  // Закрытие меню при клике вне его
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

  if (!isMobile) {
    return null;
  }
  let storedUser: any = {};
  try { storedUser = JSON.parse(localStorage.getItem('user') || '{}'); } catch { /* ignore malformed storage */ }
  const profileName = [user?.last_name || user?.surname || storedUser.last_name, user?.first_name || user?.name || storedUser.first_name, user?.middle_name || storedUser.middle_name].filter(Boolean).join(' ') || storedUser.login || user?.email?.split('@')[0] || 'Пользователь';
  const profileEmail = user?.email || storedUser.email || '';

  return (
    <>
      <div 
        className={`mobile-sidebar-overlay ${isOpen ? 'active' : ''}`}
        onClick={onClose}
      />
      <div className={`mobile-sidebar ${isOpen ? 'open' : ''}`}>
        <div className="mobile-sidebar-header">
          <div className="mobile-sidebar-logo">
            <span className="logo-lockup">
              <span className="logo-text">Law<span className="logo-dot">.</span>Tech</span>
            </span>
          </div>
          <button className="mobile-sidebar-close" onClick={onClose} aria-label="Закрыть меню">
            ✕
          </button>
        </div>

        {user?.role === 'director' && offices.length > 0 && (
          <div className="sidebar-office-switcher" style={{padding:'8px 12px',borderBottom:'1px solid var(--glass-border)'}}>
            <label className="office-switcher-label" style={{display:'flex',alignItems:'center',gap:'6px',fontSize:'11px',textTransform:'uppercase',letterSpacing:'0.5px',color:'var(--color-text-muted)',marginBottom:'6px',fontWeight:600}}><FaExchangeAlt /> Офис</label>
            <select value={selectedOfficeId} onChange={handleOfficeChange} className="office-switcher-select" style={{width:'100%',padding:'6px 8px',border:'1px solid var(--glass-border)',borderRadius:'6px',background:'var(--color-bg)',color:'var(--color-text)',fontSize:'13px',cursor:'pointer'}}>
              <option value="">Все офисы</option>
              {offices.map((o) => (
                <option key={o.id} value={String(o.id)}>{o.name}</option>
              ))}
            </select>
          </div>
        )}



        <nav className="mobile-sidebar-nav">
          {menuItems.map((item) => (
            <button
              key={item.key}
              className={`mobile-sidebar-item ${activeTab === item.key ? 'active' : ''}`}
              onClick={() => onTabClick(item.key)}
            >
              <span className="mobile-sidebar-icon">{item.icon}</span>
              <span className="mobile-sidebar-label">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="mobile-sidebar-footer">
          <div className="mobile-sidebar-user-menu" ref={userMenuRef}>
            <button
              className="mobile-sidebar-item mobile-sidebar-profile"
              onClick={handleProfileClick}
            >
              <span className="mobile-sidebar-icon">
                {user?.avatar ? (
                  <img src={user.avatar} alt="Avatar" className="user-avatar" />
                ) : (
                  <FaUser />
                )}
              </span>
              <div className="user-info">
                <span className="user-name">
                  {profileName}
                </span>
                <span className="user-email">{profileEmail}</span>
              </div>
            </button>
            
            {isUserMenuOpen && (
              <div className="mobile-user-dropdown-menu">
                <button className="mobile-user-menu-item" onClick={handleLogout}>
                  <FaSignOutAlt className="mobile-user-menu-icon" />
                  <span>Выйти</span>
                </button>
              </div>
            )}
          </div>
          <div className="mobile-sidebar-theme-toggle"><ThemeToggle /></div>
        </div>
      </div>
    </>
  );
};

export default MobileSidebar;
