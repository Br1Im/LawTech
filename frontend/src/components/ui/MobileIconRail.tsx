import React from 'react';
import { Briefcase, Users, Calendar, Wallet, MessageSquare, Settings, Menu, Receipt, BarChart3, ClipboardList, FileText, Building2, PhoneCall } from 'lucide-react';
import './MobileIconRail.css';

interface NavItem { key: string; icon: React.ReactNode; label: string; }

const ICON_SIZE = 22;
const ICON_STROKE = 1.8;

const allItems: Record<string, NavItem> = {
  office: { key: 'Офис', icon: <Briefcase size={ICON_SIZE} strokeWidth={ICON_STROKE} />, label: 'Офис' },
  clients: { key: 'Клиенты', icon: <Users size={ICON_SIZE} strokeWidth={ICON_STROKE} />, label: 'Клиенты' },
  appointments: { key: 'Записи', icon: <Calendar size={ICON_SIZE} strokeWidth={ICON_STROKE} />, label: 'Записи' },
  cases: { key: 'Мои дела', icon: <ClipboardList size={ICON_SIZE} strokeWidth={ICON_STROKE} />, label: 'Дела' },
  employees: { key: 'Сотрудники', icon: <Users size={ICON_SIZE} strokeWidth={ICON_STROKE} />, label: 'Кадры' },
  salary: { key: 'Зарплата', icon: <BarChart3 size={ICON_SIZE} strokeWidth={ICON_STROKE} />, label: 'ЗП' },
  expenses: { key: 'Расходы', icon: <Receipt size={ICON_SIZE} strokeWidth={ICON_STROKE} />, label: 'Расходы' },
  cashRegister: { key: 'Касса', icon: <Wallet size={ICON_SIZE} strokeWidth={ICON_STROKE} />, label: 'Касса' },
  chat: { key: 'Чат', icon: <MessageSquare size={ICON_SIZE} strokeWidth={ICON_STROKE} />, label: 'Чат' },
  callcenter: { key: 'Колл-центр', icon: <PhoneCall size={ICON_SIZE} strokeWidth={ICON_STROKE} />, label: 'КЦ' },
  documents: { key: 'Договоры', icon: <FileText size={ICON_SIZE} strokeWidth={ICON_STROKE} />, label: 'Договоры' },
  acts: { key: 'Акты', icon: <FileText size={ICON_SIZE} strokeWidth={ICON_STROKE} />, label: 'Акты' },
};

function itemsByRole(role?: string): NavItem[] {
  const r = (role || '').toLowerCase();
  const A = allItems;
  switch (r) {
    case 'admin': return [A.office, A.clients, A.appointments, A.documents, A.cashRegister, A.chat];
    case 'director': case 'manager': return [A.office, A.clients, A.appointments, A.employees, A.salary, A.expenses, A.chat];
    case 'okk': return [A.office, A.clients, A.appointments, A.employees, A.chat];
    case 'lawyer': return [A.office, A.clients, A.acts, A.salary, A.chat];
    case 'expert': return [A.clients, A.documents, A.chat];
    case 'representative': return [A.cases, A.acts];
    case 'cc_operator': case 'cc_manager': return [A.callcenter, A.appointments, A.chat];
    case 'reception': return [A.appointments, A.clients, A.chat];
    default: return [A.office, A.clients, A.chat];
  }
}

interface Props {
  userRole?: string;
  activeTab: string;
  onTabClick: (tab: string) => void;
  onMoreClick: () => void;
}

const MobileIconRail: React.FC<Props> = ({ userRole, activeTab, onTabClick, onMoreClick }) => {
  const items = itemsByRole(userRole);
  return (
    <aside className="mobile-icon-rail" role="navigation" aria-label="Главное меню">
      <button className="rail-btn rail-burger" onClick={onMoreClick} aria-label="Открыть меню">
        <Menu size={ICON_SIZE} strokeWidth={ICON_STROKE} />
      </button>
      <div className="rail-divider" />
      {items.map(it => (
        <button
          key={it.key}
          className={`rail-btn ${activeTab === it.key ? 'active' : ''}`}
          onClick={() => onTabClick(it.key)}
          aria-label={it.key}
          title={it.key}
        >
          {it.icon}
          <span className="rail-label">{it.label}</span>
        </button>
      ))}
      <div className="rail-spacer" />
      <button className="rail-btn" onClick={() => onTabClick('Настройки')} aria-label="Настройки">
        <Settings size={ICON_SIZE} strokeWidth={ICON_STROKE} />
        <span className="rail-label">Опции</span>
      </button>
    </aside>
  );
};

export default MobileIconRail;
