import React, { useState, useEffect } from 'react';
import './Arrivals.css';

interface Arrival {
  id: number;
  clientName: string;
  theme: string;
  lawyerAssigned: string;
  appointmentTime: string;
  contractSigned: boolean;
  didNotArrive: boolean;
}

const Arrivals: React.FC = () => {
  const [arrivals, setArrivals] = useState<Arrival[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [officeId, setOfficeId] = useState<string | null>(null);

  // Получение данных с сервера
  useEffect(() => {
    const fetchArrivals = async () => {
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

        // Получаем список приходов для данного офиса
        const arrivalsResponse = await fetch(`http://localhost:5000/api/office/${officeId}/arrivals`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (!arrivalsResponse.ok) {
          throw new Error('Не удалось получить список приходов');
        }

        const arrivalsData = await arrivalsResponse.json();
        setArrivals(arrivalsData);
      } catch (err) {
        console.error('Ошибка получения приходов:', err);
        setError((err as Error).message || 'Не удалось загрузить список приходов');
        // Устанавливаем пустой список вместо демо-данных
        setArrivals([]);
      } finally {
        setLoading(false);
      }
    };

    fetchArrivals();
  }, []);

  // Обработчик изменения статуса
  const handleStatusChange = async (id: number, type: 'contractSigned' | 'didNotArrive') => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Требуется авторизация');
      }

      // Находим текущий приход
      const arrival = arrivals.find(a => a.id === id);
      if (!arrival) return;

      // Определяем новые значения статусов
      const contractSigned = type === 'contractSigned' ? !arrival.contractSigned : arrival.contractSigned;
      const didNotArrive = type === 'didNotArrive' ? !arrival.didNotArrive : arrival.didNotArrive;

      // Отправляем запрос на обновление
      const response = await fetch(`http://localhost:5000/api/arrivals/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          contractSigned,
          didNotArrive
        })
      });

      if (!response.ok) {
        throw new Error('Не удалось обновить статус');
      }

      // Обновляем локальное состояние
      setArrivals((prevArrivals) =>
        prevArrivals.map((arrival) =>
          arrival.id === id ? { ...arrival, [type]: !arrival[type] } : arrival
        )
      );
    } catch (err) {
      console.error('Ошибка обновления статуса:', err);
      setError((err as Error).message || 'Не удалось обновить статус');
    }
  };

  // Форматирование даты и времени
  const formatDateTime = (dateTimeStr: string) => {
    const date = new Date(dateTimeStr);
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Добавление нового прихода
  const [showForm, setShowForm] = useState(false);
  const [newArrival, setNewArrival] = useState<Omit<Arrival, 'id'>>({
    clientName: '',
    theme: '',
    lawyerAssigned: '',
    appointmentTime: '',
    contractSigned: false,
    didNotArrive: false
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewArrival(prev => ({ ...prev, [name]: value }));
  };

  const handleAddArrival = async () => {
    if (!newArrival.clientName || !newArrival.theme || !newArrival.lawyerAssigned || !newArrival.appointmentTime) {
      setError('Пожалуйста, заполните все поля');
      return;
    }

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

      const response = await fetch('http://localhost:5000/api/arrivals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...newArrival,
          officeId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка при создании прихода');
      }

      const createdArrival = await response.json();

      // Добавляем новый приход в список
      setArrivals(prev => [createdArrival, ...prev]);

      // Сбрасываем форму
      setNewArrival({
        clientName: '',
        theme: '',
        lawyerAssigned: '',
        appointmentTime: '',
        contractSigned: false,
        didNotArrive: false
      });
      
      setShowForm(false);
      setError(null);
    } catch (err) {
      console.error('Ошибка создания прихода:', err);
      setError((err as Error).message || 'Не удалось создать приход');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="arrivals-container">
      <div className="arrivals-header">
        <h2 className="arrivals-title">Таблица приходов</h2>
        <button 
          className="add-arrival-btn" 
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? 'Отменить' : 'Добавить приход'}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {showForm && (
        <div className="add-arrival-form">
          <div className="form-group">
            <label>Клиент</label>
            <input 
              type="text" 
              name="clientName" 
              value={newArrival.clientName}
              onChange={handleInputChange}
              placeholder="ФИО клиента"
            />
          </div>
          <div className="form-group">
            <label>Тема</label>
            <input 
              type="text" 
              name="theme" 
              value={newArrival.theme}
              onChange={handleInputChange}
              placeholder="Тема консультации"
            />
          </div>
          <div className="form-group">
            <label>Юрист</label>
            <input 
              type="text" 
              name="lawyerAssigned" 
              value={newArrival.lawyerAssigned}
              onChange={handleInputChange}
              placeholder="ФИО юриста"
            />
          </div>
          <div className="form-group">
            <label>Дата и время</label>
            <input 
              type="datetime-local" 
              name="appointmentTime" 
              value={newArrival.appointmentTime}
              onChange={handleInputChange}
            />
          </div>
          <div className="form-actions">
            <button className="save-btn" onClick={handleAddArrival} disabled={loading}>
              {loading ? 'Сохранение...' : 'Сохранить'}
            </button>
            <button className="cancel-btn" onClick={() => {
              setShowForm(false);
              setError(null);
            }}>Отменить</button>
          </div>
        </div>
      )}

      {loading && !showForm ? (
        <div className="loading-indicator">Загрузка приходов...</div>
      ) : (
        <div className="arrivals-table-container">
          <table className="arrivals-table">
            <thead>
              <tr>
                <th>Клиент</th>
                <th>Тема</th>
                <th>Юрист</th>
                <th>Время приема</th>
                <th>Заключен договор</th>
                <th>Не пришел</th>
              </tr>
            </thead>
            <tbody>
              {arrivals.length > 0 ? (
                arrivals.map((arrival) => (
                  <tr key={arrival.id} className={arrival.didNotArrive ? 'not-arrived' : ''}>
                    <td>{arrival.clientName}</td>
                    <td>{arrival.theme}</td>
                    <td>{arrival.lawyerAssigned}</td>
                    <td>{formatDateTime(arrival.appointmentTime)}</td>
                    <td className="checkbox-cell">
                      <input
                        type="checkbox"
                        checked={arrival.contractSigned}
                        onChange={() => handleStatusChange(arrival.id, 'contractSigned')}
                        disabled={arrival.didNotArrive}
                      />
                    </td>
                    <td className="checkbox-cell">
                      <input
                        type="checkbox"
                        checked={arrival.didNotArrive}
                        onChange={() => handleStatusChange(arrival.id, 'didNotArrive')}
                      />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="no-data">Нет данных о приходах</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Arrivals; 