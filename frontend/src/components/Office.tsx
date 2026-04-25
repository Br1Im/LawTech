import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import "./OfficeContent.css";
import "./OfficeAnimated.css";
import "./OfficeMobile.css";
import "./OfficePolish.css";
import StatCard from "./StatCard";
import { FaUsers, FaChartLine, FaCalendarAlt, FaBuilding, FaTimes, FaArrowRight, FaEdit, FaMapMarkerAlt, FaStar, FaRegStar, FaTrophy } from "react-icons/fa";
import { GrAdd } from "react-icons/gr";
import { Modal, Form, Input, Button, message } from "antd";
import { buildApiUrl } from "../shared/utils/apiUtils";
import { useOffice } from "../shared/contexts/OfficeContext";
import { officeAPI } from "../shared/api/office";

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
  const [offices, setOffices] = useState<Office[]>([]);
  const { selectedOffice: officeFromContext } = useOffice();
  const [selectedOffice, setSelectedOffice] = useState<Office | null>(null);
  const [hasError, setHasError] = useState(false);
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
            employee_count: Math.max(transformedEmployees.length, 1),
            contact_phone: office.contact_phone || undefined,
            website: office.website || undefined,
            chartData: office.chartData,
            previousRevenue: transformedEmployees.reduce((total: number, employee: any) => total + (employee.periodRevenue || 0), 0),
            previousVisits: office.stats?.visits ? office.stats.visits * 0.9 : 0
          };
        });

        // Если сервер вернул офисы – используем их, иначе применяем мок-данные
        if (transformedOffices.length > 0) {
          setOffices(transformedOffices);
          // Проверяем, что массив не пустой перед обращением к индексу
          if (transformedOffices && transformedOffices.length > 0) {
            console.log("🏢 Выбираем первый офис при загрузке:", transformedOffices[0].title);
            setSelectedOffice(transformedOffices[0]);
          }
          // После загрузки офисов сразу запрашиваем данные для графика
          fetchOfficeRevenueData(transformedOffices);
        } else {
          throw new Error('Сервер вернул пустой список офисов');
        }
      } catch (err) {
        console.error('❌ Ошибка при получении офисов:', err);
        // Устанавливаем состояние ошибки вместо показа пустых данных
        setHasError(true);
        setOffices([]);
        setSelectedOffice(null);
      }
    };
    fetchOffices();
  }, [period]);



  // Гарантируем выбор первого офиса, если ничего не выбрано
  useEffect(() => {
    if (!selectedOffice && offices.length > 0) {
      console.log("🔄 Принудительно выбираем первый офис:", offices[0].title);
      setSelectedOffice(offices[0]);
    }
  }, [offices, selectedOffice]);

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
          headers: { Authorization: `Bearer ${token}` },
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

  const isDirector = (() => {
    try {
      const t = localStorage.getItem('token');
      if (!t) return false;
      const payload = JSON.parse(atob(t.split('.')[1] || ''));
      return (payload.role || '').toLowerCase() === 'director';
    } catch { return false; }
  })();

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
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
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
        headers: { Authorization: `Bearer ${token}` },
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
          headers: { Authorization: `Bearer ${token}` },
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

  const handleOfficeClick = (office: Office) => {
    setSelectedOffice(office);
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
        headers: {
          Authorization: `Bearer ${token}`
        }
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
        // Если запрос не удался, устанавливаем моковые значения
        const mockRevenue = currentOffices.map(office => ({
          id: office.id,
          name: office.title,
          revenue: periodLabels.map(() => Math.floor(30000 + Math.random() * 40000))
        }));
        setOfficeRevenueData({
          labels: periodLabels,
          offices: mockRevenue,
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

      const response = await fetch(buildApiUrl('/office'), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          id: selectedOffice?.id,
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

      // Получаем данные текущего пользователя
      const profileResponse = await fetch(buildApiUrl('/profile'), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!profileResponse.ok) {
        throw new Error('Не удалось получить данные профиля');
      }

      const profileData = await profileResponse.json();

      // Создаем офис через API
      const response = await fetch(buildApiUrl('/office'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ...values,
          owner_id: profileData.id,
          // Добавляем данные ИП
          ip_surname: values.ipSurname,
          ip_name: values.ipName,
          ip_middle_name: values.ipMiddleName,
          // Добавляем ИНН и ОГРН
          inn: values.inn,
          ogrn: values.ogrn,
          // Обновляем поля телефонов
          work_phone: values.contactPhone,
          work_phone2: values.work_phone2
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

  // ===== Аналитика по юристам =====
  const lawyerEmployees = (selectedOffice?.employees || []).filter(emp =>
    emp?.position?.toLowerCase().includes('юрист') || emp?.position?.toLowerCase().includes('адвокат')
  );

  const extractTopic = (title: string): string => {
    if (!title) return 'Без темы';
    const idx = title.indexOf(' - ');
    return idx > 0 ? title.slice(0, idx).trim() : title.trim();
  };

  type LawyerStats = {
    total: number;
    completed: number;
    closeRate: number;
    rating: 0 | 1 | 2 | 3;
    ratingLabel: string;
    bestTopic: { topic: string; rate: number; total: number } | null;
    topics: Array<{ topic: string; total: number; completed: number; rate: number }>;
  };

  const computeLawyerStats = (employeeId: string | number): LawyerStats => {
    const eid = Number(employeeId);
    const own = contracts.filter(c => Number(c.id_employee) === eid);
    const total = own.length;
    const completed = own.filter(c => (c.status || '').toLowerCase() === 'completed').length;
    const closeRate = total > 0 ? (completed / total) * 100 : 0;
    const byTopic = new Map<string, { total: number; completed: number }>();
    own.forEach(c => {
      const topic = extractTopic(c.title || '');
      const cur = byTopic.get(topic) || { total: 0, completed: 0 };
      cur.total += 1;
      if ((c.status || '').toLowerCase() === 'completed') cur.completed += 1;
      byTopic.set(topic, cur);
    });
    const topics = Array.from(byTopic.entries())
      .map(([topic, v]) => ({ topic, total: v.total, completed: v.completed, rate: v.total > 0 ? (v.completed / v.total) * 100 : 0 }))
      .sort((a, b) => b.rate - a.rate || b.total - a.total);
    const bestTopic = topics.length > 0 && topics[0].total > 0 ? { topic: topics[0].topic, rate: topics[0].rate, total: topics[0].total } : null;
    let rating: 0 | 1 | 2 | 3 = 0;
    let ratingLabel = 'Низкий';
    if (closeRate >= 33) { rating = 3; ratingLabel = 'Идеальный'; }
    else if (closeRate >= 25) { rating = 2; ratingLabel = 'Хороший'; }
    else if (closeRate >= 15) { rating = 1; ratingLabel = 'Средний'; }
    return { total, completed, closeRate, rating, ratingLabel, bestTopic, topics };
  };

  const renderStars = (rating: 0 | 1 | 2 | 3) => (
    <span className="lawyer-rating-stars" aria-label={`Рейтинг ${rating} из 3`}>
      {[1, 2, 3].map(i => i <= rating ? <FaStar key={i} /> : <FaRegStar key={i} />)}
    </span>
  );

  const selectedLawyer = selectedLawyerId
    ? lawyerEmployees.find(e => String(e.id) === String(selectedLawyerId)) || null
    : null;
  const selectedLawyerStats = selectedLawyer ? computeLawyerStats(selectedLawyer.id) : null;

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
              window.location.reload();
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
      <div className="office-header animate-fade-in-up">
        <h2><FaBuilding className="header-icon" /> Управление офисами</h2>
        
        <div className="period-selector">
          <div className="period-dropdown">
            <div 
              ref={dropdownButtonRef}
              className={`period-dropdown-header ${showPeriodDropdown ? 'active' : ''}`} 
              onClick={() => {
                if (!showPeriodDropdown && dropdownButtonRef.current) {
                  const rect = dropdownButtonRef.current.getBoundingClientRect();
                  setDropdownPosition({
                    top: rect.bottom + window.scrollY,
                    left: rect.left + window.scrollX,
                    width: rect.width
                  });
                }
                setShowPeriodDropdown(!showPeriodDropdown);
              }}
            >
              <FaCalendarAlt className="calendar-icon" />
              <span className="selected-period">{getPeriodText()}</span>
              <span className="dropdown-arrow"></span>
            </div>
            {showPeriodDropdown && createPortal(
              <div 
                ref={dropdownContentRef}
                className="period-dropdown-content"
                style={{
                  position: 'fixed',
                  top: `${dropdownPosition.top}px`,
                  left: `${dropdownPosition.left}px`,
                  minWidth: `${dropdownPosition.width}px`
                }}
              >
                {([
                  { v: 'day', t: 'Сегодня' },
                  { v: 'yesterday', t: 'Вчера' },
                  { v: 'week', t: 'Неделя' },
                  { v: '2weeks', t: '2 недели' },
                  { v: 'month', t: 'Месяц' },
                  { v: 'custom', t: 'Произвольный период' },
                ] as Array<{ v: PeriodType; t: string }>).map(opt => (
                  <div
                    key={opt.v}
                    className={`period-option ${period === opt.v ? 'active' : ''}`}
                    onClick={() => {
                      handlePeriodChange(opt.v);
                      setShowPeriodDropdown(false);
                    }}
                  >
                    {opt.t}
                  </div>
                ))}
                {period === 'custom' && (
                  <div className="period-custom-range" onClick={(e) => e.stopPropagation()}>
                    <label>С<input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} /></label>
                    <label>По<input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} /></label>
                  </div>
                )}
              </div>,
              document.body
            )}
          </div>
        </div>
      </div>
      
      <div className="main-content-wrapper animate-fade-in-up">
        {/* Блок 1: Верхний левый - Карточки офисов и статистика */}
        <div className="office-left-column">
          <div className="top-four">
            <div className="office-cards-container">
              <div className="office-cards">
                {offices.map(office => (
                  <div
                    key={office.id}
                    className={`office-card ${selectedOffice?.id === office.id ? "selected" : ""}`}
                    onClick={() => handleOfficeClick(office)}
                  >
                    <div className="office-card-header">
                      <h3>{office.title}</h3>
                      {selectedOffice?.id === office.id && (
                        <button 
                          className="expand-button office-info-button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowOfficeInfoModal(true);
                          }}
                          title="Открыть информацию об офисе"
                        >
                          <FaArrowRight />
                        </button>
                      )}
                    </div>
                    <div className="office-card-info">
                      <p><FaUsers /> <b>Сотрудники:</b> {Math.max(office.employee_count || 0, 1)}</p>
                      <p><FaMapMarkerAlt /> <b>Адрес:</b> {office.address || "Не указан"}</p>
                    </div>
                  </div>
                ))}
                {!isOfficeLimit && (
                  <div className="office-add-card" onClick={showAddModal}>
                    <div className="office-add-content">
                      <GrAdd className="add-icon" />
                      <span>Добавить офис</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {selectedOffice && (() => {
              const dayFact = Number(dashboard?.fact.day || 0);
              const periodFact = Number(dashboard?.fact.period || 0);
              const dayPlan = Number(dashboard?.plan?.day || 0);
              const periodPlan = Number(dashboard?.plan?.period || 0);
              const dayPct = dayPlan > 0 ? (dayFact / dayPlan) * 100 : null;
              const periodPct = periodPlan > 0 ? (periodFact / periodPlan) * 100 : null;
              const tier = (pct: number | null) =>
                pct === null ? 'plan-empty' : pct >= 100 ? 'plan-good' : pct >= 50 ? 'plan-warn' : 'plan-bad';
              const fmt = (v: number) => `${Math.round(v).toLocaleString('ru-RU')} ₽`;
              return (
                <div className="plan-fact-block">
                  <div className="plan-fact-header">
                    <h4 className="section-title">План / Факт</h4>
                    {isDirector && (
                      <button className="btn-secondary plan-edit-btn" onClick={openPlanEditor}>
                        <FaEdit /> {dashboard?.plan ? 'Изменить план' : 'Задать план'}
                      </button>
                    )}
                  </div>
                  <div className="plan-fact-grid">
                    <div className={`plan-fact-card ${tier(dayPct)}`}>
                      <div className="plan-fact-label">
                        План на день
                        {dashboard?.plan?.day_kind && (
                          <span className="plan-day-kind">
                            {dashboard.plan.day_kind === 'weekend' ? '— выходной' : '— будний'}
                          </span>
                        )}
                      </div>
                      <div className="plan-fact-value">
                        <span className="fact">{fmt(dayFact)}</span>
                        <span className="sep">/</span>
                        <span className="plan">{dayPlan > 0 ? fmt(dayPlan) : '—'}</span>
                      </div>
                      <div className="plan-fact-progress">
                        <div className="plan-fact-bar" style={{ width: `${Math.min(dayPct ?? 0, 100)}%` }} />
                      </div>
                      <div className="plan-fact-pct">{dayPct === null ? 'План не задан' : `${dayPct.toFixed(0)}%`}</div>
                    </div>
                    <div className={`plan-fact-card ${tier(periodPct)}`}>
                      <div className="plan-fact-label">
                        План на период
                        {dashboard?.plan?.period_start && dashboard?.plan?.period_end && (
                          <span className="period-range"> ({dashboard.plan.period_start.slice(0, 10)} — {dashboard.plan.period_end.slice(0, 10)})</span>
                        )}
                      </div>
                      <div className="plan-fact-value">
                        <span className="fact">{fmt(periodFact)}</span>
                        <span className="sep">/</span>
                        <span className="plan">{periodPlan > 0 ? fmt(periodPlan) : '—'}</span>
                      </div>
                      <div className="plan-fact-progress">
                        <div className="plan-fact-bar" style={{ width: `${Math.min(periodPct ?? 0, 100)}%` }} />
                      </div>
                      <div className="plan-fact-pct">{periodPct === null ? 'План не задан' : `${periodPct.toFixed(0)}%`}</div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Блок 2: Юристы офиса с рейтингом */}
        {selectedOffice && (
          <div className="employee-table-container-container lawyers-block">
            <div className="employee-table-container">
              <div className="table-header">
                <h4 className="section-title">Юристы офиса {selectedOffice.title}</h4>
                <div className="lawyers-legend">
                  <span className="legend-item"><FaStar /><FaStar /><FaStar /> ≥ 33% — идеальный</span>
                  <span className="legend-item"><FaStar /><FaStar /> 25–32% — хороший</span>
                  <span className="legend-item"><FaStar /> 15–24% — средний</span>
                </div>
              </div>
              <table className="employee-stats-table lawyers-table">
                <thead>
                  <tr>
                    <th>Юрист</th>
                    <th className="num">Договоров</th>
                    <th className="num">Закрыто</th>
                    <th className="num">Процент закрытия</th>
                    <th>Рейтинг</th>
                  </tr>
                </thead>
                <tbody>
                  {lawyerEmployees.length > 0 ? (
                    lawyerEmployees.map((employee) => {
                      const s = computeLawyerStats(employee.id);
                      const fullName = `${employee.surname || ''} ${employee.name || ''} ${employee.middle_name || ''}`.trim() || 'Юрист';
                      return (
                        <tr
                          key={employee.id}
                          className="lawyer-row"
                          onClick={() => setSelectedLawyerId(String(employee.id))}
                          title="Открыть статистику юриста"
                        >
                          <td>{fullName}</td>
                          <td className="num">{s.total}</td>
                          <td className="num">{s.completed}</td>
                          <td className="num">{s.total > 0 ? `${s.closeRate.toFixed(1)}%` : '—'}</td>
                          <td>
                            {renderStars(s.rating)}
                            <span className={`rating-badge rating-${s.rating}`}>{s.ratingLabel}</span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="no-data">В офисе нет юристов</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Блок 3: Касса юристов (ФИО / Касса за сегодня / Касса за период) */}
        {selectedOffice && (
          <div className="employee-table-container-container lawyers-block">
            <div className="employee-table-container">
              <div className="table-header">
                <h4 className="section-title">Касса юристов</h4>
                <div className="table-subtitle">Только заключённые и оплаченные договоры за выбранный период ({getPeriodText().toLowerCase()})</div>
              </div>
              <table className="employee-stats-table lawyers-cash-table">
                <thead>
                  <tr>
                    <th>ФИО юриста</th>
                    <th className="num">Касса за сегодня</th>
                    <th className="num">Касса за период</th>
                  </tr>
                </thead>
                <tbody>
                  {(dashboard?.lawyers_cash || []).length > 0 ? (
                    (dashboard?.lawyers_cash || []).map(l => (
                      <tr key={`cash-${l.id}`}>
                        <td>{l.full_name || 'Юрист'}</td>
                        <td className="num">{`${Math.round(l.today).toLocaleString('ru-RU')} ₽`}</td>
                        <td className="num strong">{`${Math.round(l.period).toLocaleString('ru-RU')} ₽`}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="no-data">В офисе пока нет юристов или сделок</td>
                    </tr>
                  )}
                </tbody>
                {(dashboard?.lawyers_cash || []).length > 0 && (
                  <tfoot>
                    <tr>
                      <td><b>Итого</b></td>
                      <td className="num"><b>{`${Math.round((dashboard?.lawyers_cash || []).reduce((s, l) => s + l.today, 0)).toLocaleString('ru-RU')} ₽`}</b></td>
                      <td className="num"><b>{`${Math.round((dashboard?.lawyers_cash || []).reduce((s, l) => s + l.period, 0)).toLocaleString('ru-RU')} ₽`}</b></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}
      </div>

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
            htmlType="submit"
            loading={isSubmitting}
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
            htmlType="submit"
            loading={isSubmitting}
            style={{ backgroundColor: 'var(--color-accent)', borderColor: 'var(--color-accent)' }}
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
                <p><strong>Количество сотрудников:</strong> {Math.max(selectedOffice.employee_count || 0, 1)}</p>
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
              {!isOfficeLimit && (
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

      {selectedLawyer && selectedLawyerStats && (
        <div className="employee-modal-overlay active" onClick={() => setSelectedLawyerId(null)}>
          <div className="modal-content lawyer-modal" onClick={(e) => e.stopPropagation()}>
            <span className="modal-close-icon" onClick={() => setSelectedLawyerId(null)}>
              <FaTimes />
            </span>
            <h3>
              {`${selectedLawyer.surname || 'Юрист'} ${selectedLawyer.name || ''} ${selectedLawyer.middle_name || ''}`.trim()}
            </h3>
            <div className="lawyer-rating-row">
              {renderStars(selectedLawyerStats.rating)}
              <span className={`rating-badge rating-${selectedLawyerStats.rating}`}>{selectedLawyerStats.ratingLabel}</span>
            </div>

            <div className="lawyer-summary">
              <div className="lawyer-summary-cell">
                <div className="cell-label">Договоров</div>
                <div className="cell-value">{selectedLawyerStats.total}</div>
              </div>
              <div className="lawyer-summary-cell">
                <div className="cell-label">Закрыто</div>
                <div className="cell-value">{selectedLawyerStats.completed}</div>
              </div>
              <div className="lawyer-summary-cell">
                <div className="cell-label">Процент закрытия</div>
                <div className="cell-value">{selectedLawyerStats.total > 0 ? `${selectedLawyerStats.closeRate.toFixed(1)}%` : '—'}</div>
              </div>
            </div>

            <div className="modal-section">
              <h4><FaTrophy /> Лучшая тематика</h4>
              {selectedLawyerStats.bestTopic && selectedLawyerStats.completed > 0 ? (
                <p>
                  <b>{selectedLawyerStats.bestTopic.topic}</b> — {selectedLawyerStats.bestTopic.rate.toFixed(1)}% закрытия
                  {' '}({selectedLawyerStats.bestTopic.total} {selectedLawyerStats.bestTopic.total === 1 ? 'договор' : 'договоров'})
                </p>
              ) : (
                <p className="muted">Пока нет завершённых договоров — статистика по темам появится после закрытия первых сделок.</p>
              )}
            </div>

            <div className="modal-section">
              <h4>Статистика по тематикам</h4>
              {selectedLawyerStats.topics.length > 0 ? (
                <table className="employee-stats-table lawyer-topics-table">
                  <thead>
                    <tr>
                      <th>Тема</th>
                      <th className="num">Всего</th>
                      <th className="num">Закрыто</th>
                      <th className="num">% закрытия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedLawyerStats.topics.map(t => (
                      <tr key={t.topic}>
                        <td>{t.topic}</td>
                        <td className="num">{t.total}</td>
                        <td className="num">{t.completed}</td>
                        <td className="num">{`${t.rate.toFixed(1)}%`}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="muted">У юриста пока нет договоров.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Office;
