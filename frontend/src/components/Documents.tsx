import React, { useState, useEffect } from 'react';
import './Documents.css';

interface Document {
  id: number;
  title: string;
  type: string;
  status: string;
  date: string;
  client: string;
}

const Documents: React.FC = () => {
  // Локальные демо-данные для тестирования
  const localDocuments: Document[] = [
    { id: 1, title: 'Договор купли-продажи №123', type: 'Купля-продажа', status: 'Подписан', date: '12.04.2023', client: 'ООО "Ромашка"' },
    { id: 2, title: 'Договор оказания услуг №456', type: 'Услуги', status: 'На согласовании', date: '15.05.2023', client: 'ИП Петров А.А.' },
    { id: 3, title: 'Договор аренды №789', type: 'Аренда', status: 'Черновик', date: '01.06.2023', client: 'ООО "Техносервис"' },
    { id: 4, title: 'Трудовой договор №234', type: 'Трудовой', status: 'Подписан', date: '20.03.2023', client: 'Иванов И.И.' },
    { id: 5, title: 'Договор поставки №567', type: 'Поставка', status: 'Расторгнут', date: '10.01.2023', client: 'ООО "Альфа"' },
  ];

  const [documents, setDocuments] = useState<Document[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('Все типы');
  const [selectedStatus, setSelectedStatus] = useState<string>('Все статусы');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [officeId, setOfficeId] = useState<string | null>(null);
  
  // Состояния для нового договора
  const [newDocument, setNewDocument] = useState({
    title: '',
    type: '',
    status: 'Черновик',
    date: new Date().toISOString().split('T')[0],
    client: ''
  });

  // Предопределенные типы и статусы для выбора
  const documentStatuses = ['Черновик', 'На согласовании', 'Подписан', 'Расторгнут'];

  // Загрузка договоров с сервера
  useEffect(() => {
    const fetchDocuments = async () => {
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

        // Получаем список договоров для данного офиса
        const documentsResponse = await fetch(`http://localhost:5000/api/office/${officeId}/documents`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (!documentsResponse.ok) {
          throw new Error('Не удалось получить список договоров');
        }

        const documentsData = await documentsResponse.json();
        setDocuments(documentsData);
      } catch (err) {
        console.error('Ошибка получения договоров:', err);
        setError((err as Error).message || 'Не удалось загрузить список договоров');
        // Устанавливаем пустой список вместо демо-данных
        setDocuments([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
  }, []);

  // Получаем уникальные типы и статусы для фильтров
  const types = ['Все типы', ...Array.from(new Set(documents.map(doc => doc.type)))];
  const statuses = ['Все статусы', ...Array.from(new Set(documents.map(doc => doc.status)))];

  // Фильтрация документов
  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         doc.client.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'Все типы' || doc.type === selectedType;
    const matchesStatus = selectedStatus === 'Все статусы' || doc.status === selectedStatus;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  // Открытие модального окна для создания нового договора
  const openNewDocumentModal = () => {
    setIsModalOpen(true);
  };

  // Закрытие модального окна
  const closeModal = () => {
    setIsModalOpen(false);
    // Сбрасываем форму
    setNewDocument({
      title: '',
      type: '',
      status: 'Черновик',
      date: new Date().toISOString().split('T')[0],
      client: ''
    });
  };

  // Обработка изменений в форме
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewDocument(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Создание нового договора
  const createNewDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!officeId) {
      setError('ID офиса не найден');
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Требуется авторизация');
      }
      
      const response = await fetch('http://localhost:5000/api/documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...newDocument,
          officeId
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка при создании договора');
      }
      
      const createdDocument = await response.json();
      
      // Добавляем новый документ в список
      setDocuments(prev => [...prev, createdDocument]);
      
      // Закрываем модальное окно
      closeModal();
      
    } catch (err) {
      console.error('Ошибка создания договора:', err);
      setError((err as Error).message || 'Не удалось создать договор');
    }
  };

  return (
    <div className="documents-container">
      <h2 className="documents-title">Договоры</h2>
      
      {error && <div className="error-message">{error}</div>}
      
      <div className="documents-filters">
        <div className="search-container">
          <input 
            type="text" 
            placeholder="Поиск по названию или клиенту..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        
        <div className="filter-selects">
          <select 
            value={selectedType} 
            onChange={(e) => setSelectedType(e.target.value)}
            className="filter-select"
          >
            {types.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          
          <select 
            value={selectedStatus} 
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="filter-select"
          >
            {statuses.map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>
        
        <button className="new-document-btn" onClick={openNewDocumentModal}>Новый договор</button>
      </div>
      
      {loading ? (
        <div className="loading-indicator">Загрузка договоров...</div>
      ) : filteredDocuments.length > 0 ? (
        <div className="documents-table-container">
          <table className="documents-table">
            <thead>
              <tr>
                <th>№</th>
                <th>Название</th>
                <th>Тип</th>
                <th>Статус</th>
                <th>Дата</th>
                <th>Клиент</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {filteredDocuments.map((doc, index) => (
                <tr key={doc.id}>
                  <td>{index + 1}</td>
                  <td>{doc.title}</td>
                  <td>{doc.type}</td>
                  <td>
                    <span className={`status-badge status-${doc.status.toLowerCase().replace(/\s+/g, '-')}`}>
                      {doc.status}
                    </span>
                  </td>
                  <td>{doc.date}</td>
                  <td>{doc.client}</td>
                  <td className="actions-cell">
                    <button className="action-btn view-btn">Просмотр</button>
                    <button className="action-btn edit-btn">Редактировать</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="no-documents">
          <p>Документы не найдены</p>
        </div>
      )}

      {/* Модальное окно для создания нового договора */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Создание нового договора</h3>
              <button className="modal-close-btn" onClick={closeModal}>&times;</button>
            </div>
            <form onSubmit={createNewDocument} className="document-form">
              <div className="form-group">
                <label htmlFor="title">Название договора</label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={newDocument.title}
                  onChange={handleInputChange}
                  placeholder="Введите название договора"
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="type">Тип договора</label>
                <input
                  type="text"
                  id="type"
                  name="type"
                  value={newDocument.type}
                  onChange={handleInputChange}
                  placeholder="Введите тип договора"
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="status">Статус</label>
                <select
                  id="status"
                  name="status"
                  value={newDocument.status}
                  onChange={handleInputChange}
                  required
                >
                  {documentStatuses.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label htmlFor="date">Дата</label>
                <input
                  type="date"
                  id="date"
                  name="date"
                  value={newDocument.date}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="client">Клиент</label>
                <input
                  type="text"
                  id="client"
                  name="client"
                  value={newDocument.client}
                  onChange={handleInputChange}
                  placeholder="Введите название клиента"
                  required
                />
              </div>
              
              <div className="form-actions">
                <button type="button" className="cancel-btn" onClick={closeModal}>Отмена</button>
                <button type="submit" className="submit-btn">Создать договор</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Documents; 