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
    clientName: '',
    representativeName: '',
    contractDate: new Date().toISOString().split('T')[0],
    subjectType: '', // 'documents' или 'representation'
    documentTypes: [] as string[], // для множественного выбора документов
    customSubject: '', // для произвольного ввода при представлении интересов
    contractCost: '',
    paymentDate: new Date().toISOString().split('T')[0],
    paidAmount: '',
    remainingAmount: '',
    remainingPaymentDate: new Date().toISOString().split('T')[0],
    materials: [] as File[]
  });

  // Опции для выбора типов документов
  const documentTypeOptions = [
    'Претензия',
    'Жалоба в прокуратуру', 
    'Жалоба в роспотребнадзор',
    'Исковое заявление'
  ];

  // Состояние для отображения загрузки файлов
  const [showMaterialsUpload, setShowMaterialsUpload] = useState(false);

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
    setShowMaterialsUpload(false);
    // Сбрасываем форму
    setNewDocument({
      clientName: '',
      representativeName: '',
      contractDate: new Date().toISOString().split('T')[0],
      subjectType: '',
      documentTypes: [],
      customSubject: '',
      contractCost: '',
      paymentDate: new Date().toISOString().split('T')[0],
      paidAmount: '',
      remainingAmount: '',
      remainingPaymentDate: new Date().toISOString().split('T')[0],
      materials: []
    });
  };

  // Обработка изменений в форме
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewDocument(prev => {
      const updated = {
        ...prev,
        [name]: value
      };
      
      // Автоматический расчет остатка
      if (name === 'contractCost' || name === 'paidAmount') {
        const cost = parseFloat(name === 'contractCost' ? value : prev.contractCost) || 0;
        const paid = parseFloat(name === 'paidAmount' ? value : prev.paidAmount) || 0;
        const remaining = Math.max(0, cost - paid);
        updated.remainingAmount = remaining.toString();
      }
      
      return updated;
    });
  };

  // Обработка выбора типов документов
  const handleDocumentTypeChange = (type: string, checked: boolean) => {
    setNewDocument(prev => ({
      ...prev,
      documentTypes: checked 
        ? [...prev.documentTypes, type]
        : prev.documentTypes.filter(t => t !== type)
    }));
  };

  // Обработка загрузки файлов
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setNewDocument(prev => ({
      ...prev,
      materials: [...prev.materials, ...files]
    }));
  };

  // Удаление файла
  const removeFile = (index: number) => {
    setNewDocument(prev => ({
      ...prev,
      materials: prev.materials.filter((_, i) => i !== index)
    }));
  };

  // Создание нового договора
  const createNewDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Валидация обязательных полей
    if (!newDocument.clientName.trim()) {
      alert('Пожалуйста, введите ФИО клиента');
      return;
    }
    
    if (!newDocument.subjectType) {
      alert('Пожалуйста, выберите предмет договора');
      return;
    }
    
    if (newDocument.subjectType === 'documents' && newDocument.documentTypes.length === 0) {
      alert('Пожалуйста, выберите хотя бы один тип документа');
      return;
    }
    
    if (newDocument.subjectType === 'representation' && !newDocument.customSubject.trim()) {
      alert('Пожалуйста, опишите предмет представления интересов');
      return;
    }
    
    if (!newDocument.contractCost || parseFloat(newDocument.contractCost) <= 0) {
      alert('Пожалуйста, введите корректную стоимость договора');
      return;
    }
    
    if (!newDocument.paidAmount || parseFloat(newDocument.paidAmount) < 0) {
      alert('Пожалуйста, введите корректную сумму внесения');
      return;
    }
    
    if (!officeId) {
      setError('ID офиса не найден');
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Требуется авторизация');
      }
      
      // Формируем предмет договора в зависимости от выбранного типа
      let contractSubject = '';
      if (newDocument.subjectType === 'documents') {
        contractSubject = `Документы: ${newDocument.documentTypes.join(', ')}`;
      } else {
        contractSubject = `Представление интересов: ${newDocument.customSubject}`;
      }
      
      const contractData = {
        ...newDocument,
        contractSubject,
        officeId
      };
      
      const response = await fetch('http://localhost:5000/api/documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(contractData)
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
      
      // Показываем уведомление об успешном создании
      alert('Договор успешно создан!');
      
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
          <div className="modal-content contract-modal">
            <div className="modal-header">
              <h3>Создание нового договора</h3>
              <button className="modal-close-btn" onClick={closeModal}>&times;</button>
            </div>
            <form onSubmit={createNewDocument} className="document-form">
              {/* ФИО клиента */}
              <div className="form-group">
                <label htmlFor="clientName">ФИО клиента *</label>
                <input
                  type="text"
                  id="clientName"
                  name="clientName"
                  value={newDocument.clientName}
                  onChange={handleInputChange}
                  placeholder="Введите ФИО клиента"
                  required
                />
              </div>
              
              {/* В интересах ФИО (необязательное) */}
              <div className="form-group">
                <label htmlFor="representativeName">В интересах ФИО</label>
                <input
                  type="text"
                  id="representativeName"
                  name="representativeName"
                  value={newDocument.representativeName}
                  onChange={handleInputChange}
                  placeholder="Введите ФИО представляемого лица (необязательно)"
                />
              </div>
              
              {/* Дата заключения */}
              <div className="form-group">
                <label htmlFor="contractDate">Дата заключения *</label>
                <input
                  type="date"
                  id="contractDate"
                  name="contractDate"
                  value={newDocument.contractDate}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              {/* Предмет договора */}
              <div className="form-group">
                <label>Предмет договора *</label>
                <div className="subject-type-selector">
                  <div className="radio-group">
                    <label className="radio-label">
                      <input
                        type="radio"
                        name="subjectType"
                        value="documents"
                        checked={newDocument.subjectType === 'documents'}
                        onChange={handleInputChange}
                      />
                      <span className="radio-custom"></span>
                      Документы
                    </label>
                    <label className="radio-label">
                      <input
                        type="radio"
                        name="subjectType"
                        value="representation"
                        checked={newDocument.subjectType === 'representation'}
                        onChange={handleInputChange}
                      />
                      <span className="radio-custom"></span>
                      Представление интересов
                    </label>
                  </div>
                </div>
                
                {/* Множественный выбор документов */}
                {newDocument.subjectType === 'documents' && (
                  <div className="document-types-selection">
                    <label>Выберите типы документов:</label>
                    <div className="checkbox-group">
                      {documentTypeOptions.map(type => (
                        <label key={type} className="checkbox-label">
                          <input
                            type="checkbox"
                            checked={newDocument.documentTypes.includes(type)}
                            onChange={(e) => handleDocumentTypeChange(type, e.target.checked)}
                          />
                          <span className="checkbox-custom"></span>
                          {type}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Произвольный ввод для представления интересов */}
                {newDocument.subjectType === 'representation' && (
                  <div className="custom-subject-input">
                    <input
                      type="text"
                      name="customSubject"
                      value={newDocument.customSubject}
                      onChange={handleInputChange}
                      placeholder="Опишите предмет представления интересов"
                      required
                    />
                  </div>
                )}
              </div>
              
              {/* Стоимость договора */}
              <div className="form-group">
                <label htmlFor="contractCost">Стоимость договора *</label>
                <input
                  type="number"
                  id="contractCost"
                  name="contractCost"
                  value={newDocument.contractCost}
                  onChange={handleInputChange}
                  placeholder="Введите стоимость в рублях"
                  min="0"
                  step="0.01"
                  required
                />
              </div>
              
              {/* Дата и сумма внесения */}
              <div className="form-row">
                <div className="form-group half-width">
                  <label htmlFor="paymentDate">Дата внесения *</label>
                  <input
                    type="date"
                    id="paymentDate"
                    name="paymentDate"
                    value={newDocument.paymentDate}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group half-width">
                  <label htmlFor="paidAmount">Сумма внесения *</label>
                  <input
                    type="number"
                    id="paidAmount"
                    name="paidAmount"
                    value={newDocument.paidAmount}
                    onChange={handleInputChange}
                    placeholder="Введите сумму"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
              </div>
              
              {/* Остаток */}
               {parseFloat(newDocument.remainingAmount) > 0 && (
                 <div className="form-group">
                   <label>Остаток к доплате</label>
                   <div className="remaining-amount">
                     {parseFloat(newDocument.remainingAmount).toLocaleString('ru-RU')} ₽
                   </div>
                   <div className="form-group" style={{marginTop: '15px'}}>
                     <label htmlFor="remainingPaymentDate">Дата внесения остатка *</label>
                     <input
                       type="date"
                       id="remainingPaymentDate"
                       name="remainingPaymentDate"
                       value={newDocument.remainingPaymentDate}
                       onChange={handleInputChange}
                       required
                     />
                   </div>
                 </div>
               )}
              
              {/* Материалы дела */}
              <div className="form-group">
                <label>Материалы дела</label>
                <button 
                  type="button" 
                  className="materials-btn"
                  onClick={() => setShowMaterialsUpload(!showMaterialsUpload)}
                >
                  {showMaterialsUpload ? 'Скрыть загрузку файлов' : 'Загрузить материалы дела'}
                </button>
                
                {showMaterialsUpload && (
                  <div className="materials-upload">
                    <input
                      type="file"
                      multiple
                      accept="image/*,.pdf,.doc,.docx"
                      onChange={handleFileUpload}
                      className="file-input"
                    />
                    
                    {newDocument.materials.length > 0 && (
                      <div className="uploaded-files">
                        <h4>Загруженные файлы:</h4>
                        <div className="files-list">
                          {newDocument.materials.map((file, index) => (
                            <div key={index} className="file-item">
                              <span className="file-name">{file.name}</span>
                              <button 
                                type="button" 
                                className="remove-file-btn"
                                onClick={() => removeFile(index)}
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
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