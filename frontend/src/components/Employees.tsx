import React, { useState, useEffect } from "react";
import { FaUser, FaQrcode } from "react-icons/fa";
import { MdFilterList, MdReplay, MdClose, MdContentCopy, MdCheck } from "react-icons/md";
import "./Lawyers.css";
import "./Experts.css";
import "./Employees.css";

// Компонент карточки сотрудника
const EmployeeCard = ({ employee }: { employee: Employee }) => {
  return (
    <div className="employee-card">
      <div className="employee-avatar">
        {employee.avatar ? (
          <img
            src={employee.avatar}
            alt={`${employee.name}`}
          />
        ) : (
          <div className="default-avatar">
            <FaUser size={48} color="#fff" />
          </div>
        )}
      </div>
      <div className="employee-info">
        <h3>{employee.name}</h3>
        <p className="employee-position">{employee.position || "Не указана"}</p>
        <p className="employee-office">{employee.office || "Офис не указан"}</p>
      </div>
    </div>
  );
};

// Компонент круговой диаграммы
const PieChart = ({ contracts, consultations }: { contracts: number, consultations: number }) => {
  const total = contracts + consultations;
  const contractsPercentage = total > 0 ? (contracts / total) * 100 : 0;
  const consultationsPercentage = total > 0 ? (consultations / total) * 100 : 0;
  
  const contractsAngle = (contractsPercentage / 100) * 360;
  const consultationsAngle = (consultationsPercentage / 100) * 360;
  
  const radius = 80;
  const centerX = 100;
  const centerY = 100;
  
  const getCoordinatesForAngle = (angle: number) => {
    const radian = (angle - 90) * (Math.PI / 180);
    return {
      x: centerX + radius * Math.cos(radian),
      y: centerY + radius * Math.sin(radian)
    };
  };
  
  const contractsEnd = getCoordinatesForAngle(contractsAngle);
  const consultationsEnd = getCoordinatesForAngle(contractsAngle + consultationsAngle);
  
  const contractsLargeArc = contractsAngle > 180 ? 1 : 0;
  const consultationsLargeArc = consultationsAngle > 180 ? 1 : 0;
  
  return (
    <div className="pie-chart-container">
      <svg width="200" height="200" viewBox="0 0 200 200">
        {total > 0 ? (
          <>
            {/* Заключённые договора (зелёный) */}
            <path
              d={`M ${centerX} ${centerY} L ${centerX} ${centerY - radius} A ${radius} ${radius} 0 ${contractsLargeArc} 1 ${contractsEnd.x} ${contractsEnd.y} Z`}
              fill="#4CAF50"
              stroke="white"
              strokeWidth="2"
            />
            {/* Консультации (красный) */}
            <path
              d={`M ${centerX} ${centerY} L ${contractsEnd.x} ${contractsEnd.y} A ${radius} ${radius} 0 ${consultationsLargeArc} 1 ${consultationsEnd.x} ${consultationsEnd.y} Z`}
              fill="#F44336"
              stroke="white"
              strokeWidth="2"
            />
          </>
        ) : (
          <circle cx={centerX} cy={centerY} r={radius} fill="#E0E0E0" />
        )}
      </svg>
      <div className="chart-legend">
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#4CAF50' }}></div>
          <span>Договора: {contracts}</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#F44336' }}></div>
          <span>Консультации: {consultations}</span>
        </div>
      </div>
    </div>
  );
};

// Модальное окно с информацией о сотруднике
const EmployeeModal = ({ 
  employee, 
  onClose, 
  onSave 
}: { 
  employee: Employee, 
  onClose: () => void, 
  onSave: (employee: Employee) => void 
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<'month' | 'period' | 'year'>('month');
  
  // Демо данные для диаграммы
  const getDataForPeriod = (period: 'month' | 'period' | 'year') => {
    switch (period) {
      case 'month':
        return { contracts: 15, consultations: 8 };
      case 'period':
        return { contracts: 45, consultations: 23 };
      case 'year':
        return { contracts: 180, consultations: 95 };
      default:
        return { contracts: 15, consultations: 8 };
    }
  };
  
  const chartData = getDataForPeriod(selectedPeriod);

  return (
    <div className="employee-modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3>Информация о сотруднике</h3>
        <div className="modal-section">
          <h4>Общая информация</h4>
          <p><b>Имя:</b> {employee.name}</p>
          <p><b>Должность:</b> {employee.position}</p>
          <p><b>Офис:</b> {employee.office}</p>
        </div>
        
        <div className="modal-section">
          <h4>Статистика работы</h4>
          <div className="period-buttons">
            <button 
              className={`period-btn ${selectedPeriod === 'month' ? 'active' : ''}`}
              onClick={() => setSelectedPeriod('month')}
            >
              Месяц
            </button>
            <button 
              className={`period-btn ${selectedPeriod === 'period' ? 'active' : ''}`}
              onClick={() => setSelectedPeriod('period')}
            >
              Период
            </button>
            <button 
              className={`period-btn ${selectedPeriod === 'year' ? 'active' : ''}`}
              onClick={() => setSelectedPeriod('year')}
            >
              Год
            </button>
          </div>
          <PieChart contracts={chartData.contracts} consultations={chartData.consultations} />
        </div>
        
        <div className="modal-buttons">
          <button className="modal-close-btn" onClick={onClose}>Закрыть</button>
        </div>
      </div>
    </div>
  );
};

// Модальное окно для приглашения нового сотрудника
const InviteModal = ({ onClose }: { onClose: () => void }) => {
  const [inviteLink, setInviteLink] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchQRCode = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Получаем токен авторизации
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('Требуется авторизация');
        }
        
        // Получаем данные профиля для определения ID офиса
        const profileResponse = await fetch('http://localhost:5000/api/profile', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        if (!profileResponse.ok) {
          throw new Error('Не удалось получить данные профиля');
        }
        
        const profileData = await profileResponse.json();
        const officeId = profileData.officeId;
        
        if (!officeId) {
          throw new Error('Офис не найден');
        }
        
        // Формируем ссылку для приглашения
        const baseUrl = window.location.origin;
        const inviteUrl = `${baseUrl}/join?officeId=${officeId}`;
        
        setInviteLink(inviteUrl);
        
        // Запрос к серверу для генерации QR-кода
        const qrResponse = await fetch(
          `http://localhost:5000/api/generate-qrcode?text=${encodeURIComponent(inviteUrl)}&officeId=${officeId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );
        
        if (!qrResponse.ok) {
          throw new Error('Не удалось получить QR-код');
        }
        
        const qrData = await qrResponse.json();
        setQrCodeUrl(qrData.qrcode);
      } catch (err) {
        console.error('Ошибка получения QR-кода:', err);
        setError((err as Error).message || 'Не удалось загрузить QR-код');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchQRCode();
  }, []);
  
  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink)
      .then(() => {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      })
      .catch(err => {
        console.error('Не удалось скопировать ссылку: ', err);
      });
  };
  
  // Заглушка только для случая ошибки
  const QRPlaceholder = () => (
    <div className="simple-qr-placeholder">
      <div className="qr-grid">
        {Array(9).fill(0).map((_, i) => (
          <div key={i} className="qr-block"></div>
        ))}
      </div>
      <div className="qr-text">Ошибка загрузки QR-кода</div>
    </div>
  );
  
  return (
    <div className="invite-modal-overlay" onClick={onClose}>
      <div className="invite-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="invite-modal-close" onClick={onClose}>
          <MdClose size={24} />
        </button>
        <h2>Пригласить нового сотрудника</h2>
        
        <div className="qr-code-container">
          <div className="qr-code">
            {isLoading ? (
              <div className="loading-indicator">Загрузка QR-кода...</div>
            ) : error ? (
              <QRPlaceholder />
            ) : (
              <img src={qrCodeUrl} alt="QR код для приглашения" width={200} height={200} />
            )}
          </div>
        </div>
        
        <div className="invite-link-container">
          <p>Ссылка для приглашения:</p>
          <div className="invite-link-field">
            <input type="text" value={inviteLink} readOnly />
            <button onClick={handleCopyLink}>
              {copySuccess ? <MdCheck size={20} /> : <MdContentCopy size={20} />}
            </button>
          </div>
        </div>
        
        <p className="invite-instructions">
          Отправьте эту ссылку новому сотруднику или предложите отсканировать QR-код. 
          После регистрации вам нужно будет подтвердить заявку на присоединение.
        </p>
      </div>
    </div>
  );
};

// Тип для сотрудника
interface Employee {
  id: number;
  name: string;
  position: string;
  office: string;
  avatar?: string;
  role?: 'lawyer' | 'expert' | 'admin';
}

// Тип для заявки на присоединение
interface JoinRequest {
  id: number;
  name: string;
  email: string;
  status: 'pending' | 'approved' | 'rejected';
  date: string;
  role?: string;
}

const Employees = () => {
  // Локальные демо-данные для тестирования
  const localEmployees: Employee[] = [
    { id: 1, name: "Иван Иванов", position: "Юрист", office: "Кемерово", role: 'lawyer' },
    { id: 2, name: "Петр Петров", position: "Юрист", office: "Красноярск", role: 'lawyer' },
    { id: 3, name: "Алексей Смирнов", position: "Менеджер", office: "Новокузнецк", role: 'admin' },
    { id: 4, name: "Елена Кузнецова", position: "Юрист", office: "Кемерово", role: 'lawyer' },
    { id: 5, name: "Дмитрий Морозов", position: "Юрист", office: "Красноярск", role: 'lawyer' },
    { id: 6, name: "Мария Васильева", position: "Эксперт", office: "Новокузнецк", role: 'expert' },
    { id: 7, name: "Роман Гордеев", position: "Эксперт", office: "Красноярск", role: 'expert' },
    { id: 8, name: "Юлия Чистякова", position: "Юрист", office: "Кемерово", role: 'lawyer' },
    { id: 9, name: "Андрей Менеджеров", position: "Менеджер", office: "Кемерово", role: 'admin' },
    { id: 10, name: "Светлана Представителева", position: "Представитель", office: "Красноярск", role: 'admin' },
    { id: 11, name: "Михаил Юристов", position: "Юрист", office: "Новокузнецк", role: 'lawyer' },
    { id: 12, name: "Ольга Экспертова", position: "Эксперт", office: "Кемерово", role: 'expert' },
    { id: 13, name: "Владимир ОККов", position: "ОКК", office: "Красноярск", role: 'admin' }
  ];

  // Локальные демо-данные для заявок на присоединение
  const localRequests: JoinRequest[] = [
    { id: 1, name: "Сергей Новиков", email: "novikov@example.com", status: 'pending', date: "2023-05-15" },
    { id: 2, name: "Анна Соколова", email: "sokolova@example.com", status: 'pending', date: "2023-05-16" }
  ];

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>("Все роли");
  const [selectedOffice, setSelectedOffice] = useState<string>("Все офисы");
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'requests'>('all');
  const [userRole] = useState<string>("owner"); // В реальном проекте это будет приходить с сервера
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Получение списка сотрудников с сервера
  useEffect(() => {
    const fetchEmployees = async () => {
      setLoading(true);
      setError(null);
      try {
        // Получаем ID офиса текущего пользователя
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('Требуется авторизация');
        }

        // Сначала получаем данные об офисе пользователя
        const profileResponse = await fetch('http://localhost:5000/api/profile', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (!profileResponse.ok) {
          throw new Error('Не удалось получить данные профиля');
        }

        const profileData = await profileResponse.json();
        const officeId = profileData.officeId;

        if (!officeId) {
          throw new Error('Офис не найден');
        }

        // Теперь получаем сотрудников этого офиса
        const employeesResponse = await fetch(`http://localhost:5000/api/office/${officeId}/employees`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (!employeesResponse.ok) {
          throw new Error('Не удалось получить список сотрудников');
        }

        const employeesData = await employeesResponse.json();
        setEmployees(employeesData);
        setFilteredEmployees(employeesData);
      } catch (err) {
        console.error('Ошибка получения данных:', err);
        setError((err as Error).message || 'Не удалось загрузить список сотрудников');
        // Используем демо-данные при ошибке загрузки с сервера
        setEmployees(localEmployees);
        setFilteredEmployees(localEmployees);
      } finally {
        setLoading(false);
      }
    };

    fetchEmployees();
  }, []);

  // Получение заявок на присоединение
  useEffect(() => {
    const fetchJoinRequests = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('Требуется авторизация');
        }

        // Получаем ID офиса текущего пользователя
        const profileResponse = await fetch('http://localhost:5000/api/profile', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (!profileResponse.ok) {
          throw new Error('Не удалось получить данные профиля');
        }

        const profileData = await profileResponse.json();
        const officeId = profileData.officeId;

        if (!officeId) {
          throw new Error('Офис не найден');
        }

        // Получаем заявки на присоединение к этому офису
        const requestsResponse = await fetch(`http://localhost:5000/api/office/${officeId}/join-requests`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (!requestsResponse.ok) {
          throw new Error('Не удалось получить заявки на присоединение');
        }

        const requestsData = await requestsResponse.json();
        setJoinRequests(requestsData);
      } catch (err) {
        console.error('Ошибка получения заявок:', err);
        // Устанавливаем пустой список заявок вместо демо-данных
        setJoinRequests([]);
      }
    };

    if (activeTab === 'requests') {
      fetchJoinRequests();
    }
  }, [activeTab]);

  const handleResetFilters = () => {
    setSelectedRole("Все роли");
    setSelectedOffice("Все офисы");
  };

  // Фильтрация сотрудников при изменении выбранных фильтров
  useEffect(() => {
    setFilteredEmployees(
      employees.filter((employee) => {
        const matchesRole =
          selectedRole === "Все роли" || selectedRole === "Все сотрудники" || employee.position === selectedRole;
        const matchesOffice =
          selectedOffice === "Все офисы" || employee.office === selectedOffice;
        return matchesRole && matchesOffice;
      })
    );
  }, [selectedRole, selectedOffice, employees]);

  // Получение уникальных ролей и офисов для фильтров
  const roles = ["Все роли", ...Array.from(new Set(employees.map((employee) => employee.position)))];
  const offices = ["Все офисы", ...Array.from(new Set(employees.map((employee) => employee.office)))];

  const handleEmployeeClick = (employee: Employee) => {
    setSelectedEmployee(employee);
  };

  const closeModal = () => {
    setSelectedEmployee(null);
  };

  const closeInviteModal = () => {
    setShowInviteModal(false);
  };

  // Обработчик сохранения информации о сотруднике
  const handleSaveEmployee = async (updatedEmployee: Employee) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Требуется авторизация');
      }

      const response = await fetch(`http://localhost:5000/api/employees/${updatedEmployee.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: updatedEmployee.name,
          position: updatedEmployee.position,
          office: updatedEmployee.office,
          role: updatedEmployee.role,
          avatar: updatedEmployee.avatar
        })
      });

      if (!response.ok) {
        throw new Error('Не удалось обновить данные сотрудника');
      }

      const updatedData = await response.json();

      // Обновляем данные в локальном состоянии
      setEmployees(prevEmployees => 
        prevEmployees.map(emp => emp.id === updatedEmployee.id ? updatedData : emp)
      );
      
      setFilteredEmployees(prevFiltered => 
        prevFiltered.map(emp => emp.id === updatedEmployee.id ? updatedData : emp)
      );

      setSelectedEmployee(null);
    } catch (err) {
      console.error('Ошибка обновления сотрудника:', err);
      alert('Не удалось обновить данные сотрудника');
    }
  };
  
  // Обработка заявок на присоединение
  const handleJoinRequest = async (requestId: number, status: 'approved' | 'rejected', role?: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Требуется авторизация');
      }

      const response = await fetch(`http://localhost:5000/api/join-requests/${requestId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status,
          role
        })
      });

      if (!response.ok) {
        throw new Error('Не удалось обновить статус заявки');
      }

      // Обновляем список заявок в локальном состоянии
      setJoinRequests(prevRequests => 
        prevRequests.map(req => 
          req.id === requestId ? { ...req, status } : req
        )
      );
    } catch (err) {
      console.error('Ошибка обработки заявки:', err);
      alert('Не удалось обработать заявку');
    }
  };

  // Получаем только заявки со статусом "pending"
  const pendingRequests = joinRequests.filter(request => request.status === 'pending');

  return (
    <div className="employees-content">
      <div className="employees-header">
        <h2 className="employees-title">Сотрудники</h2>
        <button className="add-employee-btn" onClick={() => setShowInviteModal(true)}>
          <FaQrcode size={16} />
          <span>Пригласить сотрудника</span>
        </button>
      </div>

      <div className="tabs-container">
        <button 
          className={`tab ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          Все сотрудники
        </button>
        {userRole === 'owner' && (
          <button 
            className={`tab ${activeTab === 'requests' ? 'active' : ''}`}
            onClick={() => setActiveTab('requests')}
          >
            Заявки на присоединение
            {pendingRequests.length > 0 && (
              <span className="badge">{pendingRequests.length}</span>
            )}
          </button>
        )}
      </div>

      {activeTab === 'all' && (
        <>
          <div className="filters">
            <div className="filter-icon">
              <MdFilterList size={24} />
            </div>
            <div className="filter-text">Фильтровать по</div>
            <div className="role-filter">
              <select
                id="role-select"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
              >
                {roles.map((role, index) => (
                  <option key={index} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </div>
            <div className="office-filter">
              <select
                id="office-select"
                value={selectedOffice}
                onChange={(e) => setSelectedOffice(e.target.value)}
              >
                {offices.map((office, index) => (
                  <option key={index} value={office}>
                    {office}
                  </option>
                ))}
              </select>
            </div>
            <button className="reset-filter" onClick={handleResetFilters}>
              <MdReplay size={18} />
              <span>Сбросить фильтр</span>
            </button>
          </div>

          {filteredEmployees.length > 0 ? (
            <div className="employees-grid">
              {filteredEmployees.map((employee) => (
                <div onClick={() => handleEmployeeClick(employee)} key={employee.id}>
                  <EmployeeCard employee={employee} />
                </div>
              ))}
            </div>
          ) : (
            <div className="no-employees">
              <p>Сотрудники не найдены</p>
            </div>
          )}
        </>
      )}

      {activeTab === 'requests' && (
        <div className="join-requests">
          <h3>Заявки на присоединение</h3>
          {pendingRequests.length > 0 ? (
            <div className="requests-list">
              {pendingRequests.map(request => (
                <div key={request.id} className="request-item">
                  <div className="request-info">
                    <h4>{request.name}</h4>
                    <p>{request.email}</p>
                    <p className="request-date">Дата заявки: {request.date}</p>
                  </div>
                  <div className="request-actions">
                    <button className="approve-btn" onClick={() => handleJoinRequest(request.id, 'approved', request.role)}>Одобрить</button>
                    <button className="reject-btn" onClick={() => handleJoinRequest(request.id, 'rejected')}>Отклонить</button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-requests">
              <p>Нет новых заявок на присоединение</p>
            </div>
          )}
        </div>
      )}

      {selectedEmployee && (
        <EmployeeModal
          employee={selectedEmployee}
          onClose={closeModal}
          onSave={handleSaveEmployee}
        />
      )}

      {showInviteModal && (
        <InviteModal onClose={closeInviteModal} />
      )}
    </div>
  );
};

export default Employees;