import React, { useState, useEffect } from "react";
import { FaUser } from "react-icons/fa";
import { MdFilterList, MdReplay } from "react-icons/md";
import "./Lawyers.css";

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
  const [editMode, setEditMode] = useState(false);
  const [editedEmployee, setEditedEmployee] = useState<Employee>({ ...employee });

  const handleChange = (field: keyof Employee, value: string) => {
    setEditedEmployee((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = () => {
    onSave(editedEmployee);
    setEditMode(false);
  };

  return (
    <div className="employee-modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3>Информация о сотруднике</h3>
        <div className="modal-section">
          <h4>Общая информация</h4>
          {editMode ? (
            <>
              <p><b>Имя:</b> <input value={editedEmployee.name} onChange={(e) => handleChange("name", e.target.value)} /></p>
              <p><b>Должность:</b> <input value={editedEmployee.position} onChange={(e) => handleChange("position", e.target.value)} /></p>
              <p><b>Офис:</b> <input value={editedEmployee.office} onChange={(e) => handleChange("office", e.target.value)} /></p>
            </>
          ) : (
            <>
              <p><b>Имя:</b> {editedEmployee.name}</p>
              <p><b>Должность:</b> {editedEmployee.position}</p>
              <p><b>Офис:</b> {editedEmployee.office}</p>
            </>
          )}
        </div>
        <div className="modal-buttons">
          {editMode ? (
            <button className="modal-save-btn" onClick={handleSave}>Сохранить</button>
          ) : (
            <button className="modal-edit-btn" onClick={() => setEditMode(true)}>Редактировать</button>
          )}
          <button className="modal-close-btn" onClick={onClose}>Закрыть</button>
        </div>
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
}

const Lawyers = () => {
  // Демо-данные для сотрудников
  const localEmployees: Employee[] = [
    { id: 1, name: "Иван Иванов", position: "Юрист", office: "Кемерово" },
    { id: 2, name: "Петр Петров", position: "Юрист", office: "Красноярск" },
    { id: 3, name: "Алексей Смирнов", position: "Менеджер", office: "Новокузнецк" },
    { id: 4, name: "Елена Кузнецова", position: "Юрист", office: "Кемерово" },
    { id: 5, name: "Дмитрий Морозов", position: "Юрист", office: "Красноярск" },
    { id: 6, name: "Мария Васильева", position: "Юрист", office: "Новокузнецк" },
    { id: 7, name: "Роман Гордеев", position: "Менеджер", office: "Красноярск" },
    { id: 8, name: "Юлия Чистякова", position: "Юрист", office: "Кемерово" }
  ];

  const [employees, setEmployees] = useState<Employee[]>(localEmployees);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>(localEmployees);
  const [selectedRole, setSelectedRole] = useState<string>("Все роли");
  const [selectedOffice, setSelectedOffice] = useState<string>("Все офисы");
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

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

  const handleSaveEmployee = (updatedEmployee: Employee) => {
    setEmployees((prevEmployees) =>
      prevEmployees.map((emp) =>
        emp.id === updatedEmployee.id ? updatedEmployee : emp
      )
    );
    setSelectedEmployee(updatedEmployee);
  };

  return (
    <div className="lawyers-content">
      <h2 className="lawyers-title">Список сотрудников</h2>
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
        <div className="lawyers-grid">
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

      {selectedEmployee && (
        <EmployeeModal
          employee={selectedEmployee}
          onClose={closeModal}
          onSave={handleSaveEmployee}
        />
      )}
    </div>
  );
};

export default Lawyers; 