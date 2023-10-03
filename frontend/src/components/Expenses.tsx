import React, { useState, useEffect } from "react";
import "./Expenses.css";

interface Employee {
  name: string;
  position: string;
  salaryBase: number;
  actsRevenue: number;
}

interface ExpenseDetail {
  id?: number;
  item: string;
  amount: number;
}

interface ExpenseCategory {
  id?: number;
  name: string;
  total: number;
  details: ExpenseDetail[];
}

// Пример данных сотрудников для расчёта зарплаты
const employees: Employee[] = [
  { name: "Иванов И.И.", position: "Юрист", salaryBase: 5000, actsRevenue: 700000 },
  { name: "Петров П.П.", position: "Юрист", salaryBase: 5000, actsRevenue: 650000 },
  { name: "Сидоров С.С.", position: "ОКК", salaryBase: 10000, actsRevenue: 600000 },
  { name: "Кузнецов К.К.", position: "ОКК", salaryBase: 10000, actsRevenue: 550000 },
  { name: "Морозов М.М.", position: "Менеджер", salaryBase: 20000, actsRevenue: 0 },
];

// Функция расчёта зарплаты
const calculateSalary = (employee: Employee): number => {
  switch (employee.position) {
    case "Юрист":
      return employee.salaryBase + employee.actsRevenue * 0.1; // 10% от актов + оклад 5000
    case "ОКК":
      return employee.salaryBase + employee.actsRevenue * 0.1; // 10% от актов + оклад 10000
    case "Менеджер":
      return employee.salaryBase; // Пока фиксированный оклад
    default:
      return 0;
  }
};

const Expenses: React.FC = () => {
  const [expenses, setExpenses] = useState<ExpenseCategory[]>([]);
  const [editMode, setEditMode] = useState<number | null>(null);
  const [editedDetails, setEditedDetails] = useState<ExpenseDetail[]>([]);
  const [newExpenseItem, setNewExpenseItem] = useState<string>('');
  const [newExpenseAmount, setNewExpenseAmount] = useState<string>('');
  const [expandedCategories, setExpandedCategories] = useState<number[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [officeId, setOfficeId] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState<string>('');
  const [showAddCategoryForm, setShowAddCategoryForm] = useState<boolean>(false);
  const [showAddSalaryCategory, setShowAddSalaryCategory] = useState<boolean>(false);

  // Получение данных с сервера
  useEffect(() => {
    const fetchExpenses = async () => {
      setLoading(true);
      setError(null);
      try {
        // Получаем токен авторизации
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('Требуется авторизация');
        }

        // Получаем ID офиса из профиля пользователя
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
        setOfficeId(officeId);

        if (!officeId) {
          throw new Error('Офис не найден');
        }

        // Получаем список расходов для данного офиса
        const expensesResponse = await fetch(`http://localhost:5000/api/office/${officeId}/expenses`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (!expensesResponse.ok) {
          throw new Error('Не удалось получить список расходов');
        }

        const expensesData = await expensesResponse.json();
        setExpenses(expensesData);
      } catch (err) {
        console.error('Ошибка получения расходов:', err);
        setError((err as Error).message || 'Не удалось загрузить список расходов');
        // Устанавливаем пустой массив
        setExpenses([]);
      } finally {
        setLoading(false);
      }
    };

    fetchExpenses();
  }, []);

  // Рассчитываем общую сумму расходов
  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.total, 0);

  const handleEdit = (index: number) => {
    setEditMode(index);
    setEditedDetails([...expenses[index].details]);
  };

  const handleSave = async (index: number) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Требуется авторизация');
      }

      const category = expenses[index];
      const categoryId = category.id;

      if (!categoryId) {
        throw new Error('ID категории не найден');
      }

      // Обновляем все детали
      for (const detail of editedDetails) {
        if (detail.id) {
          // Обновляем существующую деталь
          await fetch(`http://localhost:5000/api/expenses/details/${detail.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              item: detail.item,
              amount: detail.amount
            })
          });
        } else {
          // Создаем новую деталь
          await fetch('http://localhost:5000/api/expenses/details', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              categoryId,
              item: detail.item,
              amount: detail.amount
            })
          });
        }
      }

      // Обновляем локальное состояние
      const updatedExpenses = [...expenses];
      updatedExpenses[index].details = editedDetails;
      updatedExpenses[index].total = editedDetails.reduce((sum, detail) => sum + detail.amount, 0);
      setExpenses(updatedExpenses);
      setEditMode(null);
      setError(null);
    } catch (err) {
      console.error('Ошибка сохранения расходов:', err);
      setError((err as Error).message || 'Не удалось сохранить изменения');
    }
  };

  const handleCancel = () => {
    setEditMode(null);
  };

  const handleDetailChange = (detailIndex: number, field: keyof ExpenseDetail, value: string) => {
    const updatedDetails = [...editedDetails];
    if (field === "amount") {
      updatedDetails[detailIndex][field] = parseInt(value) || 0;
    } else if (field === "item") {
      updatedDetails[detailIndex][field] = value;
    }
    setEditedDetails(updatedDetails);
  };

  const handleAddDetail = () => {
    if (editMode === null || !newExpenseItem.trim()) return;
    
    const amount = parseInt(newExpenseAmount) || 0;
    
    const updatedDetails = [
      ...editedDetails,
      { item: newExpenseItem, amount }
    ];
    
    setEditedDetails(updatedDetails);
    setNewExpenseItem('');
    setNewExpenseAmount('');
  };

  const handleRemoveDetail = async (detailIndex: number) => {
    const detail = editedDetails[detailIndex];
    
    // Если у детали есть ID, удаляем с сервера
    if (detail.id) {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('Требуется авторизация');
        }
        
        await fetch(`http://localhost:5000/api/expenses/details/${detail.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      } catch (err) {
        console.error('Ошибка удаления расхода:', err);
        setError((err as Error).message || 'Не удалось удалить расход');
        return;
      }
    }
    
    const updatedDetails = editedDetails.filter((_, i) => i !== detailIndex);
    setEditedDetails(updatedDetails);
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim() || !officeId) {
      setError('Название категории не может быть пустым');
      return;
    }
    
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Требуется авторизация');
      }
      
      const response = await fetch('http://localhost:5000/api/expenses/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newCategoryName,
          officeId
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка создания категории');
      }
      
      const newCategory = await response.json();
      
      setExpenses([...expenses, newCategory]);
      setNewCategoryName('');
      setShowAddCategoryForm(false);
      setError(null);
    } catch (err) {
      console.error('Ошибка добавления категории:', err);
      setError((err as Error).message || 'Не удалось добавить категорию');
    } finally {
      setLoading(false);
    }
  };

  // Функция для добавления категории "Заработная плата" с расчетом зарплат
  const handleAddSalaryCategory = async () => {
    if (!officeId) {
      setError('ID офиса не найден');
      return;
    }
    
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Требуется авторизация');
      }
      
      // 1. Создаем категорию "Заработная плата"
      const categoryResponse = await fetch('http://localhost:5000/api/expenses/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: "Заработная плата",
          officeId
        })
      });
      
      if (!categoryResponse.ok) {
        const errorData = await categoryResponse.json();
        throw new Error(errorData.error || 'Ошибка создания категории');
      }
      
      const newCategory = await categoryResponse.json();
      const categoryId = newCategory.id;
      
      // 2. Добавляем детали расходов для каждого сотрудника
      for (const employee of employees) {
        const salary = calculateSalary(employee);
        await fetch('http://localhost:5000/api/expenses/details', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            categoryId,
            item: `${employee.name} (${employee.position})`,
            amount: salary
          })
        });
      }
      
      // 3. Получаем обновленный список расходов
      const expensesResponse = await fetch(`http://localhost:5000/api/office/${officeId}/expenses`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (expensesResponse.ok) {
        const expensesData = await expensesResponse.json();
        setExpenses(expensesData);
      }
      
      setShowAddSalaryCategory(false);
      setError(null);
    } catch (err) {
      console.error('Ошибка добавления категории зарплаты:', err);
      setError((err as Error).message || 'Не удалось добавить категорию зарплаты');
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (index: number) => {
    if (expandedCategories.includes(index)) {
      setExpandedCategories(expandedCategories.filter(i => i !== index));
    } else {
      setExpandedCategories([...expandedCategories, index]);
    }
  };

  // Проверка наличия категории "Заработная плата"
  const hasSalaryCategory = expenses.some(expense => expense.name === "Заработная плата");

  return (
    <div className="expenses-container">
      <div className="expenses-header">
        <h2 className="expenses-title">Список расходов</h2>
        <div className="expenses-actions">
          <div className="action-buttons-group">
            <button 
              className="add-category-btn" 
              onClick={() => {
                setShowAddCategoryForm(!showAddCategoryForm);
                setShowAddSalaryCategory(false);
              }}
            >
              {showAddCategoryForm ? 'Отмена' : 'Добавить категорию'}
            </button>
            
            {!hasSalaryCategory && (
              <button 
                className="add-salary-btn" 
                onClick={() => {
                  setShowAddSalaryCategory(!showAddSalaryCategory);
                  setShowAddCategoryForm(false);
                }}
              >
                {showAddSalaryCategory ? 'Отмена' : 'Добавить категорию зарплаты'}
              </button>
            )}
          </div>
          
          <div className="expenses-summary">
            <span>Общая сумма: </span>
            <span className="expenses-total">{totalExpenses.toLocaleString('ru-RU')} ₽</span>
          </div>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {showAddCategoryForm && (
        <div className="add-category-form">
          <input
            type="text"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="Название новой категории"
          />
          <button 
            onClick={handleAddCategory}
            disabled={loading || !newCategoryName.trim()}
          >
            {loading ? 'Сохранение...' : 'Добавить'}
          </button>
        </div>
      )}

      {showAddSalaryCategory && (
        <div className="add-category-info">
          <p>Будет создана категория "Заработная плата" с автоматическим расчетом оклада и процентов для сотрудников.</p>
          <button 
            onClick={handleAddSalaryCategory}
            disabled={loading}
          >
            {loading ? 'Создание...' : 'Создать категорию'}
          </button>
        </div>
      )}

      {loading && !showAddCategoryForm && !showAddSalaryCategory ? (
        <div className="loading-indicator">Загрузка расходов...</div>
      ) : (
        <div className="expenses-table-container">
          {expenses.length > 0 ? (
            <table className="expenses-table">
              <thead>
                <tr>
                  <th>Категория</th>
                  <th>Общая сумма</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((expense, index) => (
                  <React.Fragment key={expense.id || index}>
                    <tr 
                      className={`expense-category ${expandedCategories.includes(index) ? 'expanded' : ''}`}
                      onClick={() => toggleCategory(index)}
                    >
                      <td>{expense.name}</td>
                      <td>{expense.total.toLocaleString('ru-RU')} ₽</td>
                      <td>
                        {editMode !== index ? (
                          <button 
                            className="expenses-edit-btn" 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(index);
                            }}
                          >
                            Редактировать
                          </button>
                        ) : (
                          <div className="action-buttons">
                            <button 
                              className="expenses-save-btn" 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSave(index);
                              }}
                            >
                              Сохранить
                            </button>
                            <button 
                              className="expenses-cancel-btn" 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCancel();
                              }}
                            >
                              Отмена
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                    {expandedCategories.includes(index) && (
                      <tr className="expense-details">
                        <td colSpan={3}>
                          {editMode === index ? (
                            <div className="expense-edit-container">
                              <ul className="expense-details-list editable">
                                {editedDetails.map((detail, i) => (
                                  <li key={i}>
                                    <input
                                      type="text"
                                      value={detail.item}
                                      onChange={(e) => handleDetailChange(i, "item", e.target.value)}
                                      placeholder="Название"
                                    />
                                    <div className="amount-container">
                                      <input
                                        type="number"
                                        value={detail.amount}
                                        onChange={(e) => handleDetailChange(i, "amount", e.target.value)}
                                        placeholder="Сумма"
                                      />
                                      <span className="currency">₽</span>
                                      <button 
                                        className="remove-item-btn" 
                                        onClick={() => handleRemoveDetail(i)}
                                      >
                                        ✕
                                      </button>
                                    </div>
                                  </li>
                                ))}
                              </ul>
                              <div className="add-expense-item">
                                <input
                                  type="text"
                                  value={newExpenseItem}
                                  onChange={(e) => setNewExpenseItem(e.target.value)}
                                  placeholder="Новый расход"
                                />
                                <div className="amount-container">
                                  <input
                                    type="number"
                                    value={newExpenseAmount}
                                    onChange={(e) => setNewExpenseAmount(e.target.value)}
                                    placeholder="Сумма"
                                  />
                                  <span className="currency">₽</span>
                                </div>
                                <button 
                                  className="add-item-btn" 
                                  onClick={handleAddDetail}
                                  disabled={!newExpenseItem.trim()}
                                >
                                  Добавить
                                </button>
                              </div>
                            </div>
                          ) : (
                            <ul className="expense-details-list">
                              {expense.details.map((detail, i) => (
                                <li key={i}>
                                  <span>{detail.item}</span>
                                  <span>{detail.amount.toLocaleString('ru-RU')} ₽</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="no-data-message">Нет данных о расходах</div>
          )}
        </div>
      )}
    </div>
  );
};

export default Expenses; 