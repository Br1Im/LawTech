import React, { useState, useEffect } from "react";
import "./Materials.css";
import { buildApiUrl } from "../shared/utils/apiUtils";

interface Employee {
  id: number;
  name: string;
  middle_name: string;
  surname: string;
}

interface CaseDocument {
  id?: number;
  name: string;
  file_path?: string;
}

interface Case {
  id?: number;
  client_name: string;
  phone_number: string;
  case_description: string;
  lawyer_id: number;
  date: string;
  deadline: string;
  topic: string;
  value: string;
  contract_number: string;
  contract_sum: string;
  paid_sum: string;
  remaining_sum: string;
  documents: CaseDocument[];
}

interface TechTask {
  clientFio: string;
  reason: string;
  doc1: string;
  doc2: string;
  doc3: string;
  doc4: string;
}

const Materials: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([
    { id: 1, name: "Иван", middle_name: "Иванович", surname: "Иванов" },
    { id: 2, name: "Мария", middle_name: "Александровна", surname: "Смирнова" },
  ]);
  
  const [file, setFile] = useState<File | null>(null);
  const [files, setFiles] = useState<{name: string, url: string}[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [officeId, setOfficeId] = useState<string | null>(null);
  
  const [showModal, setShowModal] = useState<boolean>(false);
  const [showTechTaskModal, setShowTechTaskModal] = useState<boolean>(false);
  const [showCaseDetailsModal, setShowCaseDetailsModal] = useState<boolean>(false);
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [addingDocument, setAddingDocument] = useState<boolean>(false);

  // Данные для нового дела
  const [newCase, setNewCase] = useState<Case>({
    client_name: "",
    phone_number: "",
    case_description: "",
    lawyer_id: employees[0]?.id || 1,
    date: "",
    deadline: "",
    topic: "",
    value: "",
    contract_number: "",
    contract_sum: "",
    paid_sum: "",
    remaining_sum: "",
    documents: [],
  });

  // Данные для технического задания
  const [techTask, setTechTask] = useState<TechTask>({
    clientFio: "",
    reason: "",
    doc1: "",
    doc2: "",
    doc3: "",
    doc4: "",
  });

  // Получение данных с сервера
  useEffect(() => {
    const fetchData = async () => {
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
        const officeId = profileData.officeId;
        setOfficeId(officeId);

        if (!officeId) {
          throw new Error('Офис не найден');
        }

        // Получаем список материалов дел для данного офиса
        const casesResponse = await fetch(buildApiUrl(`/office/${officeId}/cases`), {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (!casesResponse.ok) {
          throw new Error('Не удалось получить список материалов дел');
        }

        const casesData = await casesResponse.json();
        setCases(casesData);

        // Получаем список сотрудников
        const employeesResponse = await fetch(buildApiUrl(`/office/${officeId}/employees`), {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (employeesResponse.ok) {
          const employeesData = await employeesResponse.json();
          if (Array.isArray(employeesData) && employeesData.length > 0) {
            // Преобразуем данные сотрудников в нужный формат
            const formattedEmployees = employeesData.map(emp => ({
              id: emp.id,
              name: emp.name.split(' ')[1] || '',
              middle_name: emp.name.split(' ')[2] || '',
              surname: emp.name.split(' ')[0] || ''
            }));
            setEmployees(formattedEmployees);
            
            // Обновляем начальное значение для lawyer_id в форме нового дела
            if (formattedEmployees.length > 0) {
              setNewCase(prev => ({...prev, lawyer_id: formattedEmployees[0].id}));
            }
          }
        }
      } catch (err) {
        console.error('Ошибка получения данных:', err);
        setError((err as Error).message || 'Не удалось загрузить данные');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Обработчик изменения данных нового дела
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewCase((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  };

  // Обработчик изменения данных техзадания
  const handleTechTaskChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setTechTask((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  };

  // Добавляем новый кейс
  const addCase = async () => {
    if (!officeId) {
      setError('ID офиса не найден');
      return;
    }

    if (!newCase.client_name || !newCase.phone_number || !newCase.date || !newCase.deadline || !newCase.topic) {
      setError('Пожалуйста, заполните все обязательные поля');
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Требуется авторизация');
      }

      const response = await fetch(buildApiUrl('/cases'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...newCase,
          officeId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка при создании дела');
      }

      const createdCase = await response.json();
      setCases(prevCases => [...prevCases, createdCase]);
      
      setShowModal(false);
      setNewCase({
        client_name: "",
        phone_number: "",
        case_description: "",
        lawyer_id: employees[0]?.id || 1,
        date: "",
        deadline: "",
        topic: "",
        value: "",
        contract_number: "",
        contract_sum: "",
        paid_sum: "",
        remaining_sum: "",
        documents: [],
      });
      setError(null);
    } catch (err) {
      console.error('Ошибка создания дела:', err);
      setError((err as Error).message || 'Не удалось создать дело');
    } finally {
      setLoading(false);
    }
  };

  // Сохранение технического задания
  const saveTechTask = () => {
    console.log("Техническое задание:", techTask);
    setShowTechTaskModal(false);
    setTechTask({
      clientFio: "",
      reason: "",
      doc1: "",
      doc2: "",
      doc3: "",
      doc4: "",
    });
  };

  // Обработчик изменения файла
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  // Отправка файла
  const uploadFile = async () => {
    if (!file || !selectedCase || !selectedCase.id) return;
    
    try {
      setAddingDocument(true);
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Требуется авторизация');
      }

      // В реальном приложении здесь был бы загрузка файла на сервер
      // Сейчас просто сохраним имя файла
      const response = await fetch(buildApiUrl(`/cases/${selectedCase.id}/documents`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: file.name,
          file_path: URL.createObjectURL(file)
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка при загрузке документа');
      }

      const newDocument = await response.json();
      
      // Обновляем список документов в выбранном деле
      if (selectedCase) {
        const updatedCase = {
          ...selectedCase,
          documents: [...selectedCase.documents, newDocument]
        };

        // Обновляем выбранное дело и список всех дел
        setSelectedCase(updatedCase);
        setCases(cases.map(c => c.id === selectedCase.id ? updatedCase : c));
      }

      // Сбрасываем файл
      setFile(null);
      setError(null);
    } catch (err) {
      console.error('Ошибка загрузки файла:', err);
      setError((err as Error).message || 'Не удалось загрузить файл');
    } finally {
      setAddingDocument(false);
    }
  };

  // Отображение деталей дела
  const viewCaseDetails = (caseItem: Case) => {
    setSelectedCase(caseItem);
    setShowCaseDetailsModal(true);
  };

  // Закрытие модального окна
  const closeCaseDetailsModal = () => {
    setSelectedCase(null);
    setShowCaseDetailsModal(false);
  };

  // Добавление документа
  const addDocument = (docName: string) => {
    if (selectedCase && selectedCase.id) {
      // Эта функция использовалась для локального добавления документа
      // Теперь мы используем uploadFile для взаимодействия с API
    }
  };

  return (
    <div className="materials-container">
      <h2 className="materials-title">Материалы дела</h2>

      {error && <div className="error-message">{error}</div>}

      <div className="button-group">
        <button className="open-modal-btn" onClick={() => setShowModal(true)}>
          Добавить новое дело
        </button>
        <button className="open-tech-task-btn" onClick={() => setShowTechTaskModal(true)}>
          Добавить техническое задание
        </button>
      </div>

      {loading ? (
        <div className="loading-indicator">Загрузка материалов дел...</div>
      ) : (
        <div className="cases-list">
          {cases.length > 0 ? (
            cases.map((caseItem, index) => (
              <div 
                key={caseItem.id || index} 
                className="case-item"
                onClick={() => viewCaseDetails(caseItem)}
              >
                <h3>{caseItem.client_name}</h3>
                <p><strong>Тема:</strong> {caseItem.topic}</p>
                <p><strong>Номер договора:</strong> {caseItem.contract_number}</p>
                <p><strong>Дедлайн:</strong> {caseItem.deadline}</p>
              </div>
            ))
          ) : (
            <p className="no-cases">Нет материалов дел</p>
          )}
        </div>
      )}

      {/* Модальное окно добавления дела */}
      {showModal && (
        <div className="modal">
          <div className="modal-content">
            <span className="close-button" onClick={() => setShowModal(false)}>
              ×
            </span>
            <h3>Добавить новое дело</h3>
            <form>
              <input
                type="text"
                name="client_name"
                value={newCase.client_name}
                onChange={handleInputChange}
                placeholder="Имя клиента"
                required
              />
              <input
                type="text"
                name="phone_number"
                value={newCase.phone_number}
                onChange={handleInputChange}
                placeholder="Номер телефона"
                required
              />
              <textarea
                name="case_description"
                value={newCase.case_description}
                onChange={handleInputChange}
                placeholder="Описание дела"
              />
              <select
                name="lawyer_id"
                value={newCase.lawyer_id}
                onChange={handleInputChange}
                required
              >
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.surname} {emp.name} {emp.middle_name}
                  </option>
                ))}
              </select>
              <input
                type="date"
                name="date"
                value={newCase.date}
                onChange={handleInputChange}
                placeholder="Дата"
                required
              />
              <input
                type="date"
                name="deadline"
                value={newCase.deadline}
                onChange={handleInputChange}
                placeholder="Дедлайн"
                required
              />
              <input
                type="text"
                name="topic"
                value={newCase.topic}
                onChange={handleInputChange}
                placeholder="Тема"
                required
              />
              <input
                type="text"
                name="contract_number"
                value={newCase.contract_number}
                onChange={handleInputChange}
                placeholder="Номер договора"
              />
              <input
                type="text"
                name="contract_sum"
                value={newCase.contract_sum}
                onChange={handleInputChange}
                placeholder="Сумма договора"
              />
              <input
                type="text"
                name="paid_sum"
                value={newCase.paid_sum}
                onChange={handleInputChange}
                placeholder="Оплаченная сумма"
              />
              <button 
                type="button" 
                onClick={addCase}
                disabled={loading}
              >
                {loading ? 'Сохранение...' : 'Добавить'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Модальное окно технического задания */}
      {showTechTaskModal && (
        <div className="modal">
          <div className="modal-content">
            <span className="close-button" onClick={() => setShowTechTaskModal(false)}>
              ×
            </span>
            <h3>Добавить техническое задание</h3>
            <form>
              <input
                type="text"
                name="clientFio"
                value={techTask.clientFio}
                onChange={handleTechTaskChange}
                placeholder="ФИО клиента"
              />
              <textarea
                name="reason"
                value={techTask.reason}
                onChange={handleTechTaskChange}
                placeholder="Причина обращения"
              />
              <input
                type="text"
                name="doc1"
                value={techTask.doc1}
                onChange={handleTechTaskChange}
                placeholder="Документ 1"
              />
              <input
                type="text"
                name="doc2"
                value={techTask.doc2}
                onChange={handleTechTaskChange}
                placeholder="Документ 2"
              />
              <input
                type="text"
                name="doc3"
                value={techTask.doc3}
                onChange={handleTechTaskChange}
                placeholder="Документ 3"
              />
              <input
                type="text"
                name="doc4"
                value={techTask.doc4}
                onChange={handleTechTaskChange}
                placeholder="Документ 4"
              />
              <button type="button" onClick={saveTechTask}>
                Сохранить
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Модальное окно с деталями дела */}
      {showCaseDetailsModal && selectedCase && (
        <div className="modal">
          <div className="modal-content">
            <span className="close-button" onClick={closeCaseDetailsModal}>
              ×
            </span>
            <h3>Детали дела</h3>
            <div className="case-details">
              <p><strong>Клиент:</strong> {selectedCase.client_name}</p>
              <p><strong>Телефон:</strong> {selectedCase.phone_number}</p>
              <p><strong>Описание:</strong> {selectedCase.case_description}</p>
              <p><strong>Тема:</strong> {selectedCase.topic}</p>
              <p><strong>Дата:</strong> {selectedCase.date}</p>
              <p><strong>Дедлайн:</strong> {selectedCase.deadline}</p>
              <p><strong>Номер договора:</strong> {selectedCase.contract_number}</p>
              <p><strong>Сумма договора:</strong> {selectedCase.contract_sum}</p>
              <p><strong>Оплачено:</strong> {selectedCase.paid_sum}</p>
              <p><strong>Осталось оплатить:</strong> {selectedCase.remaining_sum}</p>
              
              <div className="file-upload-section">
                <h4>Загрузить документ</h4>
                <input type="file" onChange={handleFileChange} disabled={addingDocument} />
                <button onClick={uploadFile} disabled={!file || addingDocument}>
                  {addingDocument ? 'Загрузка...' : 'Загрузить'}
                </button>
              </div>
              
              <div className="documents-list">
                <h4>Документы по делу</h4>
                {selectedCase.documents.length > 0 ? (
                  <ul>
                    {selectedCase.documents.map((doc, idx) => (
                      <li key={doc.id || idx}>
                        {doc.file_path ? (
                          <a href={doc.file_path} target="_blank" rel="noopener noreferrer">
                            {doc.name}
                          </a>
                        ) : (
                          <span>{doc.name}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>Нет документов</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Materials; 