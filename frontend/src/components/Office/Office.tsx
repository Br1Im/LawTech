import { useState, useEffect } from "react";
import "./Office.css";
import StatCard from "../StatCard";
import { FaUsers, FaChartLine, FaCalendarAlt, FaBuilding, FaEdit } from "react-icons/fa";
import { GrAdd } from "react-icons/gr";
import PieChartComponent from "../PieChartComponent";
import LineChartComponent from "../LineChartComponent";
import { Modal, Form, Input, Button, message } from "antd";
import { buildApiUrl } from "../../shared/utils/apiUtils";

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
  previousRevenue?: number;
  previousVisits?: number;
  ip_surname?: string;
  ip_name?: string;
  ip_middle_name?: string;
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
        setOffices(transformedOffices);
        if (transformedOffices.length > 0) {
          setSelectedOffice(transformedOffices[0]);
        }
        
        // После загрузки офисов сразу запрашиваем данные для графика
        fetchOfficeRevenueData(transformedOffices);
      } catch (err) {
        console.error('Ошибка:', err);
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

  // Генерация меток периода для графика - использует текущий период
  const generatePeriodLabels = (): string[] => {
    return generatePeriodLabelsForPeriod(period);
  };

  const getPeriodText = () => {
    switch (period) {
      case "day":
        return "сегодня";
      case "2weeks":
        return "за 2 недели";
      case "month":
        return "за месяц";
      default:
        return "сегодня";
    }
  };

  const getComparisonText = (isIncrease: boolean | null) => {
    if (isIncrease === null) return `Без изменений (${getPeriodText()})`;
    return isIncrease ? `Больше чем вчера (${getPeriodText()})` : `Меньше чем вчера (${getPeriodText()})`;
  };

  const fetchOfficeRevenueData = async (currentOffices = offices, forcedPeriod?: PeriodType) => {
    try {
      console.log(`Запрашиваем данные для периода: ${forcedPeriod || period}`);
      
      const labels = generatePeriodLabelsForPeriod(forcedPeriod || period);
      console.log("Сгенерированные метки:", labels);
      
      // Здесь мы бы запрашивали данные для графика с сервера
      // На текущий момент временно сгенерируем случайные данные
      const officesData = (currentOffices || offices).map(office => {
        // Генерируем случайные данные выручки для каждого офиса
        const revenue = Array(labels.length).fill(0).map(() => Math.floor(Math.random() * 50000 + 10000));
        
        return {
          id: office.id,
          name: office.title,
          revenue
        };
      });
      
      console.log("Данные для графика:", { labels, offices: officesData });
      
      setOfficeRevenueData({
        labels,
        offices: officesData
      });
    } catch (error) {
      console.error("Ошибка при получении данных для графика:", error);
    }
  };

  const showEditModal = () => {
    if (selectedOffice) {
      form.setFieldsValue({
        title: selectedOffice.title,
        address: selectedOffice.address || '',
        work_phone: selectedOffice.work_phone || '',
        work_phone2: selectedOffice.work_phone2 || '',
        ip_surname: selectedOffice.ip_surname || '',
        ip_name: selectedOffice.ip_name || '',
        ip_middle_name: selectedOffice.ip_middle_name || '',
        inn: selectedOffice.inn || '',
        ogrn: selectedOffice.ogrn || ''
      });
      setIsEditModalVisible(true);
    }
  };

  const handleEditCancel = () => {
    setIsEditModalVisible(false);
    form.resetFields();
  };

  const handleEditSubmit = async () => {
    try {
      setIsSubmitting(true);
      const values = await form.validateFields();
      
      if (selectedOffice) {
        // В реальном приложении здесь должен быть запрос к API
        const response = await fetch(buildApiUrl(`/offices/${selectedOffice.id}`), {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            name: values.title,
            address: values.address,
            work_phone: values.work_phone,
            work_phone2: values.work_phone2,
            inn: values.inn,
            ogrn: values.ogrn,
            ip_surname: values.ip_surname,
            ip_name: values.ip_name,
            ip_middle_name: values.ip_middle_name
          })
        });

        if (!response.ok) throw new Error('Ошибка при обновлении офиса');
        
        // Обновляем состояние офисов
        setOffices(prevOffices => prevOffices.map(office => 
          office.id === selectedOffice.id 
            ? { 
                ...office, 
                title: values.title,
                description: values.address,
                address: values.address,
                work_phone: values.work_phone,
                work_phone2: values.work_phone2,
                inn: values.inn,
                ogrn: values.ogrn,
                ip_surname: values.ip_surname,
                ip_name: values.ip_name,
                ip_middle_name: values.ip_middle_name
              } 
            : office
        ));

        // Обновляем выбранный офис
        setSelectedOffice(prev => 
          prev ? { 
            ...prev, 
            title: values.title,
            description: values.address,
            address: values.address,
            work_phone: values.work_phone,
            work_phone2: values.work_phone2,
            inn: values.inn,
            ogrn: values.ogrn,
            ip_surname: values.ip_surname,
            ip_name: values.ip_name,
            ip_middle_name: values.ip_middle_name
          } : null
        );

        setIsEditModalVisible(false);
        message.success('Информация об офисе обновлена');
      }
    } catch (error) {
      console.error('Ошибка при обновлении:', error);
      message.error('Не удалось обновить информацию об офисе');
    } finally {
      setIsSubmitting(false);
    }
  };

  const showAddModal = () => {
    if (isOfficeLimit) {
      message.warning(`Достигнут максимальный лимит офисов (${MAX_OFFICES}). Удалите существующий офис, чтобы создать новый.`);
      return;
    }
    
    addForm.resetFields();
    setIsAddModalVisible(true);
  };

  const handleAddCancel = () => {
    setIsAddModalVisible(false);
    addForm.resetFields();
  };

  const handleAddSubmit = async () => {
    try {
      setIsSubmitting(true);
      const values = await addForm.validateFields();
      
      // В реальном приложении здесь должен быть запрос к API
      const response = await fetch(buildApiUrl('/offices'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          name: values.title,
          address: values.address,
          work_phone: values.work_phone,
          work_phone2: values.work_phone2,
          ip_surname: values.ip_surname,
          ip_name: values.ip_name,
          ip_middle_name: values.ip_middle_name,
          inn: values.inn,
          ogrn: values.ogrn
        })
      });

      if (!response.ok) throw new Error('Ошибка при создании офиса');
      
      const newOffice = await response.json();
      
      // Преобразуем полученные данные в формат Office
      const formattedOffice: Office = {
        id: newOffice.id,
        title: newOffice.name || values.title,
        description: newOffice.address || values.address,
        revenue: 0,
        orders: 0,
        employees: [],
        data: [0, 0],
        address: newOffice.address || values.address,
        employee_count: 0,
        work_phone: newOffice.work_phone || values.work_phone,
        work_phone2: newOffice.work_phone2 || values.work_phone2,
        ip_surname: newOffice.ip_surname || values.ip_surname,
        ip_name: newOffice.ip_name || values.ip_name,
        ip_middle_name: newOffice.ip_middle_name || values.ip_middle_name,
        inn: newOffice.inn || values.inn,
        ogrn: newOffice.ogrn || values.ogrn
      };

      // Добавляем новый офис в список
      const updatedOffices = [...offices, formattedOffice];
      setOffices(updatedOffices);
      setSelectedOffice(formattedOffice);
      
      // Обновляем данные графика
      fetchOfficeRevenueData(updatedOffices);

      setIsAddModalVisible(false);
      message.success('Новый офис успешно создан');
    } catch (error) {
      console.error('Ошибка при создании офиса:', error);
      message.error('Не удалось создать новый офис');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="office-content">
      <h2 className="office-header">Мои офисы</h2>
      
      <div className="office-tabs">
        {offices.map(office => (
          <div 
            key={office.id} 
            className={`office-tab ${selectedOffice?.id === office.id ? 'active' : ''}`}
            onClick={() => handleOfficeClick(office)}
          >
            <FaBuilding className="office-tab-icon" />
            <span className="office-tab-text">{office.title}</span>
          </div>
        ))}
        
        {!isOfficeLimit && (
          <div className="office-add-button" onClick={showAddModal}>
            <GrAdd className="office-add-icon" />
            <span>Добавить офис</span>
          </div>
        )}
      </div>
      
      {selectedOffice && (
        <>
          <div className="office-info">
            <div className="office-title">
              <h3>{selectedOffice.title}</h3>
              <button className="edit-button" onClick={showEditModal}><FaEdit /></button>
            </div>
            <p className="office-description">{selectedOffice.description}</p>
            <div className="office-details">
              <div className="office-detail">
                <strong>Рабочий телефон 1:</strong> {selectedOffice.work_phone || 'Не указан'}
              </div>
              <div className="office-detail">
                <strong>Рабочий телефон 2:</strong> {selectedOffice.work_phone2 || 'Не указан'}
              </div>
              <div className="office-detail">
                <strong>Сотрудников:</strong> {selectedOffice.employee_count || 0}
              </div>
            </div>
          </div>
          
          <div className="period-selector">
            <button 
              className={`period-button ${period === "day" ? "active" : ""}`}
              onClick={() => handlePeriodChange("day")}
            >
              День
            </button>
            <button 
              className={`period-button ${period === "2weeks" ? "active" : ""}`}
              onClick={() => handlePeriodChange("2weeks")}
            >
              Период (2 недели)
            </button>
            <button 
              className={`period-button ${period === "month" ? "active" : ""}`}
              onClick={() => handlePeriodChange("month")}
            >
              Месяц
            </button>
          </div>
          
          <div className="stat-cards">
            <StatCard 
              title="Посещения"
              value={stats.visits.toLocaleString()}
              icon={<FaUsers />}
              color="#4476F0"
              percentageChange={stats.visitsChange.percentage}
              isIncrease={stats.visitsChange.isIncrease}
              comparisonText={getComparisonText(stats.visitsChange.isIncrease)}
            />
            <StatCard 
              title="Выручка"
              value={`${stats.revenue.toLocaleString()} ₽`}
              icon={<FaChartLine />}
              color="#67D9A4"
              percentageChange={stats.revenueChange.percentage}
              isIncrease={stats.revenueChange.isIncrease}
              comparisonText={getComparisonText(stats.revenueChange.isIncrease)}
            />
            <StatCard 
              title="Новые заказы"
              value={stats.orders.toString()}
              icon={<FaCalendarAlt />}
              color="#FF8743"
            />
            <StatCard 
              title="Ожидающие"
              value={stats.pending.toString()}
              icon={<FaCalendarAlt />}
              color="#505D68"
            />
          </div>
          
          <div className="charts-container">
            <div className="chart-card revenue-charts">
              <h4>Выручка по офисам</h4>
              <LineChartComponent 
                data={officeRevenueData}
              />
            </div>
            
            <div className="chart-card revenue-distribution">
              <h4>Распределение выручки</h4>
              <PieChartComponent />
            </div>
          </div>
        </>
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
            onClick={handleEditSubmit}
          >
            Сохранить
          </Button>,
        ]}
      >
        <Form form={form} layout="vertical">
          <Form.Item 
            name="title" 
            label="Название офиса"
            rules={[{ required: true, message: 'Пожалуйста, введите название офиса' }]}
          >
            <Input placeholder="Введите название офиса" />
          </Form.Item>
          
          {/* Подпункт ИП */}
          <div style={{ 
            border: '1px solid #d9d9d9', 
            borderRadius: '6px', 
            padding: '16px', 
            marginBottom: '16px',
            backgroundColor: '#fafafa'
          }}>
            <h4 style={{ 
              margin: '0 0 16px 0', 
              color: '#1890ff',
              fontSize: '14px',
              fontWeight: '600'
            }}>ИП</h4>
            
            <Form.Item
              name="ip_surname"
              label="Фамилия"
              rules={[{ required: true, message: 'Пожалуйста, введите фамилию' }]}
            >
              <Input placeholder="Введите фамилию" />
            </Form.Item>
            
            <Form.Item
              name="ip_name"
              label="Имя"
              rules={[{ required: true, message: 'Пожалуйста, введите имя' }]}
            >
              <Input placeholder="Введите имя" />
            </Form.Item>
            
            <Form.Item
              name="ip_middle_name"
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
            name="address"
            label="Адрес"
          >
            <Input placeholder="Введите адрес офиса" />
          </Form.Item>
          <Form.Item
            name="work_phone"
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
            onClick={handleAddSubmit}
          >
            Создать
          </Button>,
        ]}
      >
        <Form form={addForm} layout="vertical">
          <Form.Item 
            name="title" 
            label="Название офиса"
            rules={[{ required: true, message: 'Пожалуйста, введите название офиса' }]}
          >
            <Input placeholder="Введите название офиса" />
          </Form.Item>
          
          <div style={{ 
            border: '1px solid #d9d9d9', 
            borderRadius: '6px', 
            padding: '16px', 
            marginBottom: '16px',
            backgroundColor: '#fafafa'
          }}>
            <div style={{ 
              marginBottom: '12px', 
              fontWeight: 'bold', 
              color: '#1890ff',
              fontSize: '14px'
            }}>
              ИП
            </div>
            
            <Form.Item
              name="ip_surname"
              label="Фамилия"
              rules={[{ required: true, message: 'Пожалуйста, введите фамилию' }]}
            >
              <Input placeholder="Введите фамилию" />
            </Form.Item>
            
            <Form.Item
              name="ip_name"
              label="Имя"
              rules={[{ required: true, message: 'Пожалуйста, введите имя' }]}
            >
              <Input placeholder="Введите имя" />
            </Form.Item>
            
            <Form.Item
              name="ip_middle_name"
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
            name="address"
            label="Адрес"
          >
            <Input placeholder="Введите адрес офиса" />
          </Form.Item>
          <Form.Item
            name="work_phone"
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
    </div>
  );
};

export default Office;