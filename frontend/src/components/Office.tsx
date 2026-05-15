import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import "./OfficeContent.css";
import "./OfficeAnimated.css";
import "./OfficeMobile.css";
import "./OfficePolish.css";
import StatCard from "./StatCard";
import { FaUsers, FaChartLine, FaCalendarAlt, FaBuilding, FaTimes, FaArrowRight, FaEdit, FaMapMarkerAlt, FaStar, FaRegStar, FaEllipsisH, FaPlus } from "react-icons/fa";
import { GrAdd } from "react-icons/gr";
import { Modal, Form, Input, Button, message } from "antd";
import { buildApiUrl, getAuthHeaders } from "../shared/utils/apiUtils";
import { useOffice } from "../shared/contexts/OfficeContext";
import { officeAPI } from "../shared/api/office";
import { useAuth } from "../shared/lib/hooks/useAuth";
import { apiInstance } from '../shared/api/instance';

// Максимальное количество офисов, которое можно создать
const MAX_OFFICES = 3;

interface Employee {
  id: string;
  surname: string;
  name: string;
  middle_name: string;
  position: string;
  dailyContracts: number;
  totalRevenue14Days: number;
  periodRevenue: number;
  phone: string;
  pastRevenue: { [key: string]: number };
  closeRate: number;
}

interface Office {
  id: string;
  title: string;
  description: string;
  revenue: number;
  orders: number;
  employees: Employee[];
  data: number[];
  address?: string;
  employee_count?: number;
  work_phone?: string | null;
  work_phone2?: string | null;
  contact_phone?: string;
  website?: string;
  previousRevenue?: number;
  previousVisits?: number;
  chartData?: {
    pie: Array<{key: string, value: number, label: string}>;
    bar: Array<{key: string, value: number, label: string}>;
    line: Array<{key: string, value: number, label: string}>;
  };
  // Поля для ИП
  ip_surname?: string;
  ip_name?: string;
  ip_middle_name?: string;
  // Поля для ИНН и ОГРН
  inn?: string;
  ogrn?: string;
}

type PeriodType = "day" | "yesterday" | "week" | "2weeks" | "month" | "custom";

interface DashboardData {
  period: { label: string; from: string; to: string; today: string };
  fact: { day: number; period: number };
  plan: {
    id: number;
    day: number; // applied for today (weekday or weekend)
    day_weekday: number;
    day_weekend: number;
    day_kind: 'weekday' | 'weekend';
    period: number;
    period_start: string;
    period_end: string;
  } | null;
  lawyers_cash: Array<{ id: number; full_name: string; today: number; period: number }>;
}

// Функция для расчета процентного изменения
const calculatePercentageChange = (current: number, previous: number): { percentage: string | null; isIncrease: boolean | null } => {
  const cur = Number(current) || 0;
  const prev = Number(previous) || 0;
  if (prev === 0) return { percentage: null, isIncrease: null };
  const change = ((cur - prev) / prev) * 100;
  if (Math.abs(change) < 0.05) return { percentage: null, isIncrease: null };
  return {
    percentage: Math.abs(change).toFixed(1),
    isIncrease: change > 0
  };
};

const Office = () => {
  const { user: authUser } = useAuth();
  const userRole = authUser?.role || '';
  // Менеджер привязан к офису директором — не может создавать/добавлять офисы
  const canManageOffices = !['manager'].includes(userRole);

  const [offices, setOffices] = useState<Office[]>([]);
  const { selectedOffice: officeFromContext, setSelectedOffice: setSelectedOfficeContext } = useOffice();
  const [selectedOffice, setSelectedOffice] = useState<Office | null>(null);
  const [hasError, setHasError] = useState(false);
  const [retryCounter, setRetryCounter] = useState(0);
  const [stats, setStats] = useState({ 
    visits: 0, 
    orders: 0, 
    revenue: 0, 
    pending: 0,
    visitsChange: { percentage: null as string | null, isIncrease: null as boolean | null },
    revenueChange: { percentage: null as string | null, isIncrease: null as boolean | null }
  });
  
  // ВРЕМЕННО ОТКЛЮЧЕНО: Обновляем данные из контекста
  // useEffect(() => {
  //   if (officeFromContext && officeFromContext !== null && Object.keys(officeFromContext).length > 0) {
  //     console.log("📥 OfficeContext обновляет данные офиса:", officeFromContext);
  //     // Проверяем, что это действительно офис с данными
  //     if ((officeFromContext as any).id) {
  //       setSelectedOffice(officeFromContext as unknown as SetStateAction<Office | null>);
  //     }
  //   }
  // }, [officeFromContext]);
  const [period, setPeriod] = useState<PeriodType>("day");
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [showRevenueModal, setShowRevenueModal] = useState(false);
  const [showOfficeInfoModal, setShowOfficeInfoModal] = useState(false);
  const [selectedLawyerId, setSelectedLawyerId] = useState<string | null>(null);
  const [contracts, setContracts] = useState<Array<{ id: number; id_employee: number; status: string; title: string; amount?: number | string }>>([]);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [customFrom, setCustomFrom] = useState<string>(() => {
    const d = new Date(); d.setDate(d.getDate() - 13); return d.toISOString().slice(0, 10);
  });
  const [customTo, setCustomTo] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [planForm, setPlanForm] = useState<{ dayWeekday: string; dayWeekend: string; period: string; from: string; to: string }>({ dayWeekday: '', dayWeekend: '', period: '', from: '', to: '' });
  const [planSaving, setPlanSaving] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);
  const [form] = Form.useForm();
  const [addForm] = Form.useForm();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [officeRevenueData, setOfficeRevenueData] = useState<{ labels: string[], offices: { id: string, name: string, revenue: number[] }[] }>({
    labels: [],
    offices: []
  });
  
  // Consultation stats
  interface ConsultationStat {
    id: number;
    name: string;
    role: string;
    total_consultations: number;
    contracts_signed: number;
    contracts_not_signed: number;
    pending: number;
    conversion: number;
  }
  const [consultationStats, setConsultationStats] = useState<ConsultationStat[]>([]);

  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const dropdownButtonRef = useRef<HTMLDivElement>(null);
  const dropdownContentRef = useRef<HTMLDivElement>(null);
  
  // Проверка, достигнут ли лимит офисов
  const isOfficeLimit = offices.length >= MAX_OFFICES;

  // Закрытие выпадающего списка при клике вне его
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!showPeriodDropdown) return;
      const target = event.target as Node;
      const insideButton = dropdownButtonRef.current?.contains(target);
      const insideContent = dropdownContentRef.current?.contains(target);
      if (!insideButton && !insideContent) {
        setShowPeriodDropdown(false);
      }
    };

    if (showPeriodDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPeriodDropdown]);

  // Подписка на события синхронизации между вкладками
  // useEffect(() => {
  //   const unsubscribe = subscribe((event: any) => {
  //     if (event.type === 'client_added') {
  //       // Обновляем статистику при добавлении клиента
  //       setStats(prev => ({
  //         ...prev,
  //         visits: prev.visits + 1
  //       }));
  //     } else if (event.type === 'stats_updated') {
  //       // Обновляем статистику при изменении
  //       setStats(prev => ({
  //         ...prev,
  //         visits: prev.visits + (event.data.visits || 0),
  //         revenue: prev.revenue + (event.data.revenue || 0),
  //         orders: prev.orders + (event.data.orders || 0)
  //       }));
  //     }
  //   });

  //   return unsubscribe;
  // }, [subscribe]);

  // Синхронизация статистики с контекстом офиса
  // useEffect(() => {
  //   if (officeStats) {
  //     setStats(prev => ({
  //       ...prev,
  //       visits: officeStats.visits,
  //       revenue: officeStats.revenue,
  //       orders: officeStats.orders
      //     }));
  //   }
  // }, [officeStats]);

  useEffect(() => {
    const fetchOffices = async () => {
      try {
        // Используем правильный API клиент с автоматической авторизацией и передаем текущий период
        const data = await officeAPI.getAll(period);
        
        // Проверяем, что данные существуют и являются массивом
        if (!data || !Array.isArray(data)) {
          console.error('Ошибка при получении офисов: данные не являются массивом');
          message.error('Ошибка при получении офисов, загружаю мок-данные');
          return; // Выходим из функции, чтобы использовать мок-данные
        }
        
        const transformedOffices = data.map((office: {
          id: string;
          name?: string;
          address?: string;
          employees?: any[];
          stats?: {
            visits: number;
            orders: number;
            revenue: number;
            pending: number;
          };
          chartData?: {
            pie: Array<{key: string, value: number, label: string}>;
            bar: Array<{key: string, value: number, label: string}>;
            line: Array<{key: string, value: number, label: string}>;
          };
          contact_phone?: string | null;
          website?: string | null;
        }) => {
          // Трансформируем данные сотрудников
          const transformedEmployees = (office.employees || []).map((emp: any) => ({
            id: emp.id,
            surname: emp.last_name || '',
            name: emp.first_name || '',
            middle_name: '',
            position: emp.position || 'Сотрудник',
            phone: emp.phone || '',
            totalRevenue14Days: emp.revenue || 0,
            periodRevenue: emp.revenue || 0,
            dailyContracts: emp.orders || 0,
            closeRate: 0
          }));
          
          return {
            id: office.id,
            title: office.name || "Без названия",
            description: office.address || "Нет описания",
            revenue: office.stats?.revenue || 0,
            orders: office.stats?.orders || 0,
            employees: transformedEmployees,
            data: [office.stats?.visits || 0, office.stats?.pending || 0],
            address: office.address,
            employee_count: office.employee_count ?? transformedEmployees.length,
            contact_phone: office.contact_phone || undefined,
            website: office.website || undefined,
            chartData: office.chartData,
            previousRevenue: transformedEmployees.reduce((total: number, employee: any) => total + (employee.periodRevenue || 0), 0),
            previousVisits: office.stats?.visits ? office.stats.visits * 0.9 : 0
          };
        });

        setOffices(transformedOffices);
        setHasError(false);
        if (transformedOffices.length > 0) {
          // Выбираем офис: если activeOfficeId уже есть в localStorage — выбираем его,
          // иначе — первый офис из списка
          const storedActiveId = localStorage.getItem('activeOfficeId');
          const activeOffice = storedActiveId
            ? transformedOffices.find(o => String(o.id) === storedActiveId)
            : null;
          const officeToSelect = activeOffice || transformedOffices[0];
          console.log("🏢 Выбираем офис при загрузке:", officeToSelect.title);
          setSelectedOffice(officeToSelect);
          if (!storedActiveId) {
            localStorage.setItem('activeOfficeId', String(officeToSelect.id));
          }
          // После загрузки офисов сразу запрашиваем данные для графика
          fetchOfficeRevenueData(transformedOffices);
        } else {
          // Пустой список — это не ошибка связи, а валидное состояние
          // (у пользователя ещё нет офиса). Покажем пустой экран с CTA создать.
          setSelectedOffice(null);
        }
      } catch (err: any) {
        console.error('❌ Ошибка при получении офисов:', err);
        // 401/403 — не считаем ошибкой связи, редирект на логин произойдёт выше
        const status = err?.response?.status;
        if (status === 401 || status === 403) {
          setOffices([]);
          setSelectedOffice(null);
          return;
        }
        setHasError(true);
        setOffices([]);
        setSelectedOffice(null);
      }
    };
    fetchOffices();
  }, [period, retryCounter]);



  // Гарантируем выбор первого офиса, если ничего не выбрано
  useEffect(() => {
    if (!selectedOffice && offices.length > 0) {
      console.log("🔄 Принудительно выбираем первый офис:", offices[0].title);
      setSelectedOffice(offices[0]);
    }
  }, [offices, selectedOffice]);

  // Синхронизируем выбранный офис в глобальный контекст, чтобы другие вкладки
  // (Календарь, Расходы и т.д.) знали об этом и не получали null.
  useEffect(() => {
    if (selectedOffice && (!officeFromContext || String(officeFromContext.id) !== String(selectedOffice.id))) {
      try {
        setSelectedOfficeContext({
          id: String(selectedOffice.id),
          title: (selectedOffice as any).title || (selectedOffice as any).name || '',
          description: (selectedOffice as any).description || '',
          revenue: (selectedOffice as any).revenue || 0,
          orders: (selectedOffice as any).orders || 0,
          employees: [], clients: [], expenses: [], documents: [], contracts: [],
          stats: { visits: 0, revenue: 0, orders: 0, employees: 0, clients: 0, expenses: 0, documents: 0 },
        } as any);
      } catch (e) {
        console.warn('Failed to sync selectedOffice to context', e);
      }
    }
  }, [selectedOffice, officeFromContext, setSelectedOfficeContext]);

  // Загружаем дашборд офиса (план/факт/касса юристов)
  useEffect(() => {
    const fetchDashboard = async () => {
      if (!selectedOffice?.id) return;
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const params = new URLSearchParams({ period });
        if (period === 'custom') {
          params.set('from', customFrom);
          params.set('to', customTo);
        }
        const res = await fetch(buildApiUrl(`/office/${selectedOffice.id}/dashboard?${params.toString()}`), {
          headers: getAuthHeaders(),
        });
        if (!res.ok) {
          setDashboard(null);
          return;
        }
        const body = await res.json();
        setDashboard(body.data || null);
      } catch (e) {
        console.error('dashboard fetch failed', e);
        setDashboard(null);
      }
    };
    fetchDashboard();
  }, [selectedOffice?.id, period, customFrom, customTo]);

  const isCcRole = ['cc_manager', 'cc_operator'].includes(userRole);

  const isDirector = (() => {
    try {
      const t = localStorage.getItem('token');
      if (!t) return false;
      const payload = JSON.parse(atob(t.split('.')[1] || ''));
      return (payload.role || '').toLowerCase() === 'director';
    } catch { return false; }
  })();

  // CC operator stats for Office tab
  interface CcOperatorStat {
    id: number;
    name: string;
    email: string;
    role: string;
    is_online: boolean;
    total_leads: number;
    booked_leads: number;
    brak_leads: number;
    active_leads: number;
    booking_rate: number;
    brak_rate: number;
  }
  const [ccOperatorStats, setCcOperatorStats] = useState<CcOperatorStat[]>([]);

  useEffect(() => {
    if (!isCcRole) return;
    const fetchCcStats = async () => {
      try {
        const res = await apiInstance.get('/call-center/stats/operators');
        const allOps = (res.data?.data || []) as CcOperatorStat[];
        setCcOperatorStats(allOps.filter((o: CcOperatorStat) => ['cc_manager', 'cc_operator'].includes(o.role)));
      } catch (e) { /* ignore */ }
    };
    fetchCcStats();
    const iv = setInterval(fetchCcStats, 15000);
    return () => clearInterval(iv);
  }, [isCcRole]);

  const openPlanEditor = () => {
    setPlanError(null);
    const today = new Date();
    const defaultFrom = new Date(today); defaultFrom.setDate(defaultFrom.getDate() - 13);
    setPlanForm({
      dayWeekday: dashboard?.plan ? String(dashboard.plan.day_weekday ?? dashboard.plan.day ?? '') : '',
      dayWeekend: dashboard?.plan ? String(dashboard.plan.day_weekend ?? dashboard.plan.day ?? '') : '',
      period: dashboard?.plan ? String(dashboard.plan.period) : '',
      from: dashboard?.plan?.period_start ? dashboard.plan.period_start.slice(0, 10) : defaultFrom.toISOString().slice(0, 10),
      to: dashboard?.plan?.period_end ? dashboard.plan.period_end.slice(0, 10) : today.toISOString().slice(0, 10),
    });
    setShowPlanModal(true);
  };

  const savePlan = async () => {
    if (!selectedOffice?.id) return;
    setPlanError(null);
    const dayWeekday = Number(planForm.dayWeekday || 0);
    const dayWeekend = Number(planForm.dayWeekend || 0);
    const periodAmt = Number(planForm.period || 0);
    if (!planForm.from || !planForm.to) { setPlanError('Укажите диапазон периода'); return; }
    if (dayWeekday < 0 || dayWeekend < 0 || periodAmt < 0) { setPlanError('Суммы плана не могут быть отрицательными'); return; }
    setPlanSaving(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(buildApiUrl(`/office/${selectedOffice.id}/plan`), {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          daily_plan_weekday: dayWeekday,
          daily_plan_weekend: dayWeekend,
          period_plan_amount: periodAmt,
          period_start: planForm.from,
          period_end: planForm.to,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || 'Не удалось сохранить план');
      }
      setShowPlanModal(false);
      // Re-fetch dashboard
      const params = new URLSearchParams({ period });
      if (period === 'custom') { params.set('from', customFrom); params.set('to', customTo); }
      const r = await fetch(buildApiUrl(`/office/${selectedOffice.id}/dashboard?${params.toString()}`), {
        headers: getAuthHeaders(),
      });
      if (r.ok) { const b = await r.json(); setDashboard(b.data || null); }
    } catch (err) {
      setPlanError((err as Error).message || 'Ошибка');
    } finally {
      setPlanSaving(false);
    }
  };

  // Загружаем все договоры (для аналитики юристов)
  useEffect(() => {
    const fetchContracts = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const res = await fetch(buildApiUrl('/contracts'), {
          headers: getAuthHeaders(),
        });
        if (!res.ok) return;
        const body = await res.json();
        const list = Array.isArray(body) ? body : (body.data || body.contracts || []);
        setContracts(list);
      } catch (e) {
        console.error('contracts fetch failed', e);
      }
    };
    fetchContracts();
  }, [selectedOffice?.id]);

  // Загружаем статистику консультаций по сотрудникам
  useEffect(() => {
    const fetchConsultationStats = async () => {
      try {
        const res = await apiInstance.get('/visits/consultation-stats');
        setConsultationStats(res.data?.data || []);
      } catch { /* ignore */ }
    };
    fetchConsultationStats();
    const iv = setInterval(fetchConsultationStats, 15000);
    return () => clearInterval(iv);
  }, [selectedOffice?.id]);

  useEffect(() => {
    if (selectedOffice) {
      // Используем данные из stats, которые приходят с сервера
      const currentRevenue = selectedOffice.revenue || 0;
      const currentOrders = selectedOffice.orders || 0;
      const currentVisits = selectedOffice.data && selectedOffice.data.length > 0 ? selectedOffice.data[0] : 0;
      
      const previousVisits = selectedOffice.previousVisits || 0;
      const previousRevenue = selectedOffice.previousRevenue || 0;

      const visitsChange = calculatePercentageChange(currentVisits, previousVisits);
      const revenueChange = calculatePercentageChange(currentRevenue, previousRevenue);

      setStats({
        visits: currentVisits,
        orders: currentOrders,
        revenue: currentRevenue,
        pending: selectedOffice.data && selectedOffice.data.length > 1 ? selectedOffice.data[1] : 0,
        visitsChange,
        revenueChange
      });
    }
  }, [selectedOffice, period]);

  // Удалено получение данных из локальной генерации, 
  // теперь данные приходят только с сервера через fetchOfficeRevenueData

  // Вызываем функцию при изменении периода
  useEffect(() => {
    fetchOfficeRevenueData();
  }, [period]);

  const handleOfficeClick = async (office: Office) => {
    setSelectedOffice(office);
    // Переключаем активный офис через API, чтобы все данные (касса, статистика и т.д.)
    // загружались только для выбранного офиса
    const currentActiveId = localStorage.getItem('activeOfficeId');
    if (String(office.id) !== currentActiveId) {
      try {
        const res = await apiInstance.post('/offices/switch', { officeId: Number(office.id) });
        if (res.data?.token) {
          localStorage.setItem('token', res.data.token);
        }
        localStorage.setItem('activeOfficeId', String(office.id));
      } catch (e) {
        console.error('Ошибка при переключении офиса:', e);
      }
    }
  };

  const handlePeriodChange = (newPeriod: PeriodType) => {
    console.log(`Переключаем на период: ${newPeriod}`);
    
    // Устанавливаем новый период
    setPeriod(newPeriod);
    
    // Генерируем новые метки для выбранного периода
    const newLabels = generatePeriodLabelsForPeriod(newPeriod);
    console.log("Новые метки:", newLabels);
    
    // Принудительно очищаем текущий график с новыми метками
    setOfficeRevenueData({
      labels: newLabels,
      offices: offices.map(office => ({
        id: office.id,
        name: office.title,
        revenue: Array(newLabels.length).fill(0)
      }))
    });

    // Запрашиваем новые данные с сервера с небольшой задержкой
    // для обеспечения корректного отображения обновленных меток
    setTimeout(() => {
      // Важно! Передаем newPeriod напрямую, чтобы не зависеть от асинхронного обновления state
      fetchOfficeRevenueData(offices, newPeriod);
    }, 300);
  };

  // Функция генерации меток для конкретного периода
  const generatePeriodLabelsForPeriod = (selectedPeriod: PeriodType): string[] => {
    const today = new Date();
    const labels: string[] = [];

    switch (selectedPeriod) {
      case "day":
        // Последние 6 дней
        for (let i = 5; i >= 0; i--) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          labels.push(date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }));
        }
        break;
      case "2weeks":
        // Последние 6 периодов по 2 недели
        for (let i = 5; i >= 0; i--) {
          const date = new Date(today);
          date.setDate(date.getDate() - i * 14);
          labels.push(`Период ${6 - i}`);
        }
        break;
      case "month":
        // Последние 6 месяцев
        for (let i = 5; i >= 0; i--) {
          const date = new Date(today);
          date.setMonth(date.getMonth() - i);
          labels.push(date.toLocaleDateString('ru-RU', { month: 'short' }));
        }
        break;
    }

    return labels;
  };


  const getPeriodText = () => {
    switch (period) {
      case "day": return "Сегодня";
      case "yesterday": return "Вчера";
      case "week": return "Неделя";
      case "2weeks": return "2 недели";
      case "month": return "Месяц";
      case "custom": return "Произвольный период";
      default: return "Сегодня";
    }
  };

  const getComparisonText = (isIncrease: boolean | null) => {
    const period = getPeriodText().toLowerCase();
    if (isIncrease === null) return `Без изменений за ${period}`;
    return isIncrease ? `Рост за ${period}` : `Снижение за ${period}`;
  };

  // Функция для получения данных о выручке офисов с сервера
  const fetchOfficeRevenueData = async (currentOffices = offices, forcedPeriod?: PeriodType) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      // Используем переданный период или текущий из state
      const currentPeriod = forcedPeriod || period;

      // Важно! Каждый раз генерируем новые метки для нужного периода
      const periodLabels = generatePeriodLabelsForPeriod(currentPeriod);
      console.log("Сгенерированные метки для периода:", currentPeriod, periodLabels);

      // В реальном приложении здесь должен быть запрос к API для получения данных о выручке
      // с учетом выбранного периода (день, неделя, месяц)
      const response = await fetch(buildApiUrl(`/offices/revenue?period=${currentPeriod}`), {
        headers: getAuthHeaders()
      });

      if (response.ok) {
        try {
          const data = await response.json();
          // Обновляем данные для графика, если получили их с сервера
          if (data && data.offices && data.offices.length > 0) {
            // Важно: игнорируем метки с сервера (если они есть) и всегда используем
            // локально сгенерированные метки для соответствия выбранному периоду
            const mappedOffices = data.offices.map((office: { id: string; name: string; revenue?: number[] }) => {
              // Проверяем, что массив revenue соответствует по длине нашим меткам
              // Если длины не совпадают, создаем новый массив с нулями
              let revenueData = office.revenue || [];
              if (revenueData.length !== periodLabels.length) {
                revenueData = new Array(periodLabels.length).fill(0);
                // Если есть данные, копируем их (насколько возможно)
                if (office.revenue && office.revenue.length > 0) {
                  const copyLength = Math.min(office.revenue.length, periodLabels.length);
                  for (let i = 0; i < copyLength; i++) {
                    revenueData[i] = office.revenue[i];
                  }
                }
              }
              return {
                id: office.id,
                name: office.name,
                revenue: revenueData
              };
            });

            // Обновляем состояние с новыми метками и данными
            setOfficeRevenueData({
              labels: periodLabels,
              offices: mappedOffices
            });
            console.log("Обновили данные графика с периодом:", currentPeriod, periodLabels);
          } else {
            // Если с сервера пришли некорректные данные, устанавливаем пустые значения
            setOfficeRevenueData({
              labels: periodLabels,
              offices: currentOffices.map(office => ({
                id: office.id,
                name: office.title,
                revenue: new Array(periodLabels.length).fill(0)
              }))
            });
          }
        } catch (error) {
          console.error('Ошибка разбора JSON:', error);
          // В случае ошибки устанавливаем пустые значения
          setOfficeRevenueData({
            labels: periodLabels,
            offices: currentOffices.map(office => ({
              id: office.id,
              name: office.title,
              revenue: new Array(periodLabels.length).fill(0)
            }))
          });
        }
      } else {
        console.error('Ошибка запроса к API:', response.status);
        // Если запрос не удался — показываем нули, не подставляем фейковые числа.
        setOfficeRevenueData({
          labels: periodLabels,
          offices: currentOffices.map(office => ({
            id: office.id,
            name: office.title,
            revenue: new Array(periodLabels.length).fill(0)
          })),
        });
      }
    } catch (error) {
      console.error('Ошибка при получении данных о выручке:', error);
      // В случае ошибки устанавливаем пустые значения с актуальными метками периода
      // Используем переданный период или текущий из state
      const currentPeriod = forcedPeriod || period;
      const periodLabels = generatePeriodLabelsForPeriod(currentPeriod);
      setOfficeRevenueData({
        labels: periodLabels,
        offices: currentOffices.map(office => ({
          id: office.id,
          name: office.title,
          revenue: new Array(periodLabels.length).fill(0)
        }))
      });
    }
  };

  const showEditModal = () => {
    if (selectedOffice) {
      form.setFieldsValue({
        officeName: selectedOffice.title,
        officeAddress: selectedOffice.address,
        contactPhone: selectedOffice.work_phone || '',
        work_phone2: selectedOffice.work_phone2 || '',
        inn: selectedOffice.inn || '',
        ogrn: selectedOffice.ogrn || ''
      });
      setIsEditModalVisible(true);
    }
  };

  const handleEditCancel = () => {
    setIsEditModalVisible(false);
  };

  const handleEditSubmit = async () => {
    try {
      setIsSubmitting(true);
      const values = await form.validateFields();

      const response = await fetch(buildApiUrl(`/offices/${selectedOffice?.id}`), {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          ...values
        })
      });

      if (!response.ok) {
        throw new Error('Ошибка обновления данных офиса');
      }

      message.success('Информация об офисе успешно обновлена');
      setIsEditModalVisible(false);

      // Обновляем данные в локальном состоянии
      if (selectedOffice) {
        const updatedOffice = {
          ...selectedOffice,
          title: values.officeName,
          address: values.officeAddress || '',
          description: values.officeAddress || 'Адрес не указан',
          inn: values.inn || '',
          ogrn: values.ogrn || '',
          work_phone: values.contactPhone || '',
          work_phone2: values.work_phone2 || ''
        };

        setSelectedOffice(updatedOffice);
        setOffices(offices.map(office => 
          office.id === selectedOffice.id ? updatedOffice : office
        ));
      }
    } catch (error) {
      message.error('Не удалось обновить информацию об офисе');
      console.error('Ошибка:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Новые функции для добавления офиса
  const showAddModal = () => {
    if (isOfficeLimit) {
      message.warning(`Достигнут лимит офисов (${MAX_OFFICES}). Вы не можете добавить больше офисов.`);
      return;
    }
    
    addForm.resetFields();
    setIsAddModalVisible(true);
  };

  const handleAddCancel = () => {
    setIsAddModalVisible(false);
  };

  const handleAddSubmit = async () => {
    try {
      if (isOfficeLimit) {
        message.warning(`Достигнут лимит офисов (${MAX_OFFICES}). Вы не можете добавить больше офисов.`);
        setIsAddModalVisible(false);
        return;
      }
      
      setIsSubmitting(true);
      const values = await addForm.validateFields();

      // Используем ID из auth контекста — не зависим от отдельного запроса /profile
      const currentUserId = authUser?.id;
      if (!currentUserId) {
        throw new Error('Пользователь не авторизован');
      }

      // Создаем офис через API — явно маппим поля формы на поля API
      const response = await fetch(buildApiUrl('/offices'), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: values.officeName,
          address: values.officeAddress || '',
          contact_phone: values.contactPhone || '',
          work_phone: values.contactPhone || '',
          work_phone2: values.work_phone2 || '',
          ip_surname: values.ipSurname || '',
          ip_name: values.ipName || '',
          ip_middle_name: values.ipMiddleName || '',
          inn: values.inn || '',
          ogrn: values.ogrn || '',
          owner_id: currentUserId
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Ошибка создания офиса');
      }

      let newOfficeData;
      try {
        newOfficeData = await response.json();
      } catch (error) {
        console.warn('Не удалось получить данные нового офиса из ответа:', error);
        newOfficeData = { id: Date.now().toString() };
      }
      
      message.success('Офис успешно создан');
      setIsAddModalVisible(false);

      // Создаем новый офис для добавления в локальный список
      const newOffice: Office = {
        id: newOfficeData.id || Date.now().toString(),
        title: values.officeName,
        description: values.officeAddress || 'Нет описания',
        revenue: 0,
        orders: 0,
        employees: [],
        data: [0, 0],
        address: values.officeAddress || '',
        employee_count: 0,
        work_phone: values.contactPhone || null,
        work_phone2: values.work_phone2 || null,
        // Добавляем данные ИП
        ip_surname: values.ipSurname || '',
        ip_name: values.ipName || '',
        ip_middle_name: values.ipMiddleName || '',
        // Добавляем ИНН и ОГРН
        inn: values.inn || '',
        ogrn: values.ogrn || ''
      };

      // Обновляем список офисов, добавляя новый офис к существующим
      const updatedOffices = [...offices, newOffice];
      setOffices(updatedOffices);
      setSelectedOffice(newOffice);

    } catch (error) {
      if (error instanceof Error) {
        message.error(error.message || 'Не удалось создать офис');
      } else {
        message.error('Не удалось создать офис');
      }
      console.error('Ошибка:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ===== Аналитика по сотрудникам (консультации) =====
  const roleLabel = (role: string) => {
    const map: Record<string, string> = { director: 'Директор', manager: 'Менеджер', okk: 'ОКК', lawyer: 'Юрист', admin: 'Администратор' };
    return map[role] || role;
  };

  const computeConsultationRating = (conversion: number): { rating: 0 | 1 | 2 | 3; ratingLabel: string } => {
    if (conversion >= 33) return { rating: 3, ratingLabel: 'Идеальный' };
    if (conversion >= 25) return { rating: 2, ratingLabel: 'Хороший' };
    if (conversion >= 15) return { rating: 1, ratingLabel: 'Средний' };
    return { rating: 0, ratingLabel: 'Низкий' };
  };

  const renderStars = (rating: 0 | 1 | 2 | 3) => (
    <span className="lawyer-rating-stars" aria-label={`Рейтинг ${rating} из 3`}>
      {[1, 2, 3].map(i => i <= rating ? <FaStar key={i} /> : <FaRegStar key={i} />)}
    </span>
  );

  // Данные для модалки выбранного сотрудника
  const selectedConsultationEmployee = selectedLawyerId
    ? consultationStats.find(cs => String(cs.id) === String(selectedLawyerId)) || null
    : null;

  // Cash data by employee id
  const cashById = new Map<number, { today: number; period: number; full_name: string }>();
  (dashboard?.lawyers_cash || []).forEach(l => cashById.set(l.id, { today: l.today, period: l.period, full_name: l.full_name }));

  // Если есть ошибка загрузки данных - показываем красивое сообщение
  if (hasError) {
    return (
      <div className="error-container">
        <div className="error-content">
          <div className="error-icon">⚠️</div>
          <h2>Ошибка подключения к серверу</h2>
          <p>Не удалось загрузить данные офисов. Проверьте подключение к интернету или попробуйте позже.</p>
          <button
            className="retry-button"
            onClick={() => {
              setHasError(false);
              setRetryCounter((c) => c + 1);
            }}
          >
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }


  return (
    <div className="office-content">
      {/* ── HEADER ── */}
      <div className="office-header animate-fade-in-up">
        <h2>Управление офисами</h2>
        {isDirector && canManageOffices && !isOfficeLimit && (
          <button className="office-header-add-btn" onClick={showAddModal}>
            <FaPlus style={{ fontSize: 12 }} /> Добавить офис
          </button>
        )}
      </div>

      {/* ── OFFICE CARDS ── */}
      <div className="office-cards-row animate-fade-in-up">
        {offices.map(office => (
          <div
            key={office.id}
            className={`office-card ${selectedOffice?.id === office.id ? 'selected' : ''}`}
            onClick={() => handleOfficeClick(office)}
          >
            <div className="office-card-header">
              <div className="office-card-title-row">
                <h3>{office.title}</h3>
                <span className="office-status-badge">Активен</span>
              </div>
              <button
                className="office-card-menu-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowOfficeInfoModal(true);
                }}
                title="Меню"
              >
                <FaEllipsisH />
              </button>
            </div>
            <div className="office-card-info">
              <p><FaUsers /> <b>Сотрудники:</b> {office.employee_count || 0}</p>
              <p><FaMapMarkerAlt /> <b>Адрес:</b> {office.address || 'Не указан'}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── ПЛАН / ФАКТ ── */}
      {selectedOffice && !isCcRole && (() => {
        const dayFact = Number(dashboard?.fact.day || 0);
        const periodFact = Number(dashboard?.fact.period || 0);
        const dayPlan = Number(dashboard?.plan?.day || 0);
        const periodPlan = Number(dashboard?.plan?.period || 0);
        const dayPct = dayPlan > 0 ? (dayFact / dayPlan) * 100 : null;
        const periodPct = periodPlan > 0 ? (periodFact / periodPlan) * 100 : null;
        const fmt = (v: number) => `${Math.round(v).toLocaleString('ru-RU')} ₽`;

        const today = new Date();
        const dayLabel = `${today.getDate()} ${today.toLocaleDateString('ru-RU', { month: 'long' }).replace(/^./, c => c.toLowerCase())}`;
        const periodLabel = dashboard?.plan?.period_start && dashboard?.plan?.period_end
          ? `${new Date(dashboard.plan.period_start).toLocaleDateString('ru-RU')} – ${new Date(dashboard.plan.period_end).toLocaleDateString('ru-RU')}`
          : '';
        const planId = dashboard?.plan?.id ? `#${dashboard.plan.id}` : '';

        return (
          <div className="plan-fact-block animate-fade-in-up">
            <div className="plan-fact-header">
              <h4 className="section-title">План / Факт</h4>
              {isDirector && (
                <button className="plan-edit-btn-v2" onClick={openPlanEditor}>
                  <FaEdit style={{ fontSize: 13 }} /> Изменить план
                </button>
              )}
            </div>
            <div className="plan-fact-grid-v2">
              <div className="plan-fact-card-v2">
                <div className="plan-fact-card-label">ПЛАН НА ДЕНЬ — {dayLabel}</div>
                <div className="plan-fact-card-value">
                  <span className="pf-fact">{fmt(dayFact)}</span>
                  <span className="pf-sep"> / </span>
                  <span className="pf-plan">{dayPlan > 0 ? fmt(dayPlan) : '—'}</span>
                </div>
                <div className="plan-fact-card-pct">{dayPct !== null ? `${dayPct.toFixed(0)}%` : '0%'}</div>
              </div>
              <div className="plan-fact-card-v2">
                <div className="plan-fact-card-label">
                  ПЛАН НА ПЕРИОД {periodLabel ? `— ${periodLabel}` : ''} {planId && <span className="plan-id-tag">{planId}</span>}
                </div>
                <div className="plan-fact-card-value">
                  <span className="pf-fact">{fmt(periodFact)}</span>
                  <span className="pf-sep"> / </span>
                  <span className="pf-plan">{periodPlan > 0 ? fmt(periodPlan) : '—'}</span>
                </div>
                <div className="plan-fact-card-pct">{periodPct !== null ? `${periodPct.toFixed(0)}%` : '0%'}</div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── CC: Статистика операторов КЦ ── */}
      {isCcRole && (
        <div className="lawyers-section animate-fade-in-up">
          <div className="table-header">
            <h4 className="section-title">Статистика операторов колл-центра</h4>
          </div>
          <div className="lawyers-table-scroll">
            <table className="employee-stats-table lawyers-table">
              <thead>
                <tr>
                  <th>Оператор</th>
                  <th className="num">Всего лидов</th>
                  <th className="num">Активных</th>
                  <th className="num">Записано</th>
                  <th className="num">% записи</th>
                  <th className="num">Брак</th>
                  <th className="num">% брака</th>
                </tr>
              </thead>
              <tbody>
                {ccOperatorStats.length > 0 ? ccOperatorStats.map(op => (
                  <tr key={op.id}>
                    <td><b>{op.name || op.email}</b></td>
                    <td className="num">{op.total_leads}</td>
                    <td className="num">{op.active_leads}</td>
                    <td className="num" style={{ color: '#138a5d', fontWeight: 700 }}>{op.booked_leads}</td>
                    <td className="num">{op.booking_rate}%</td>
                    <td className="num" style={{ color: '#c0392b' }}>{op.brak_leads}</td>
                    <td className="num">{op.brak_rate}%</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={7} className="no-data">Нет данных по операторам</td>
                  </tr>
                )}
              </tbody>
              {ccOperatorStats.length > 0 && (
                <tfoot>
                  <tr>
                    <td><b>Итого</b></td>
                    <td></td>
                    <td className="num"><b>{ccOperatorStats.reduce((s, o) => s + o.total_leads, 0)}</b></td>
                    <td className="num"><b>{ccOperatorStats.reduce((s, o) => s + o.active_leads, 0)}</b></td>
                    <td className="num"><b>{ccOperatorStats.reduce((s, o) => s + o.booked_leads, 0)}</b></td>
                    <td className="num"><b>{(() => {
                      const total = ccOperatorStats.reduce((s, o) => s + o.total_leads, 0);
                      const booked = ccOperatorStats.reduce((s, o) => s + o.booked_leads, 0);
                      return total > 0 ? Math.round(booked / total * 100) : 0;
                    })()}%</b></td>
                    <td className="num"><b>{ccOperatorStats.reduce((s, o) => s + o.brak_leads, 0)}</b></td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* ── КАССА ЮРИСТОВ ── */}
      {selectedOffice && !isCcRole && (
        <div className="lawyers-section animate-fade-in-up">
          <div className="table-header">
            <h4 className="section-title">Касса юристов</h4>
            <div className="lawyers-legend">
              <span className="legend-item"><FaStar className="star-gold" /><FaStar className="star-gold" /><FaStar className="star-gold" /> {'\u2265'} 33% — идеальный</span>
              <span className="legend-item"><FaStar className="star-gold" /><FaStar className="star-gold" /> 25–32% — хороший</span>
              <span className="legend-item"><FaStar className="star-gold" /> 15–24% — средний</span>
              <span className="legend-item"><FaStar className="star-muted" /> {'<'} 15% — низкий</span>
            </div>
          </div>
          <div className="lawyers-table-scroll">
            <table className="employee-stats-table lawyers-table">
              <thead>
                <tr>
                  <th>Сотрудник</th>
                  <th>Роль</th>
                  <th className="num">Консультаций</th>
                  <th className="num">Заключено</th>
                  <th className="num">Конверсия</th>
                  <th>Рейтинг</th>
                  <th className="num">Касса сегодня</th>
                  <th className="num">Касса за период</th>
                </tr>
              </thead>
              <tbody>
                {consultationStats.length > 0 ? (
                  (() => {
                    const roleOrder: Record<string, number> = { lawyer: 0, manager: 1, okk: 2, expert: 3, representative: 4, reception: 5, cc_operator: 6 };
                    const sorted = [...consultationStats].sort((a, b) =>
                      (roleOrder[a.role] ?? 9) - (roleOrder[b.role] ?? 9)
                    );
                    return sorted.map(cs => {
                      const cash = cashById.get(cs.id);
                      const { rating, ratingLabel } = computeConsultationRating(cs.conversion);
                      return (
                        <tr
                          key={cs.id}
                          className="lawyer-row"
                          onClick={() => setSelectedLawyerId(String(cs.id))}
                          title="Открыть статистику сотрудника"
                        >
                          <td><b>{cs.name}</b></td>
                          <td>{roleLabel(cs.role)}</td>
                          <td className="num">{cs.total_consultations}</td>
                          <td className="num" style={{ color: 'var(--color-primary)', fontWeight: 700 }}>{cs.contracts_signed}</td>
                          <td className="num" style={{ fontWeight: 700 }}>{cs.total_consultations > 0 ? `${cs.conversion}%` : '—'}</td>
                          <td>
                            {cs.total_consultations > 0 ? (
                              <span className="lawyer-rating-stars-v2">
                                {[1, 2, 3].map(i => (
                                  <FaStar key={i} className={i <= rating ? 'star-gold' : 'star-muted'} />
                                ))}
                              </span>
                            ) : '—'}
                          </td>
                          <td className="num">{cash ? `${Math.round(cash.today).toLocaleString('ru-RU')} \u20BD` : '0 \u20BD'}</td>
                          <td className="num">{cash ? `${Math.round(cash.period).toLocaleString('ru-RU')} \u20BD` : '0 \u20BD'}</td>
                        </tr>
                      );
                    });
                  })()
                ) : (
                  <tr>
                    <td colSpan={8} className="no-data">Нет сотрудников</td>
                  </tr>
                )}
              </tbody>
              {consultationStats.length > 0 && (
                <tfoot>
                  <tr>
                    <td colSpan={2}><b>Итого</b></td>
                    <td className="num"><b>{consultationStats.reduce((s, c) => s + c.total_consultations, 0)}</b></td>
                    <td className="num" style={{ color: 'var(--color-primary)' }}><b>{consultationStats.reduce((s, c) => s + c.contracts_signed, 0)}</b></td>
                    <td className="num"><b>{(() => {
                      const total = consultationStats.reduce((s, c) => s + c.total_consultations, 0);
                      const signed = consultationStats.reduce((s, c) => s + c.contracts_signed, 0);
                      return total > 0 ? `${Math.round(signed / total * 100)}%` : '0%';
                    })()}</b></td>
                    <td></td>
                    <td className="num"><b>{`${Math.round((dashboard?.lawyers_cash || []).reduce((s, l) => s + l.today, 0)).toLocaleString('ru-RU')} \u20BD`}</b></td>
                    <td className="num"><b>{`${Math.round((dashboard?.lawyers_cash || []).reduce((s, l) => s + l.period, 0)).toLocaleString('ru-RU')} \u20BD`}</b></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}
      <Modal
        title="Редактирование офиса"
        open={isEditModalVisible}
        onCancel={handleEditCancel}
        footer={[
          <Button key="back" onClick={handleEditCancel}>
            Отмена
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={isSubmitting}
            onClick={() => form.submit()}
          >
            Сохранить
          </Button>,
        ]}
      >
        <Form
          form={form}
          layout="vertical"
          name="edit_office_form"
          onFinish={handleEditSubmit}
        >
          <Form.Item
            name="officeName"
            label="Название офиса"
            rules={[{ required: true, message: 'Пожалуйста, введите название офиса' }]}
          >
            <Input placeholder="Введите название офиса" />
          </Form.Item>
          
          <div style={{ marginBottom: '16px', padding: '16px', border: '1px solid #d9d9d9', borderRadius: '6px', backgroundColor: '#fafafa' }}>
            <h4 style={{ margin: '0 0 16px 0', color: '#1890ff' }}>ИП (Индивидуальный предприниматель)</h4>
            <Form.Item
              name="ipSurname"
              label="Фамилия"
              rules={[{ required: true, message: 'Пожалуйста, введите фамилию' }]}
            >
              <Input placeholder="Введите фамилию" />
            </Form.Item>
            <Form.Item
              name="ipName"
              label="Имя"
              rules={[{ required: true, message: 'Пожалуйста, введите имя' }]}
            >
              <Input placeholder="Введите имя" />
            </Form.Item>
            <Form.Item
              name="ipMiddleName"
              label="Отчество"
            >
              <Input placeholder="Введите отчество" />
            </Form.Item>
          </div>
          
          <Form.Item
            name="inn"
            label="ИНН"
            rules={[{ required: true, message: 'Пожалуйста, введите ИНН' }]}
          >
            <Input placeholder="Введите ИНН" />
          </Form.Item>
          <Form.Item
            name="ogrn"
            label="ОГРН"
            rules={[{ required: true, message: 'Пожалуйста, введите ОГРН' }]}
          >
            <Input placeholder="Введите ОГРН" />
          </Form.Item>
          
          <Form.Item
            name="officeAddress"
            label="Адрес"
          >
            <Input placeholder="Введите адрес офиса" />
          </Form.Item>
          <Form.Item
            name="contactPhone"
            label="Рабочий телефон 1"
          >
            <Input placeholder="Введите рабочий телефон 1" />
          </Form.Item>
          <Form.Item
            name="work_phone2"
            label="Рабочий телефон 2"
          >
            <Input placeholder="Введите рабочий телефон 2" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Добавление нового офиса"
        open={isAddModalVisible}
        onCancel={handleAddCancel}
        footer={[
          <Button key="back" onClick={handleAddCancel}>
            Отмена
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={isSubmitting}
            style={{ backgroundColor: 'var(--color-accent)', borderColor: 'var(--color-accent)' }}
            onClick={() => addForm.submit()}
          >
            Создать офис
          </Button>,
        ]}
      >
        <Form
          form={addForm}
          layout="vertical"
          name="add_office_form"
          onFinish={handleAddSubmit}
        >
          <Form.Item
            name="officeName"
            label="Название офиса"
            rules={[{ required: true, message: 'Пожалуйста, введите название офиса' }]}
          >
            <Input placeholder="Введите название офиса" />
          </Form.Item>
          
          <div style={{ border: '1px solid #e8e8e8', padding: '16px', marginBottom: '16px', borderRadius: '4px', backgroundColor: '#f9f9f9' }}>
            <div style={{ marginBottom: '12px', fontWeight: 'bold', color: '#1890ff' }}>ИП</div>
            <Form.Item
              name="ipSurname"
              label="Фамилия"
              rules={[{ required: true, message: 'Пожалуйста, введите фамилию' }]}
            >
              <Input placeholder="Введите фамилию" />
            </Form.Item>
            <Form.Item
              name="ipName"
              label="Имя"
              rules={[{ required: true, message: 'Пожалуйста, введите имя' }]}
            >
              <Input placeholder="Введите имя" />
            </Form.Item>
            <Form.Item
              name="ipMiddleName"
              label="Отчество"
            >
              <Input placeholder="Введите отчество" />
            </Form.Item>
          </div>
          
          <Form.Item
            name="inn"
            label="ИНН"
            rules={[{ required: true, message: 'Пожалуйста, введите ИНН' }]}
          >
            <Input placeholder="Введите ИНН" />
          </Form.Item>
          <Form.Item
            name="ogrn"
            label="ОГРН"
            rules={[{ required: true, message: 'Пожалуйста, введите ОГРН' }]}
          >
            <Input placeholder="Введите ОГРН" />
          </Form.Item>
          <Form.Item
            name="officeAddress"
            label="Адрес"
          >
            <Input placeholder="Введите адрес офиса" />
          </Form.Item>
          <Form.Item
            name="contactPhone"
            label="Рабочий телефон 1"
          >
            <Input placeholder="Введите рабочий телефон 1" />
          </Form.Item>
          <Form.Item
            name="work_phone2"
            label="Рабочий телефон 2"
          >
            <Input placeholder="Введите рабочий телефон 2" />
          </Form.Item>
        </Form>
      </Modal>
      
      <Modal
        title="Информация об офисе"
        open={showOfficeInfoModal}
        onCancel={() => setShowOfficeInfoModal(false)}
        footer={null}
        width={700}
        className="office-info-modal"
      >
        {selectedOffice && (
          <div className="office-info-content">
            <div className="office-info-header">
              <h3>{selectedOffice.title}</h3>
              <div className="office-info-actions">
                <Button 
                  type="primary" 
                  icon={<FaEdit />} 
                  onClick={() => {
                    setShowOfficeInfoModal(false);
                    showEditModal();
                  }}
                >
                  Редактировать
                </Button>
              </div>
            </div>
            
            <div className="office-info-details">
              <div className="info-section">
                <h4>Основная информация</h4>
                <p><strong>Адрес:</strong> {selectedOffice.address || 'Не указан'}</p>
                <p><strong>Телефон:</strong> {selectedOffice.work_phone || 'Не указан'}</p>
                {selectedOffice.work_phone2 && (
                  <p><strong>Телефон 2:</strong> {selectedOffice.work_phone2}</p>
                )}
                <p><strong>Количество сотрудников:</strong> {selectedOffice.employee_count || 0}</p>
              </div>
              
              <div className="info-section">
                <h4>Данные ИП</h4>
                <p><strong>ФИО:</strong> {(() => {
                  const full = `${selectedOffice.ip_surname || ''} ${selectedOffice.ip_name || ''} ${selectedOffice.ip_middle_name || ''}`.trim();
                  return full || 'Не указано';
                })()}</p>
                <p><strong>ИНН:</strong> {selectedOffice.inn || 'Не указан'}</p>
                <p><strong>ОГРН:</strong> {selectedOffice.ogrn || 'Не указан'}</p>
              </div>
            </div>
            
            {offices.length > 1 && (
              <div className="all-offices-section">
                <h4>Все офисы</h4>
                <div className="all-offices-list">
                  {offices.map(office => (
                    <div 
                      key={office.id} 
                      className={`office-list-item ${selectedOffice.id === office.id ? 'active' : ''}`}
                      onClick={() => {
                        setSelectedOffice(office);
                      }}
                    >
                      <span>{office.title}</span>
                      {selectedOffice.id !== office.id && (
                        <FaArrowRight className="select-office-icon" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="office-info-footer">
              {canManageOffices && !isOfficeLimit && (
                <Button 
                  type="default" 
                  icon={<GrAdd />} 
                  onClick={() => {
                    setShowOfficeInfoModal(false);
                    showAddModal();
                  }}
                >
                  Добавить офис
                </Button>
              )}
              <Button onClick={() => setShowOfficeInfoModal(false)}>Закрыть</Button>
            </div>
          </div>
        )}
      </Modal>
      
      {selectedOffice && (
        <div className={`employee-modal-overlay ${showEmployeeModal ? 'active' : ''}`}>
          <div className="modal-content">
            <span className="modal-close-icon" onClick={() => setShowEmployeeModal(false)}>
              <FaTimes />
            </span>
            <h3>Сотрудники офиса {selectedOffice.title}</h3>
            <div className="employee-table-modal">
              <table className="employee-stats-table">
                <thead>
                  <tr>
                    <th>Юрист</th>
                    <th>Касса за день</th>
                    <th>Касса за период</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedOffice.employees.length > 0 ? (
                    selectedOffice.employees.map(employee => (
                      <tr key={employee.id}>
                        <td>{`${employee.surname || 'Сотрудник'} ${employee.name ? employee.name.charAt(0) + '.' : ''}${employee.middle_name ? employee.middle_name.charAt(0) + '.' : ''}`}</td>
                        <td>{employee.totalRevenue14Days?.toLocaleString() || '0'}</td>
                        <td>{employee.periodRevenue?.toLocaleString() || '0'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="no-data">Нет данных о сотрудниках</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {selectedOffice && (
        <div className={`employee-modal-overlay ${showRevenueModal ? 'active' : ''}`}>
          <div className="modal-content">
            <span className="modal-close-icon" onClick={() => setShowRevenueModal(false)}>
              <FaTimes />
            </span>
            <h3>Подробная информация</h3>
            <div className="revenue-info-modal">
              <div className="modal-section">
                <h4>Приходы</h4>
                <p><b>Всего за {getPeriodText()}:</b> {stats.visits.toLocaleString()}</p>
                <p><b>Изменение:</b> {stats.visitsChange.percentage}% {stats.visitsChange.isIncrease ? 'больше' : 'меньше'} по сравнению с предыдущим периодом</p>
                <p><b>Средний показатель:</b> {Math.round(stats.visits / (period === "day" ? 1 : period === "2weeks" ? 14 : 30)).toLocaleString()} в день</p>
              </div>
              <div className="modal-section">
                <h4>Общая касса</h4>
                <p><b>Всего за {getPeriodText()}:</b> {stats.revenue.toLocaleString()} ₽</p>
                <p><b>Изменение:</b> {stats.revenueChange.percentage}% {stats.revenueChange.isIncrease ? 'больше' : 'меньше'} по сравнению с предыдущим периодом</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {showPlanModal && (
        <div className="employee-modal-overlay active" onClick={() => !planSaving && setShowPlanModal(false)}>
          <div className="modal-content plan-modal" onClick={(e) => e.stopPropagation()}>
            <span className="modal-close-icon" onClick={() => !planSaving && setShowPlanModal(false)}>
              <FaTimes />
            </span>
            <h3>{dashboard?.plan ? 'Изменить план офиса' : 'Задать план офиса'}</h3>
            <div className="plan-form">
              <div className="plan-form-row plan-form-range">
                <label>
                  <span>План на будний день, ₽</span>
                  <input
                    type="number"
                    min={0}
                    value={planForm.dayWeekday}
                    onChange={(e) => setPlanForm(p => ({ ...p, dayWeekday: e.target.value }))}
                    placeholder="например, 200000"
                  />
                </label>
                <label>
                  <span>План на выходной, ₽</span>
                  <input
                    type="number"
                    min={0}
                    value={planForm.dayWeekend}
                    onChange={(e) => setPlanForm(p => ({ ...p, dayWeekend: e.target.value }))}
                    placeholder="например, 100000"
                  />
                </label>
              </div>
              <label className="plan-form-row">
                <span>План на период, ₽</span>
                <input
                  type="number"
                  min={0}
                  value={planForm.period}
                  onChange={(e) => setPlanForm(p => ({ ...p, period: e.target.value }))}
                  placeholder="например, 1000000"
                />
              </label>
              <div className="plan-form-row plan-form-range">
                <label>
                  <span>Период с</span>
                  <input type="date" value={planForm.from} onChange={(e) => setPlanForm(p => ({ ...p, from: e.target.value }))} />
                </label>
                <label>
                  <span>Период по</span>
                  <input type="date" value={planForm.to} onChange={(e) => setPlanForm(p => ({ ...p, to: e.target.value }))} />
                </label>
              </div>
              {planError && <div className="form-error">{planError}</div>}
              <div className="plan-form-actions">
                <button className="btn-secondary" onClick={() => setShowPlanModal(false)} disabled={planSaving}>Отмена</button>
                <button className="btn-primary" onClick={savePlan} disabled={planSaving}>
                  {planSaving ? 'Сохранение…' : 'Сохранить план'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedConsultationEmployee && (() => {
        const cs = selectedConsultationEmployee;
        const { rating, ratingLabel } = computeConsultationRating(cs.conversion);
        const cash = cashById.get(cs.id);
        return (
          <div className="employee-modal-overlay active" onClick={() => setSelectedLawyerId(null)}>
            <div className="modal-content lawyer-modal" onClick={(e) => e.stopPropagation()}>
              <span className="modal-close-icon" onClick={() => setSelectedLawyerId(null)}>
                <FaTimes />
              </span>
              <h3>{cs.name}</h3>
              <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 8 }}>{roleLabel(cs.role)}</div>

              {cs.total_consultations > 0 && (
                <div className="lawyer-rating-row">
                  {renderStars(rating)}
                  <span className={`rating-badge rating-${rating}`}>{ratingLabel}</span>
                </div>
              )}

              <div className="lawyer-summary">
                <div className="lawyer-summary-cell">
                  <div className="cell-label">Консультаций</div>
                  <div className="cell-value">{cs.total_consultations}</div>
                </div>
                <div className="lawyer-summary-cell">
                  <div className="cell-label">Заключено</div>
                  <div className="cell-value" style={{ color: '#138a5d' }}>{cs.contracts_signed}</div>
                </div>
                <div className="lawyer-summary-cell">
                  <div className="cell-label">Не заключено</div>
                  <div className="cell-value" style={{ color: '#c0392b' }}>{cs.contracts_not_signed}</div>
                </div>
                <div className="lawyer-summary-cell">
                  <div className="cell-label">Ожидает</div>
                  <div className="cell-value">{cs.pending}</div>
                </div>
              </div>

              <div className="lawyer-summary" style={{ marginTop: 12 }}>
                <div className="lawyer-summary-cell">
                  <div className="cell-label">Конверсия</div>
                  <div className="cell-value" style={{ fontWeight: 700 }}>
                    {cs.total_consultations > 0 ? `${cs.conversion}%` : '—'}
                  </div>
                </div>
                <div className="lawyer-summary-cell">
                  <div className="cell-label">Касса сегодня</div>
                  <div className="cell-value">{cash ? `${Math.round(cash.today).toLocaleString('ru-RU')} \u20BD` : '0 \u20BD'}</div>
                </div>
                <div className="lawyer-summary-cell">
                  <div className="cell-label">Касса за период</div>
                  <div className="cell-value" style={{ fontWeight: 700 }}>{cash ? `${Math.round(cash.period).toLocaleString('ru-RU')} \u20BD` : '0 \u20BD'}</div>
                </div>
              </div>

              {cs.total_consultations > 0 && (
                <div className="modal-section" style={{ marginTop: 16 }}>
                  <h4>Оценка эффективности</h4>
                  <div style={{ padding: '10px 0', fontSize: 14, lineHeight: 1.6 }}>
                    <p>Из <b>{cs.total_consultations}</b> консультаций договор заключён в <b>{cs.contracts_signed}</b> случаях.</p>
                    <p>Конверсия: <b>{cs.conversion}%</b> — <span className={`rating-badge rating-${rating}`} style={{ display: 'inline' }}>{ratingLabel}</span></p>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default Office;
