import { useState, useEffect } from "react";
import "./OfficeContent.css";
import StatCard from "../components/StatCard";
import { FaUsers, FaChartLine, FaCalendarAlt, FaBuilding, FaTimes, FaArrowRight, FaEdit } from "react-icons/fa";
import { GrAdd } from "react-icons/gr";
import PieChartComponent from "./PieChartComponent";
import BarChartComponent from "./BarChartComponent";
import { Modal, Form, Input, Button, message } from "antd";
import { buildApiUrl } from "../shared/utils/apiUtils";

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
  // Поля для ИП
  ip_surname?: string;
  ip_name?: string;
  ip_middle_name?: string;
  // Поля для ИНН и ОГРН
  inn?: string;
  ogrn?: string;
}

type PeriodType = "day" | "2weeks" | "month";

// Функция для расчета процентного изменения
const calculatePercentageChange = (current: number, previous: number): { percentage: string | null; isIncrease: boolean | null } => {
  if (previous === 0) return { percentage: null, isIncrease: null };
  if (current === previous) return { percentage: null, isIncrease: null };
  
  const change = ((current - previous) / previous) * 100;
  return {
    percentage: Math.abs(change).toFixed(1),
    isIncrease: change > 0
  };
};

const Office = () => {
  const [offices, setOffices] = useState<Office[]>([]);
  const [selectedOffice, setSelectedOffice] = useState<Office | null>(null);
  const [stats, setStats] = useState({ 
    visits: 0, 
    orders: 0, 
    revenue: 0, 
    pending: 0,
    visitsChange: { percentage: null as string | null, isIncrease: null as boolean | null },
    revenueChange: { percentage: null as string | null, isIncrease: null as boolean | null }
  });
  const [period, setPeriod] = useState<PeriodType>("day");
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [showRevenueModal, setShowRevenueModal] = useState(false);
  const [showOfficeInfoModal, setShowOfficeInfoModal] = useState(false);
  const [showBarChartModal, setShowBarChartModal] = useState(false);
  const [showPieChartModal, setShowPieChartModal] = useState(false);
  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false);
  const [form] = Form.useForm();
  const [addForm] = Form.useForm();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [officeRevenueData, setOfficeRevenueData] = useState<{ labels: string[], offices: { id: string, name: string, revenue: number[] }[] }>({
    labels: [],
    offices: []
  });

  // Проверка, достигнут ли лимит офисов
  const isOfficeLimit = offices.length >= MAX_OFFICES;

  useEffect(() => {
    const fetchOffices = async () => {
      try {
        const response = await fetch(buildApiUrl('/offices'), {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });
        if (!response.ok) throw new Error('Ошибка загрузки офисов');
        const data = await response.json();
        const transformedOffices = data.map((office: {
          id: string;
          name?: string;
          address?: string;
          revenue?: number;
          orders?: number;
          employees?: Employee[];
          data?: number[];
          employee_count?: number;
          contact_phone?: string | null;
          website?: string | null;
          previousRevenue?: number;
          previousVisits?: number;
        }) => ({
          id: office.id,
          title: office.name || "Без названия",
          description: office.address || "Нет описания",
          revenue: office.revenue || 0,
          orders: office.orders || 0,
          employees: office.employees || [],
          data: office.data || [0, 0],
          address: office.address,
          employee_count: office.employee_count,
          contact_phone: office.contact_phone,
          website: office.website,
          // Добавляем предыдущие значения для сравнения или используем случайные значения для демонстрации
          previousRevenue: office.previousRevenue || (office.revenue !== undefined ? office.revenue * (0.9 + Math.random() * 0.2) : 0),
          previousVisits: office.previousVisits || (office.data && office.data[0] !== undefined ? office.data[0] * (0.9 + Math.random() * 0.2) : 0)
        }));

        // Если сервер вернул офисы – используем их, иначе применяем мок-данные
        if (transformedOffices.length > 0) {
          setOffices(transformedOffices);
          setSelectedOffice(transformedOffices[0]);
          // После загрузки офисов сразу запрашиваем данные для графика
          fetchOfficeRevenueData(transformedOffices);
        } else {
          throw new Error('Сервер вернул пустой список офисов');
        }
      } catch (err) {
        console.error('Ошибка при получении офисов, загружаю мок-данные:', err);

        // ----------------------
        // Мок-данные для демонстрации
        // ----------------------
        const sampleOffices: Office[] = [
          {
            id: 'demo-1',
            title: 'Демо офис',
            description: 'г. Москва, ул. Пример, д. 1',
            revenue: 320000,
            orders: 120,
            employees: [
              {
                id: 'emp-1',
                surname: 'Иванов',
                name: 'Иван',
                middle_name: 'Иванович',
                position: 'Юрист',
                dailyContracts: 5,
                totalRevenue14Days: 210000,
                periodRevenue: 180000,
                phone: '+7 900 000-00-00',
                pastRevenue: {},
                closeRate: 0.8,
              },
              {
                id: 'emp-2',
                surname: 'Петров',
                name: 'Пётр',
                middle_name: 'Петрович',
                position: 'Адвокат',
                dailyContracts: 3,
                totalRevenue14Days: 110000,
                periodRevenue: 95000,
                phone: '+7 900 000-00-01',
                pastRevenue: {},
                closeRate: 0.7,
              },
              {
                id: 'emp-3',
                surname: 'Сидорова',
                name: 'Анна',
                middle_name: 'Александровна',
                position: 'Юрист',
                dailyContracts: 4,
                totalRevenue14Days: 150000,
                periodRevenue: 130000,
                phone: '+7 900 000-00-02',
                pastRevenue: {},
                closeRate: 0.75,
              },
              {
                id: 'emp-4',
                surname: 'Козлов',
                name: 'Михаил',
                middle_name: 'Сергеевич',
                position: 'Адвокат',
                dailyContracts: 6,
                totalRevenue14Days: 280000,
                periodRevenue: 250000,
                phone: '+7 900 000-00-03',
                pastRevenue: {},
                closeRate: 0.85,
              },
              {
                id: 'emp-5',
                surname: 'Морозова',
                name: 'Елена',
                middle_name: 'Викторовна',
                position: 'Юрист',
                dailyContracts: 3,
                totalRevenue14Days: 120000,
                periodRevenue: 105000,
                phone: '+7 900 000-00-04',
                pastRevenue: {},
                closeRate: 0.72,
              },
              {
                id: 'emp-6',
                surname: 'Волков',
                name: 'Дмитрий',
                middle_name: 'Андреевич',
                position: 'Адвокат',
                dailyContracts: 5,
                totalRevenue14Days: 190000,
                periodRevenue: 170000,
                phone: '+7 900 000-00-05',
                pastRevenue: {},
                closeRate: 0.78,
              },
              {
                id: 'emp-7',
                surname: 'Смирнов',
                name: 'Алексей',
                middle_name: 'Владимирович',
                position: 'Менеджер',
                dailyContracts: 7,
                totalRevenue14Days: 220000,
                periodRevenue: 200000,
                phone: '+7 900 000-00-06',
                pastRevenue: {},
                closeRate: 0.82,
              },
              {
                id: 'emp-8',
                surname: 'Федорова',
                name: 'Ольга',
                middle_name: 'Николаевна',
                position: 'Представитель',
                dailyContracts: 4,
                totalRevenue14Days: 160000,
                periodRevenue: 140000,
                phone: '+7 900 000-00-07',
                pastRevenue: {},
                closeRate: 0.76,
              },
              {
                id: 'emp-9',
                surname: 'Кузнецов',
                name: 'Сергей',
                middle_name: 'Игоревич',
                position: 'Юрист',
                dailyContracts: 6,
                totalRevenue14Days: 240000,
                periodRevenue: 210000,
                phone: '+7 900 000-00-08',
                pastRevenue: {},
                closeRate: 0.84,
              },
              {
                id: 'emp-10',
                surname: 'Новикова',
                name: 'Мария',
                middle_name: 'Дмитриевна',
                position: 'Эксперт',
                dailyContracts: 3,
                totalRevenue14Days: 130000,
                periodRevenue: 115000,
                phone: '+7 900 000-00-09',
                pastRevenue: {},
                closeRate: 0.73,
              },
              {
                id: 'emp-11',
                surname: 'Лебедев',
                name: 'Андрей',
                middle_name: 'Максимович',
                position: 'ОКК',
                dailyContracts: 5,
                totalRevenue14Days: 180000,
                periodRevenue: 160000,
                phone: '+7 900 000-00-10',
                pastRevenue: {},
                closeRate: 0.79,
              },
            ],
            data: [20, 8], // visits / pending
            address: 'г. Москва, ул. Пример, д. 1',
            employee_count: 11,
            contact_phone: '+7 900 000-00-02',
            website: 'https://law-demo.ru',
            previousRevenue: 280000,
            previousVisits: 100,
          },
        ];

        setOffices(sampleOffices);
        setSelectedOffice(sampleOffices[0]);

        // Простейшие данные для графика
        const demoLabels = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
        setOfficeRevenueData({
          labels: demoLabels,
          offices: [
            {
              id: 'demo-1',
              name: 'Демо офис',
              revenue: [50000, 45000, 40000, 60000, 55000, 35000],
            },
          ],
        });
      }
    };
    fetchOffices();
  }, []);

  useEffect(() => {
    if (selectedOffice) {
      const currentVisits = selectedOffice.data[0] || 0;
      const previousVisits = selectedOffice.previousVisits || 0;
      const currentRevenue = selectedOffice.revenue || 0;
      const previousRevenue = selectedOffice.previousRevenue || 0;

      const visitsChange = calculatePercentageChange(currentVisits, previousVisits);
      const revenueChange = calculatePercentageChange(currentRevenue, previousRevenue);

      setStats({
        visits: currentVisits,
        orders: selectedOffice.orders || 0,
        revenue: currentRevenue,
        pending: selectedOffice.data[1] || 0,
        visitsChange,
        revenueChange
      });
    }
  }, [selectedOffice]);

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
      case "day":
        return "День";
      case "2weeks":
        return "Период";
      case "month":
        return "Месяц";
      default:
        return "День";
    }
  };

  const getComparisonText = (isIncrease: boolean | null) => {
    if (isIncrease === null) return `Без изменений (${getPeriodText()})`;
    return isIncrease ? `Больше чем вчера (${getPeriodText()})` : `Меньше чем вчера (${getPeriodText()})`;
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

  return (
    <div className="office-content">
      <div className="office-header">
        <h2><FaBuilding className="header-icon" /> Управление офисами</h2>
        
        <div className="period-selector">
          <div className="period-dropdown">
            <div 
              className={`period-dropdown-header ${showPeriodDropdown ? 'active' : ''}`} 
              onClick={() => setShowPeriodDropdown(!showPeriodDropdown)}
            >
              <FaCalendarAlt className="calendar-icon" />
              <span className="selected-period">{getPeriodText()}</span>
              <span className="dropdown-arrow"></span>
            </div>
            {showPeriodDropdown && (
              <div className="period-dropdown-content">
                <div 
                  className={`period-option ${period === "day" ? "active" : ""}`} 
                  onClick={() => {
                    handlePeriodChange("day");
                    setShowPeriodDropdown(false);
                  }}
                >
                  День
                </div>
                <div 
                  className={`period-option ${period === "2weeks" ? "active" : ""}`}
                  onClick={() => {
                    handlePeriodChange("2weeks");
                    setShowPeriodDropdown(false);
                  }}
                >
                  Период
                </div>
                <div 
                  className={`period-option ${period === "month" ? "active" : ""}`}
                  onClick={() => {
                    handlePeriodChange("month");
                    setShowPeriodDropdown(false);
                  }}
                >
                  Месяц
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="main-content-wrapper">
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
                      <p><b>Сотрудники:</b> {office.employee_count || 0}</p>
                      <p><b>Адрес:</b> {office.address || "Не указан"}</p>
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

            {selectedOffice && (
              <>
                <div className="statCard-content">
                  <div className="expand-button-container">
                    <button 
                      className="expand-button" 
                      onClick={() => setShowRevenueModal(true)}
                      title="Открыть подробную информацию"
                    >
                      <FaArrowRight />
                    </button>
                  </div>
                  <StatCard
                    title="Приходы"
                    value={stats.visits.toLocaleString() + ""}
                    icon={<FaUsers />}
                    colorIcon="#8280FF"
                    percentage={stats.visitsChange.percentage}
                    isIncrease={stats.visitsChange.isIncrease}
                    description={getComparisonText(stats.visitsChange.isIncrease)}
                  />
                  <StatCard
                    title="Общая выручка"
                    value={stats.revenue.toLocaleString() + " ₽"}
                    icon={<FaChartLine />}
                    percentage={stats.revenueChange.percentage}
                    colorIcon="#4AD991"
                    isIncrease={stats.revenueChange.isIncrease}
                    description={getComparisonText(stats.revenueChange.isIncrease)}
                  />
                </div>
              </>
            )}
          </div>
          <div className="chart-box-container">
            <div className="chart-box" style={{ padding: '10px', position: 'relative' }}>
                
                  <button 
                    className="expand-button" 
                    onClick={() => setShowBarChartModal(true)}
                    title="Открыть подробную информацию"
                  >
                    <FaArrowRight />
                  </button>
               
                <BarChartComponent 
                  title={`Динамика выручки ${getPeriodText()}`}
                  data={officeRevenueData}
                />
            </div>
          </div>
        </div>
        {selectedOffice && (
              <div className="charts-container">
                <div className="chart-employees">
                  <div className="employee-table-container-container">
                    <div className="employee-table-container">
                      <button 
                        className="expand-button" 
                        onClick={() => setShowEmployeeModal(true)}
                        title="Открыть полную таблицу"
                      >
                        <FaArrowRight />
                      </button>
                      <div className="table-header">
                        <h4 className="section-title">Сотрудники офиса {selectedOffice.title}</h4>
                      </div>
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
                            selectedOffice.employees.map((employee, index) => (
                              <tr 
                                key={employee.id} 
                                style={{ opacity: index === 0 ? 1 : index === 1 ? 0.8 : index === 2 ? 0.6 : index === 3 ? 0.4 : index === 4 ? 0.2 : 0 }}
                              >
                                <td>{`${employee.surname} ${employee.name.charAt(0)}.${employee.middle_name.charAt(0)}.`}</td>
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
                  <div className="chart-box" style={{ position: 'relative' }}>

                      <button 
                        className="expand-button" 
                        onClick={() => setShowPieChartModal(true)}
                        title="Открыть подробную информацию"
                      >
                        <FaArrowRight />
                      </button>
                    <PieChartComponent 
                      title="Выручка по юристам" 
                      data={selectedOffice.employees
                        .filter(emp => emp.position.toLowerCase().includes('юрист') || emp.position.toLowerCase().includes('адвокат'))
                        .map(emp => ({
                          label: `${emp.surname} ${emp.name.charAt(0)}.${emp.middle_name ? emp.middle_name.charAt(0) + '.' : ''}`,
                          value: emp.totalRevenue14Days || 0
                        }))
                      }
                    />
                  </div>
                  </div>
              </div>
        )}
      </div>

      {/* Модальное окно редактирования офиса */}
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
            onClick={handleEditSubmit}
          >
            Сохранить
          </Button>,
        ]}
      >
        <Form
          form={form}
          layout="vertical"
          name="edit_office_form"
        >
          <Form.Item
            name="officeName"
            label="Название офиса"
            rules={[{ required: true, message: 'Пожалуйста, введите название офиса' }]}
          >
            <Input placeholder="Введите название офиса" />
          </Form.Item>
          
          {/* Подпункт ИП */}
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

      {/* Модальное окно добавления офиса */}
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
            onClick={handleAddSubmit}
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
        >
          <Form.Item
            name="officeName"
            label="Название офиса"
            rules={[{ required: true, message: 'Пожалуйста, введите название офиса' }]}
          >
            <Input placeholder="Введите название офиса" />
          </Form.Item>
          
          {/* Блок полей для ИП */}
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
      
      {/* Модальное окно с информацией об офисе */}
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
                <p><strong>ФИО:</strong> {`${selectedOffice.ip_surname || ''} ${selectedOffice.ip_name || ''} ${selectedOffice.ip_middle_name || ''}`}</p>
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
      
      {/* Модальное окно с полной таблицей сотрудников */}
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
                        <td>{`${employee.surname} ${employee.name.charAt(0)}.${employee.middle_name.charAt(0)}.`}</td>
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

      {/* Модальное окно с подробной информацией о приходах и выручке */}
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
                <h4>Общая выручка</h4>
                <p><b>Всего за {getPeriodText()}:</b> {stats.revenue.toLocaleString()} ₽</p>
                <p><b>Изменение:</b> {stats.revenueChange.percentage}% {stats.revenueChange.isIncrease ? 'больше' : 'меньше'} по сравнению с предыдущим периодом</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно с подробной информацией о графике выручки */}
      {selectedOffice && (
        <div className={`employee-modal-overlay ${showBarChartModal ? 'active' : ''}`}>
          <div className="modal-content">
            <span className="modal-close-icon" onClick={() => setShowBarChartModal(false)}>
              <FaTimes />
            </span>
            <h3>Динамика выручки {getPeriodText()}</h3>
            <div className="chart-modal-content">
              <div className="modal-section">
                <BarChartComponent 
                  title={`Динамика выручки ${getPeriodText()}`}
                  data={officeRevenueData}
                  height={400}
                />
              </div>
              <div className="modal-section">
                <h4>Анализ динамики выручки</h4>
                <p><b>Период:</b> {getPeriodText()}</p>
                <p><b>Общая выручка:</b> {stats.revenue.toLocaleString()} ₽</p>
                <p><b>Средняя выручка в день:</b> {Math.round(stats.revenue / (period === "day" ? 1 : period === "2weeks" ? 14 : 30)).toLocaleString()} ₽</p>
                <p><b>Изменение:</b> {stats.revenueChange.percentage}% {stats.revenueChange.isIncrease ? 'больше' : 'меньше'} по сравнению с предыдущим периодом</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно с подробной информацией о круговой диаграмме */}
      {selectedOffice && (
        <div className={`employee-modal-overlay ${showPieChartModal ? 'active' : ''}`}>
          <div className="modal-content">
            <span className="modal-close-icon" onClick={() => setShowPieChartModal(false)}>
              <FaTimes />
            </span>
            <h3>Выручка по юристам</h3>
            <div className="chart-modal-content">
              <div className="modal-section">
                <PieChartComponent 
                  title="Выручка по юристам" 
                  data={selectedOffice.employees
                    .filter(emp => emp.position.toLowerCase().includes('юрист') || emp.position.toLowerCase().includes('адвокат'))
                    .map(emp => ({
                      label: `${emp.surname} ${emp.name.charAt(0)}.${emp.middle_name ? emp.middle_name.charAt(0) + '.' : ''}`,
                      value: emp.totalRevenue14Days || 0
                    }))
                  }
                  height={400}
                />
              </div>
              <div className="modal-section">
                <h4>Детальная информация</h4>
                <table className="employee-stats-table">
                  <thead>
                    <tr>
                      <th>Юрист</th>
                      <th>Выручка</th>
                      <th>Доля</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOffice.employees
                      .filter(emp => emp.position.toLowerCase().includes('юрист') || emp.position.toLowerCase().includes('адвокат'))
                      .map(employee => {
                        const totalRevenue = selectedOffice.employees
                          .filter(emp => emp.position.toLowerCase().includes('юрист') || emp.position.toLowerCase().includes('адвокат'))
                          .reduce((sum, emp) => sum + (emp.totalRevenue14Days || 0), 0);
                        const percentage = totalRevenue > 0 ? ((employee.totalRevenue14Days || 0) / totalRevenue * 100).toFixed(1) : '0';
                        return (
                          <tr key={employee.id}>
                            <td>{`${employee.surname} ${employee.name.charAt(0)}.${employee.middle_name.charAt(0)}.`}</td>
                            <td>{employee.totalRevenue14Days?.toLocaleString() || '0'} ₽</td>
                            <td>{percentage}%</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
                <p><b>Средний чек:</b> {stats.visits > 0 ? Math.round(stats.revenue / stats.visits).toLocaleString() : 0} ₽</p>
              </div>
              <div className="modal-section">
                <h4>Статистика по периодам</h4>
                <div className="period-chart">
                  <BarChartComponent 
                    title="Динамика выручки"
                    data={officeRevenueData}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Office;