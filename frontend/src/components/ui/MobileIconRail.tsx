import React from 'react';
import { Briefcase, Users, Calendar, Wallet, MessageSquare, Receipt, BarChart3, ClipboardList, FileText, PhoneCall, MoreHorizontal } from 'lucide-react';
import './MobileIconRail.css';

interface NavItem { key: string; icon: React.ReactNode; label: string; }

const ICON_SIZE = 22;
const ICON_STROKE = 1.8;

const allItems: Record<string, NavItem> = {
  office: { key: 'Офис', icon: <Briefcase size={ICON_SIZE} strokeWidth={ICON_STROKE} />, label: 'Офис' },
  clients: { key: 'Клиенты', icon: <Users size={ICON_SIZE} strokeWidth={ICON_STROKE} />, label: 'Клиенты' },
  appointments: { key: 'Записи', icon: <Calendar size={ICON_SIZE} strokeWidth={ICON_STROKE} />, label: 'Записи' },
  revenue: { key: 'Приходы', icon: <BarChart3 size={ICON_SIZE} strokeWidth={ICON_STROKE} />, label: 'Приходы' },
  cases: { key: 'Мои дела', icon: <ClipboardList size={ICON_SIZE} strokeWidth={ICON_STROKE} />, label: 'Мои дела' },
  employees: { key: 'Сотрудники', icon: <Users size={ICON_SIZE} strokeWidth={ICON_STROKE} />, label: 'Сотрудники' },
  salary: { key: 'Зарплата', icon: <BarChart3 size={ICON_SIZE} strokeWidth={ICON_STROKE} />, label: 'Зарплата' },
  expenses: { key: 'Баланс', icon: <Receipt size={ICON_SIZE} strokeWidth={ICON_STROKE} />, label: 'Баланс' },
  cashRegister: { key: 'Касса', icon: <Wallet size={ICON_SIZE} strokeWidth={ICON_STROKE} />, label: 'Касса' },
  chat: { key: 'Чат', icon: <MessageSquare size={ICON_SIZE} strokeWidth={ICON_STROKE} />, label: 'Чат' },
  callcenter: { key: 'Колл-центр', icon: <PhoneCall size={ICON_SIZE} strokeWidth={ICON_STROKE} />, label: 'Колл-центр' },
  documents: { key: 'Договоры', icon: <FileText size={ICON_SIZE} strokeWidth={ICON_STROKE} />, label: 'Договоры' },
  acts: { key: 'Акты', icon: <FileText size={ICON_SIZE} strokeWidth={ICON_STROKE} />, label: 'Акты' },
};

function itemsByRole(role?: string): NavItem[] {
  const r = (role || '').toLowerCase(); const A = allItems;
  switch (r) {
    case 'administrator': case 'admin': return [A.appointments,A.revenue,A.cashRegister,A.clients,A.chat];
    case 'director': case 'manager': case 'okk': return [A.office,A.employees,A.clients,A.appointments,A.revenue,A.acts,A.salary,A.expenses,A.chat];
    case 'lawyer': return [A.clients,A.acts,A.salary];
    case 'expert': return [A.clients,A.employees];
    case 'representative': return [A.cases,A.acts];
    case 'cc_manager': return [A.callcenter,{key:'\u041f\u043e\u0434\u043a\u043b\u044e\u0447\u0435\u043d\u0438\u044f',icon:<PhoneCall size={ICON_SIZE} strokeWidth={ICON_STROKE}/>,label:'Подключения'},A.appointments,A.employees,A.chat];
    case 'cc_operator': return [A.callcenter,A.appointments,A.employees,A.chat];
    case 'reception': return [A.appointments,A.clients,A.chat];
    default: return [A.office,A.clients,A.chat];
  }
}

interface Props {
  userRole?: string;
  activeTab: string;
  onTabClick: (tab: string) => void;
  onMoreClick: () => void;
}

const MobileIconRail: React.FC<Props> = ({ userRole, activeTab, onTabClick, onMoreClick }) => {
  const items = itemsByRole(userRole).slice(0, 4);
  return (
    <aside className="mobile-icon-rail" role="navigation" aria-label="Главное меню">
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
      <button className="rail-btn rail-btn--more" onClick={onMoreClick} aria-label={'\u0415\u0449\u0451 \u0440\u0430\u0437\u0434\u0435\u043b\u044b'} title={'\u0415\u0449\u0451 \u0440\u0430\u0437\u0434\u0435\u043b\u044b'}><MoreHorizontal size={ICON_SIZE} strokeWidth={ICON_STROKE}/><span className="rail-label">{'\u0415\u0449\u0451'}</span></button>
    </aside>
  );
};

export default MobileIconRail;
