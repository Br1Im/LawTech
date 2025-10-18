import React, { useState, useEffect } from 'react';
import { buildApiUrl } from '../shared/utils/apiUtils';
import { useAuth } from '../shared/lib/hooks/useAuth';
import './Documents.css';
import { FiEye, FiEdit2, FiSearch, FiTrash2 } from 'react-icons/fi';

interface Document {
  id: number;
  title: string;
  type: string;
  status: string;
  date: string;
  client: string;
  contractNumber?: string;
}

interface DocumentsProps {
  contractId?: string | null;
}

const Documents: React.FC<DocumentsProps> = ({ contractId }) => {

  const [documents, setDocuments] = useState<Document[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('Все темы');
  const [selectedStatus, setSelectedStatus] = useState<string>('Все статусы');
  const [contractTopic, setContractTopic] = useState<string>('Гражданское право');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [editedDocument, setEditedDocument] = useState<Document | null>(null);
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
  const [documentTypeOptions, setDocumentTypeOptions] = useState<string[]>([
    'Претензия',
    'Жалоба в роспотребнадзор',
    'Жалоба в прокуратуру',
    'Жалоба в трудовую инспекцию',
  ]);
  const [newDocType, setNewDocType] = useState<string>('');

  const addCustomDocumentType = () => {
    const value = newDocType.trim();
    if (!value) return;
    setDocumentTypeOptions(prev => (prev.includes(value) ? prev : [...prev, value]));
    setNewDocument(prev => ({
      ...prev,
      documentTypes: prev.documentTypes.includes(value)
        ? prev.documentTypes
        : [...prev.documentTypes, value]
    }));
    setNewDocType('');
  };

  const [showMaterialsUpload, setShowMaterialsUpload] = useState(false);

  const { isAuthenticated, user } = useAuth();

  // Загрузка договоров с сервера
  useEffect(() => {
    const fetchDocuments = async () => {
      if (!isAuthenticated || !user) {
        setError('Требуется авторизация');
        setDocuments([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        // Получаем токен авторизации
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('Требуется авторизация');
        }

        // Получаем ID офиса из профиля пользователя
        const profileResponse = await fetch(buildApiUrl('/profile'), {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (!profileResponse.ok) {
          throw new Error('Не удалось получить данные профиля');
        }

        const profileData = await profileResponse.json();
        const officeId = profileData.user?.officeId;
        setOfficeId(officeId);

        if (!officeId) {
          throw new Error('Офис не найден');
        }

        // Получаем список договоров для данного офиса
        const documentsResponse = await fetch(buildApiUrl(`/office/${officeId}/contracts`), {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (!documentsResponse.ok) {
          throw new Error('Не удалось получить список договоров');
        }

        const documentsData = await documentsResponse.json();
        // Преобразуем contracts в формат Document для совместимости с UI
        const transformedDocuments = (documentsData.contracts || []).map((contract: any) => ({
          id: contract.id,
          title: `Договор с ${contract.client_name}`,
          type: contract.contract_type,
          status: contract.status,
          date: new Date(contract.created_at).toLocaleDateString('ru-RU'),
          client: contract.client_name,
          contractNumber: contract.contract_number
        }));
        setDocuments(transformedDocuments);
        
        // Если передан ID договора, просто выделяем его (без открытия модального окна)
        if (contractId) {
          const contractIdNum = parseInt(contractId);
          if (!isNaN(contractIdNum)) {
            // Найдем договор и выделим его
            const foundDocument = transformedDocuments.find((doc: any) => doc.id === contractIdNum);
            if (foundDocument) {
              setSelectedDocument(foundDocument);
              // Убираем автоматическое открытие модального окна
              // setIsViewModalOpen(true);
            }
          }
        }
      } catch (err) {
        console.error('Ошибка получения договоров:', err);
        setError((err as Error).message || 'Не удалось загрузить список договоров');
        // Фолбэк: пробуем взять локально сохранённые договоры
        try {
          const local = localStorage.getItem('local_documents');
          if (local) {
            const parsed: Document[] = JSON.parse(local);
            setDocuments(parsed);
          } else {
            setDocuments([]);
          }
        } catch {
          setDocuments([]);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
  }, [isAuthenticated, user]);

  // Справочник тем (только эти темы допустимы)
  const TOPICS = [
    'Уголовное право',
    'Военное право',
    'Миграционное право',
    'Административное право',
    'Пенсионное право',
    'Защита прав потребителей',
    'Трудовое право',
    'Гражданское право',
  ];

  // Темы и статусы для фильтров
  const types = ['Все темы', ...TOPICS];
  const statuses = ['Все статусы', ...Array.from(new Set(documents.map(doc => doc.status)))];

  // Фильтрация документов
  const filteredDocuments = documents.filter(doc => {
    const term = searchTerm.trim().toLowerCase();
    const matchesSearch = term === '' 
      || doc.client.toLowerCase().includes(term)
      || (doc.contractNumber || '').toLowerCase().includes(term);
    const matchesType = selectedType === 'Все темы' || doc.type === selectedType;
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

  // Функции для просмотра и редактирования документов
  const handleViewDocument = (document: Document) => {
    setSelectedDocument(document);
    setIsViewModalOpen(true);
  };

  const handleEditDocument = (document: Document) => {
    setSelectedDocument(document);
    setEditedDocument({ ...document });
    setIsEditModalOpen(true);
  };

  const closeViewModal = () => {
    setIsViewModalOpen(false);
    setSelectedDocument(null);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setSelectedDocument(null);
    setEditedDocument(null);
  };

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (editedDocument) {
      setEditedDocument(prev => prev ? { ...prev, [name]: value } : null);
    }
  };

  const saveDocumentChanges = async () => {
    if (editedDocument && selectedDocument) {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('Требуется авторизация');
        }

        const response = await fetch(buildApiUrl(`/legal-documents/${selectedDocument.id}`), {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            title: editedDocument.title,
            content: editedDocument.client, // используем поле client как content
            category: editedDocument.type
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Ошибка при сохранениих');
        }

        // Обновляем документ в локальном массиве только после успешного сохранения на сервере
        setDocuments(prev => 
          prev.map(doc => 
            doc.id === selectedDocument.id ? editedDocument : doc
          )
        );
        
        alert('Изменения сохранены успешно!');
        closeEditModal();
      } catch (error) {
        console.error('Ошибка сохранения:', error);
        alert(`Ошибка при сохранении: ${(error as Error).message}`);
      }
    }
  };

  const deleteDocument = async () => {
    if (editedDocument) {
      // Подтверждение удаления
      const confirmDelete = window.confirm(
        `Вы уверены, что хотите удалить договор "${editedDocument.title}"?\nЭто действие нельзя отменить.`
      );
      
      if (!confirmDelete) {
        return;
      }

      try {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('Требуется авторизация');
        }

        console.log('Удаление документа с ID:', editedDocument.id);
        
        const response = await fetch(buildApiUrl(`/legal-documents/${editedDocument.id}`), {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        console.log('Ответ сервера:', response.status, response.statusText);

        if (!response.ok) {
          let errorMessage = 'Ошибка при удалении договора';
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
          } catch (e) {
            errorMessage = `HTTP ${response.status}: ${response.statusText}`;
          }
          throw new Error(errorMessage);
        }

        // Удаляем документ из локального массива
        setDocuments(prev => prev.filter(doc => doc.id !== editedDocument.id));
        
        alert('Договор успешно удален!');
        closeEditModal();
      } catch (error) {
        console.error('Ошибка удаления:', error);
        alert(`Ошибка при удалении: ${(error as Error).message}`);
      }
    }
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
    
    try {
      // Формируем предмет договора в зависимости от выбранного типа
      let contractSubject = '';
      if (newDocument.subjectType === 'documents') {
        contractSubject = `Документы: ${newDocument.documentTypes.join(', ')}`;
      } else {
        contractSubject = `Представление интересов: ${newDocument.customSubject}`;
      }
      
      const selectedTopic = TOPICS.includes(contractTopic) ? contractTopic : 'Гражданское право';
      
      // Отправляем запрос на сервер для создания договора
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Требуется авторизация');
      }

      const contractData = {
        client_name: newDocument.clientName,
        contract_type: selectedTopic,
        subject: contractSubject,
        amount: parseFloat(newDocument.contractCost),
        status: 'active',
        contract_date: newDocument.contractDate
      };

      const response = await fetch(buildApiUrl('/contracts'), {
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

      const result = await response.json();
      const createdContract = result.contract;
      
      // Преобразуем созданный договор в формат Document для UI
      const uiDoc: Document = {
        id: createdContract.id,
        title: `Договор с ${createdContract.client_name}`,
        type: createdContract.contract_type,
        status: createdContract.status,
        date: new Date(createdContract.created_at).toLocaleDateString('ru-RU'),
        client: createdContract.client_name,
        contractNumber: createdContract.contract_number
      };
      
      // Обновляем список в состоянии
      setDocuments(prev => [...prev, uiDoc]);
      
      // Закрываем модалку и уведомляем
      closeModal();
      alert('Договор успешно создан!');
      
    } catch (err) {
      console.error('Ошибка создания договора:', err);
      setError((err as Error).message || 'Не удалось создать договор');
      alert(`Ошибка при создании договора: ${(err as Error).message}`);
    }
  };



  return (
    <div className="documents-container">
      <h2 className="documents-title">Договоры</h2>
      
      {error && <div className="error-message">{error}</div>}
      
      <div className="documents-filters">
        <div className="search-container">
          <div className="search-input-wrapper">
            <input 
              type="text" 
              placeholder="Поиск по ФИО или номеру договора..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            <span className="search-input-icon" aria-hidden="true"><FiSearch size={16} /></span>
          </div>
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
                <th>Номер</th>
                <th>Название</th>
                <th>Тип</th>
                <th>Статус</th>
                <th>Дата</th>
                <th>Клиент</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {filteredDocuments.map((doc) => (
                <tr 
                  key={doc.id}
                  className={contractId && doc.id && doc.id.toString() === contractId ? 'selected-contract' : ''}
                >
                  <td>{doc.contractNumber || ''}</td>
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
                    <button 
                      className="action-btn edit-btn"
                      onClick={() => handleEditDocument(doc)}
                      title="Редактировать"
                      aria-label="Редактировать"
                    >
                      <FiEdit2 size={16} />
                    </button>
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
              
              {/* Тема договора (перед предметом) */}
              <div className="form-group">
                <label htmlFor="contractTopic">Тема договора *</label>
                <select
                  id="contractTopic"
                  className="form-input"
                  value={contractTopic}
                  onChange={(e) => setContractTopic(e.target.value)}
                >
                  {TOPICS.map(topic => (
                    <option key={topic} value={topic}>{topic}</option>
                  ))}
                </select>
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
                    <div className="custom-type-row">
                      <input
                        type="text"
                        value={newDocType}
                        onChange={(e) => setNewDocType(e.target.value)}
                        placeholder="Добавить свой вариант"
                        className="form-input"
                      />
                      <button type="button" className="custom-type-add-btn" onClick={addCustomDocumentType}>
                        Добавить
                      </button>
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

      {/* Модальное окно просмотра документа */}
      {isViewModalOpen && selectedDocument && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Просмотр договора</h3>
              <button className="modal-close-btn" onClick={closeViewModal}>&times;</button>
            </div>
            <div className="document-details">
              <div className="detail-row">
                <strong>Название:</strong> {selectedDocument.title}
              </div>
              <div className="detail-row">
                <strong>Тип:</strong> {selectedDocument.type}
              </div>
              <div className="detail-row">
                <strong>Статус:</strong> 
                <span className={`status-badge status-${selectedDocument.status.toLowerCase().replace(/\s+/g, '-')}`}>
                  {selectedDocument.status}
                </span>
              </div>
              <div className="detail-row">
                <strong>Дата:</strong> {selectedDocument.date}
              </div>
              <div className="detail-row">
                <strong>Клиент:</strong> {selectedDocument.client}
              </div>
            </div>
            <div className="form-actions">
              <button type="button" className="cancel-btn" onClick={closeViewModal}>Закрыть</button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно редактирования документа */}
      {isEditModalOpen && selectedDocument && editedDocument && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Редактирование договора</h3>
              <button className="modal-close-btn" onClick={closeEditModal}>&times;</button>
            </div>
            <form className="document-form">
              <div className="form-group">
                <label htmlFor="editTitle">Название</label>
                <input
                  type="text"
                  id="editTitle"
                  name="title"
                  value={editedDocument.title}
                  onChange={handleEditInputChange}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label htmlFor="editType">Тип</label>
                <input
                  type="text"
                  id="editType"
                  name="type"
                  value={editedDocument.type}
                  onChange={handleEditInputChange}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label htmlFor="editStatus">Статус</label>
                <select 
                  id="editStatus" 
                  name="status"
                  value={editedDocument.status} 
                  onChange={handleEditInputChange}
                  className="form-input"
                >
                  <option value="Черновик">Черновик</option>
                  <option value="На согласовании">На согласовании</option>
                  <option value="Подписан">Подписан</option>
                  <option value="Расторгнут">Расторгнут</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="editDate">Дата</label>
                <input
                  type="date"
                  id="editDate"
                  name="date"
                  value={editedDocument.date.split('.').reverse().join('-')}
                  onChange={(e) => {
                    const formattedDate = e.target.value.split('-').reverse().join('.');
                    handleEditInputChange({ target: { name: 'date', value: formattedDate } } as any);
                  }}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label htmlFor="editClient">Клиент</label>
                <input
                  type="text"
                  id="editClient"
                  name="client"
                  value={editedDocument.client}
                  onChange={handleEditInputChange}
                  className="form-input"
                />
              </div>
            </form>
            <div className="form-actions">
              <button type="button" className="cancel-btn" onClick={closeEditModal}>Отмена</button>
              <button type="button" className="delete-btn" onClick={deleteDocument} title="Удалить договор">
                <FiTrash2 size={16} />
                Удалить
              </button>
              <button type="button" className="submit-btn" onClick={saveDocumentChanges}>Сохранить изменения</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Documents;