import { useState, useEffect } from "react";
import "./OfficeContent.css";
import StatCard from "../components/StatCard";
import { FaUsers, FaChartLine, FaCalendarAlt, FaBuilding, FaEdit } from "react-icons/fa";
import { GrAdd } from "react-icons/gr";
import PieChartComponent from "./PieChartComponent";
import LineChartComponent from "./LineChartComponent";
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
  contact_phone?: string | null;
  website?: string | null;
  previousRevenue?: number;
  previousVisits?: number;
}

type PeriodType = "day" | "week" | "month";

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
                phone: '+7 900 000-00-01',
                pastRevenue: {},
                closeRate: 0.7,
              },
            ],
            data: [120, 8], // visits / pending
            address: 'г. Москва, ул. Пример, д. 1',
            employee_count: 2,
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
      case "week":
        // Последние 6 недель
        for (let i = 5; i >= 0; i--) {
          const date = new Date(today);
          date.setDate(date.getDate() - i * 7);
          labels.push(`Неделя ${6 - i}`);
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
      case "week":
        return "за неделю";
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
        contactPhone: selectedOffice.contact_phone || '',
        website: selectedOffice.website || ''
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
          contact_phone: values.contactPhone,
          website: values.website
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
          owner_id: profileData.id
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
        contact_phone: values.contactPhone || null,
        website: values.website || null
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
          <FaCalendarAlt className="calendar-icon" />
          <div className="period-buttons">
            <button 
              className={`period-button ${period === "day" ? "active" : ""}`} 
              onClick={() => handlePeriodChange("day")}
            >
              День
            </button>
            <button 
              className={`period-button ${period === "week" ? "active" : ""}`}
              onClick={() => handlePeriodChange("week")}
            >
              Неделя
            </button>
            <button 
              className={`period-button ${period === "month" ? "active" : ""}`}
              onClick={() => handlePeriodChange("month")}
            >
              Месяц
            </button>
          </div>
        </div>
      </div>
      
      <div className="main-content-wrapper">
        <div className="office-left-column">
          <div className="office-cards-container">
            <h3 className="section-title">Выбор офиса</h3>
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
                      <FaEdit 
                        className="edit-icon" 
                        onClick={(e) => {
                          e.stopPropagation();
                          showEditModal();
                        }} 
                      />
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
                <StatCard
                  title="Приходы"
                  value={stats.visits.toLocaleString() + " ₽"}
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

              <div className="employee-table-container">
                <div className="table-header">
                  <h4 className="section-title">Сотрудники офиса {selectedOffice.title}</h4>
                </div>
                <table className="employee-stats-table">
                  <thead>
                    <tr>
                      <th>ФИО</th>
                      <th>Должность</th>
                      <th>Выручка {getPeriodText()}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOffice.employees.length > 0 ? (
                      selectedOffice.employees.map(employee => (
                        <tr key={employee.id}>
                          <td>{`${employee.surname} ${employee.name} ${employee.middle_name}`}</td>
                          <td>{employee.position}</td>
                          <td>{employee.totalRevenue14Days.toLocaleString()} ₽</td>
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
            </>
          )}
        </div>

        {selectedOffice && (
          <div className="office-right-column">
            <div className="charts-container">
              <h4 className="section-title">Статистика {getPeriodText()}</h4>
              
              <div className="chart-box">
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
              
              <div className="chart-box">
                <LineChartComponent 
                  title={`Динамика выручки ${getPeriodText()}`}
                  data={officeRevenueData}
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
          <Form.Item
            name="officeAddress"
            label="Адрес"
          >
            <Input placeholder="Введите адрес офиса" />
          </Form.Item>
          <Form.Item
            name="contactPhone"
            label="Телефон"
          >
            <Input placeholder="Введите контактный телефон" />
          </Form.Item>
          <Form.Item
            name="website"
            label="Веб-сайт"
          >
            <Input placeholder="Введите адрес веб-сайта" />
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
          <Form.Item
            name="officeAddress"
            label="Адрес"
          >
            <Input placeholder="Введите адрес офиса" />
          </Form.Item>
          <Form.Item
            name="contactPhone"
            label="Телефон"
          >
            <Input placeholder="Введите контактный телефон" />
          </Form.Item>
          <Form.Item
            name="website"
            label="Веб-сайт"
          >
            <Input placeholder="Введите адрес веб-сайта" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Office;