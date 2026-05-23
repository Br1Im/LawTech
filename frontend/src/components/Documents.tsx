import React, { useState, useEffect } from 'react';
import { buildApiUrl, getAuthHeaders } from '../shared/utils/apiUtils';
import { useAuth } from '../shared/lib/hooks/useAuth';
import { useNotification } from '../hooks/useNotification';
import { ToastContainer } from './Toast';
import './Documents.css';
import { FiEdit2, FiSearch, FiTrash2 } from 'react-icons/fi';
import { TableSkeleton, EmptyState } from './ui';

// Функция для перевода статусов на русский язык
const getStatusText = (status: string) => {
  const statusMap: { [key: string]: string } = {
    'draft': 'Черновик',
    'active': 'Подписан',
    'completed': 'Завершен',
    'cancelled': 'Расторгнут',
    'Подписан': 'Подписан',
    'Завершен': 'Завершен',
    'Расторгнут': 'Расторгнут'
  };
  return statusMap[status] || status;
};

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
  /** Когда true, рендерит только кнопку «Новый договор» и её модалку создания,
   *  без заголовка/фильтров/таблицы. Нужно чтобы встраивать кнопку на другие
   *  страницы (например, в шапку вкладки «Клиенты»). */
  headless?: boolean;
}

const Documents: React.FC<DocumentsProps> = ({ contractId, headless = false }) => {
  const { notifications, removeNotification, showSuccess, showError, showWarning } = useNotification();

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
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(null);
  
  // Состояния для нового договора
  const [newDocument, setNewDocument] = useState({
    clientName: '',
    // ФИО клиента раздельно
    clientLastName: '' as string,
    clientFirstName: '' as string,
    clientMiddleName: '' as string,
    // В чьих интересах действует клиент (опционально)
    actingFor: '' as string,
    representativeName: '',
    clientPhone: '',
    contractDate: new Date().toISOString().split('T')[0],
    subjectType: '', // 'documents' или 'representation'
    documentTypes: [] as string[], // для множественного выбора документов
    customSubject: '', // для произвольного ввода при представлении интересов
    contractCost: '',
    paymentDate: new Date().toISOString().split('T')[0],
    paidAmount: '',
    remainingAmount: '',
    remainingPaymentDate: new Date().toISOString().split('T')[0],
    materials: [] as File[],
    expertId: '' as string,
    // ТЗ — обязательно для типа «Документы»
    customerGoal: '' as string,
    situationDescription: '' as string,
    expertDeadlineDays: '' as string,
    // Финансовые справочные поля (только пометка для эксперта, в статистику не идут)
    legalCostComp: '' as string,
    moralComp: '' as string,
  });
  // id-ы загруженных файлов до отправки договора; привязываются к делу после создания
  const [uploadedMaterialIds, setUploadedMaterialIds] = useState<number[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);

  // Experts (роль в employees — expert) из текущего офиса.
  const [experts, setExperts] = useState<Array<{ id: number; name: string }>>([]);

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

  // Функция автозаполнения тестовыми данными
  const fillWithTestData = () => {
    const today = new Date();
    const nextMonth = new Date(today);
    nextMonth.setMonth(today.getMonth() + 1);
    
    const formattedToday = today.toISOString().split('T')[0];
    const formattedNextMonth = nextMonth.toISOString().split('T')[0];
    
    setNewDocument({
      clientName: 'Иванов Иван Иванович',
      clientLastName: 'Иванов',
      clientFirstName: 'Иван',
      clientMiddleName: 'Иванович',
      actingFor: '',
      representativeName: 'Петров Петр Петрович',
      clientPhone: '+7 (999) 123-45-67',
      contractDate: formattedToday,
      subjectType: 'documents',
      documentTypes: ['Претензия', 'Жалоба в роспотребнадзор'],
      customSubject: '',
      contractCost: '150000',
      paymentDate: formattedToday,
      paidAmount: '75000',
      remainingAmount: '75000',
      remainingPaymentDate: formattedNextMonth,
      materials: [],
      expertId: '',
      customerGoal: 'Подготовить набор претензионно-исковых документов',
      situationDescription: 'Тестовое описание ситуации клиента для демонстрации ТЗ эксперту.',
      expertDeadlineDays: '7',
      legalCostComp: '15000',
      moralComp: '50000',
    });
    
    setContractTopic('Гражданское право');
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
          headers: getAuthHeaders()
        });

        if (!profileResponse.ok) {
          throw new Error('Не удалось получить данные профиля');
        }

        const profileData = await profileResponse.json();
        const officeId = profileData.user?.officeId;

        if (!officeId) {
          throw new Error('Офис не найден');
        }

        // Получаем список договоров для данного офиса
        const documentsResponse = await fetch(buildApiUrl(`/office/${officeId}/contracts`), {
          headers: getAuthHeaders()
        });

        if (!documentsResponse.ok) {
          throw new Error('Не удалось получить список договоров');
        }

        const documentsData = await documentsResponse.json();
        console.log('Loaded contracts from server:', documentsData);
        
        // Преобразуем contracts в формат Document для совместимости с UI
        const contracts = documentsData.data || documentsData.contracts || [];
        const transformedDocuments = contracts.map((contract: any) => ({
          id: contract.id,
          title: contract.title || `Договор с ${contract.client_name}`,
          type: contract.contract_type || contract.type || 'Гражданское право',
          status: contract.status || 'active',
          date: contract.contract_date 
            ? new Date(contract.contract_date).toLocaleDateString('ru-RU')
            : new Date(contract.created_at).toLocaleDateString('ru-RU'),
          client: contract.client_name || 'Неизвестный клиент',
          contractNumber: contract.contract_number || `ДОГ-${String(contract.id).padStart(8, '0')}`
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
        // Никаких локальных фолбэков — все данные должны жить в БД.
        setDocuments([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
  }, [isAuthenticated, user, contractId]);

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
  const openNewDocumentModal = async () => {
    setIsModalOpen(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await fetch(buildApiUrl('/employees'), {
        headers: getAuthHeaders()
      });
      if (!res.ok) return;
      const json = await res.json();
      const list: any[] = Array.isArray(json) ? json : (json.data || json.employees || []);
      const expertList = list
        .filter((e) => {
          const role = String(e.position || e.role || e.user_role || '').toLowerCase();
          return role.includes('эксперт') || role === 'expert';
        })
        .map((e) => ({
          id: Number(e.id),
          name: [e.last_name, e.first_name, e.middle_name]
            .filter(Boolean)
            .join(' ') || e.name || `#${e.id}`,
        }));
      setExperts(expertList);
    } catch (e) {
      console.warn('Failed to load experts', e);
    }
  };

  // Закрытие модального окна
  const closeModal = () => {
    setIsModalOpen(false);
    setShowMaterialsUpload(false);
    // Сбрасываем форму
    setNewDocument({
      clientName: '',
      clientLastName: '',
      clientFirstName: '',
      clientMiddleName: '',
      actingFor: '',
      representativeName: '',
      clientPhone: '',
      contractDate: new Date().toISOString().split('T')[0],
      subjectType: '',
      documentTypes: [],
      customSubject: '',
      contractCost: '',
      paymentDate: new Date().toISOString().split('T')[0],
      paidAmount: '',
      remainingAmount: '',
      remainingPaymentDate: new Date().toISOString().split('T')[0],
      materials: [],
      expertId: '',
      customerGoal: '',
      situationDescription: '',
      expertDeadlineDays: '',
      legalCostComp: '',
      moralComp: '',
    });
    setUploadedMaterialIds([]);
  };

  // Функции для просмотра и редактирования документов
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
          headers: getAuthHeaders(),
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
        
        showSuccess('Изменения сохранены успешно!');
        closeEditModal();
      } catch (error) {
        console.error('Ошибка сохранения:', error);
        showError(`Ошибка при сохранении: ${(error as Error).message}`);
      }
    }
  };

  const deleteDocument = async (documentId?: string) => {
    // Определяем документ для удаления
    const docToDelete = documentId 
      ? documents.find(doc => doc.id === documentId)
      : editedDocument;
    
    if (!docToDelete) {
      showError('Документ не найден');
      return;
    }

    // Открываем модальное окно подтверждения
    setDocumentToDelete(docToDelete);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteDocument = async () => {
    if (!documentToDelete) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Требуется авторизация');
      }

      console.log('Удаление договора с ID:', documentToDelete.id);
      
      const response = await fetch(buildApiUrl(`/contracts/${documentToDelete.id}`), {
        method: 'DELETE',
        headers: getAuthHeaders()
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
      setDocuments(prev => prev.filter(doc => doc.id !== documentToDelete.id));
      
      showSuccess('Договор успешно удален!');
      
      // Закрываем модальное окно подтверждения
      setIsDeleteModalOpen(false);
      setDocumentToDelete(null);
      
      // Закрываем модальное окно редактирования если удаляем текущий редактируемый документ
      if (editedDocument?.id === documentToDelete.id) {
        closeEditModal();
      }
    } catch (error) {
      console.error('Ошибка удаления:', error);
      showError(`Ошибка при удалении: ${(error as Error).message}`);
      // Закрываем модальное окно подтверждения даже при ошибке
      setIsDeleteModalOpen(false);
      setDocumentToDelete(null);
    }
  };

  const cancelDeleteDocument = () => {
    setIsDeleteModalOpen(false);
    setDocumentToDelete(null);
  };

  // Обработка изменений в форме
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
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

  // Форматирование российского номера телефона в маску +7 (XXX) XXX-XX-XX.
  // Принимает любой ввод, вытягивает цифры, приводит ведущую 8 к 7.
  const formatRussianPhone = (raw: string): string => {
    let digits = raw.replace(/\D/g, '');
    if (digits.startsWith('8')) digits = '7' + digits.slice(1);
    if (!digits.startsWith('7')) digits = '7' + digits;
    digits = digits.slice(0, 11);
    const d = digits.slice(1); // без ведущей 7
    let out = '+7';
    if (d.length > 0) out += ' (' + d.slice(0, 3);
    if (d.length >= 3) out += ')';
    if (d.length > 3) out += ' ' + d.slice(3, 6);
    if (d.length > 6) out += '-' + d.slice(6, 8);
    if (d.length > 8) out += '-' + d.slice(8, 10);
    return out;
  };

  const isValidRussianPhone = (value: string): boolean => {
    const digits = value.replace(/\D/g, '');
    return digits.length === 11 && (digits.startsWith('7') || digits.startsWith('8'));
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatRussianPhone(e.target.value);
    setNewDocument(prev => ({ ...prev, clientPhone: formatted }));
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
    if (!newDocument.clientLastName.trim() || !newDocument.clientFirstName.trim()) {
      showWarning('Пожалуйста, введите Фамилию и Имя клиента');
      return;
    }

    if (!newDocument.clientPhone.trim() || !isValidRussianPhone(newDocument.clientPhone)) {
      showWarning('Пожалуйста, введите российский номер телефона в формате +7 (XXX) XXX-XX-XX');
      return;
    }
    
    if (!newDocument.subjectType) {
      showWarning('Пожалуйста, выберите предмет договора');
      return;
    }
    
    if (newDocument.subjectType === 'documents' && newDocument.documentTypes.length === 0) {
      showWarning('Пожалуйста, выберите хотя бы один тип документа');
      return;
    }
    
    if (newDocument.subjectType === 'representation' && !newDocument.customSubject.trim()) {
      showWarning('Пожалуйста, опишите предмет представления интересов');
      return;
    }

    // ТЗ — обязательно только для «Документов»
    if (newDocument.subjectType === 'documents') {
      if (!newDocument.customerGoal.trim()) {
        showWarning('Пожалуйста, укажите цель заказчика');
        return;
      }
      if (!newDocument.situationDescription.trim()) {
        showWarning('Пожалуйста, опишите ситуацию клиента');
        return;
      }
      const dl = Number(newDocument.expertDeadlineDays);
      if (!Number.isFinite(dl) || dl <= 0) {
        showWarning('Пожалуйста, укажите дедлайн для эксперта (число дней > 0)');
        return;
      }
    }
    
    if (!newDocument.contractCost || parseFloat(newDocument.contractCost) <= 0) {
      showWarning('Пожалуйста, введите корректную стоимость договора');
      return;
    }
    
    if (!newDocument.paidAmount || parseFloat(newDocument.paidAmount) < 0) {
      showWarning('Пожалуйста, введите корректную сумму внесения');
      return;
    }
    
    try {
      // Проверяем аутентификацию пользователя
      if (!isAuthenticated || !user) {
        throw new Error('Требуется авторизация');
      }

      // Если у пользователя нет office_id (например, admin из сидов), бэкенд
      // сам создаст персональный офис при первом POST /clients или /contracts
      // через ensureUserOffice. Никакой ошибки на фронте выбрасывать не нужно.
      
      // Формируем предмет договора в зависимости от выбранного типа
      let contractSubject = '';
      if (newDocument.subjectType === 'documents') {
        contractSubject = `Документы: ${newDocument.documentTypes.join(', ')}`;
      } else {
        contractSubject = `Представление интересов: ${newDocument.customSubject}`;
      }
      
      const selectedTopic = (contractTopic && contractTopic.trim()) || 'Гражданское право';
      
      // Отправляем запрос на сервер для создания договора
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Требуется авторизация');
      }

      // Сначала создаем клиента, если нужно
      let clientId = null;
      const composedName = [newDocument.clientLastName, newDocument.clientFirstName, newDocument.clientMiddleName]
        .map((p) => (p || '').trim())
        .filter(Boolean)
        .join(' ');
      const clientResponse = await fetch(buildApiUrl('/clients'), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: composedName || newDocument.clientName,
          first_name: newDocument.clientFirstName.trim() || null,
          last_name: newDocument.clientLastName.trim() || null,
          middle_name: newDocument.clientMiddleName.trim() || null,
          acting_for: newDocument.actingFor.trim() || null,
          phone: newDocument.clientPhone,
          email: '',
          address: ''
        })
      });

      if (clientResponse.ok) {
        const clientResult = await clientResponse.json();
        clientId = clientResult.data?.id;
      }

      if (!clientId) {
        throw new Error('Не удалось создать клиента');
      }

      // Создаем сотрудника для текущего пользователя, если его нет.
      // office_id бэкенд подставит сам через ensureUserOffice.
      const employeeResponse = await fetch(buildApiUrl('/employees/ensure'), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          user_id: user.id
        })
      });

      let employeeId = user.id; // По умолчанию используем user.id
      if (employeeResponse.ok) {
        const employeeResult = await employeeResponse.json();
        employeeId = employeeResult.data?.id || user.id;
      }

      const contractType = newDocument.subjectType === 'representation' ? 'court_rep' : 'docs';
      const expertId = newDocument.expertId ? Number(newDocument.expertId) : null;
      const contractData: Record<string, unknown> = {
        id_employee: employeeId,
        id_client: clientId,
        contract_date: newDocument.contractDate,
        amount: parseFloat(newDocument.contractCost),
        paid_amount: parseFloat(newDocument.paidAmount),
        status: 'active',
        title: `${selectedTopic} - ${contractSubject}`,
        description: contractSubject,
        contract_type: contractType,
        expert_id: contractType === 'docs' ? expertId : null,
        docs_status: 'pending',
      };
      if (contractType === 'docs') {
        contractData.customer_goal = newDocument.customerGoal.trim();
        contractData.situation_description = newDocument.situationDescription.trim();
        contractData.expert_deadline_days = Number(newDocument.expertDeadlineDays);
      }
      // Финансовые справочные поля (только пометка для эксперта)
      if (newDocument.legalCostComp !== '') {
        const v = Number(newDocument.legalCostComp);
        if (Number.isFinite(v)) contractData.legal_cost_comp = v;
      }
      if (newDocument.moralComp !== '') {
        const v = Number(newDocument.moralComp);
        if (Number.isFinite(v)) contractData.moral_comp = v;
      }
      if (newDocument.paymentDate) {
        contractData.payment_date = newDocument.paymentDate;
      }
      // Прикреплённые ранее материалы (загружены через /materials/upload)
      if (uploadedMaterialIds.length > 0) {
        contractData.attached_material_ids = uploadedMaterialIds;
      }

      const response = await fetch(buildApiUrl('/contracts'), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(contractData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка при создании договора');
      }

      const result = await response.json();
      console.log('Server response:', result); // Для отладки
      const createdContract = result.data; // Backend возвращает data, а не contract
      
      // Проверяем, что договор был создан успешно
      if (!createdContract || !createdContract.id) {
        console.error('Invalid contract data:', createdContract);
        throw new Error('Договор не был создан или отсутствует ID');
      }
      
      // Преобразуем созданный договор в формат Document для UI
      const uiDoc: Document = {
        id: createdContract.id,
        title: `Договор с ${createdContract.client_name || newDocument.clientName}`,
        type: createdContract.title || selectedTopic,
        status: createdContract.status || 'active',
        date: createdContract.created_at 
          ? new Date(createdContract.created_at).toLocaleDateString('ru-RU')
          : new Date().toLocaleDateString('ru-RU'),
        client: createdContract.client_name || newDocument.clientName,
        contractNumber: createdContract.id ? `ДОГ-${String(createdContract.id).padStart(8, '0')}` : 'N/A'
      };
      
      // Обновляем список в состоянии
      setDocuments(prev => [...prev, uiDoc]);
      
      // Отправляем события для обновления других компонентов
      window.dispatchEvent(new CustomEvent('clientCreated', { 
        detail: { clientId, clientName: newDocument.clientName } 
      }));
      
      window.dispatchEvent(new CustomEvent('contractCreated', { 
        detail: { 
          contractId: createdContract.id,
          amount: parseFloat(newDocument.contractCost),
          officeId: createdContract.office_id || user.office_id || null
        } 
      }));
      
      // Закрываем модалку и уведомляем
      closeModal();
      showSuccess('Договор успешно создан!');
      
    } catch (err) {
      console.error('Ошибка создания договора:', err);
      setError((err as Error).message || 'Не удалось создать договор');
      showError(`Ошибка при создании договора: ${(err as Error).message}`);
    }
  };



  return (
    <div className={headless ? 'documents-container documents-headless' : 'documents-container'}>
      {!headless && <h2 className="documents-title">Договоры</h2>}

      {!headless && error && <div className="error-message">{error}</div>}

      {headless ? (
        <button className="new-document-btn" onClick={openNewDocumentModal}>Новый договор</button>
      ) : (
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
      )}

      {!headless && (loading ? (
        <TableSkeleton rows={8} cols={7} withToolbar={false} />
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
                  <td data-label="Номер">{doc.contractNumber || ''}</td>
                  <td data-label="Название">{doc.title}</td>
                  <td data-label="Тип">{doc.type}</td>
                  <td data-label="Статус">
                    <span className={`status-badge status-${doc.status.toLowerCase().replace(/\s+/g, '-')}`}>
                      {getStatusText(doc.status)}
                    </span>
                  </td>
                  <td data-label="Дата">{doc.date}</td>
                  <td data-label="Клиент">{doc.client}</td>
                  <td className="actions-cell">
                    <button 
                      className="action-btn edit-btn"
                      onClick={() => handleEditDocument(doc)}
                      title="Редактировать"
                      aria-label="Редактировать"
                    >
                      <FiEdit2 size={16} />
                    </button>
                    <button 
                      className="action-btn delete-btn"
                      onClick={() => deleteDocument(doc.id)}
                      title="Удалить"
                      aria-label="Удалить"
                    >
                      <FiTrash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          title="Документы не найдены"
          description="Новые договоры появятся здесь после создания."
        />
      ))}

      {/* Модальное окно для создания нового договора */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content contract-modal">
            <div className="modal-header">
              <h3>Создание нового договора</h3>
              <button 
                type="button" 
                className="auto-fill-btn" 
                onClick={fillWithTestData}
                title="Заполнить тестовыми данными"
              >
                📝 Автозаполнение
              </button>
              <button className="modal-close-btn" onClick={closeModal}>&times;</button>
            </div>
            <form onSubmit={createNewDocument} className="document-form">
              {/* ФИО клиента — раздельно */}
              <div className="form-group">
                <label htmlFor="clientLastName">Фамилия *</label>
                <input
                  type="text"
                  id="clientLastName"
                  name="clientLastName"
                  value={newDocument.clientLastName}
                  onChange={handleInputChange}
                  placeholder="Введите фамилию"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="clientFirstName">Имя *</label>
                <input
                  type="text"
                  id="clientFirstName"
                  name="clientFirstName"
                  value={newDocument.clientFirstName}
                  onChange={handleInputChange}
                  placeholder="Введите имя"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="clientMiddleName">Отчество</label>
                <input
                  type="text"
                  id="clientMiddleName"
                  name="clientMiddleName"
                  value={newDocument.clientMiddleName}
                  onChange={handleInputChange}
                  placeholder="Введите отчество (при наличии)"
                />
              </div>

              {/* В чьих интересах действует клиент (опционально) */}
              <div className="form-group">
                <label htmlFor="actingFor">В чьих интересах действует клиент</label>
                <input
                  type="text"
                  id="actingFor"
                  name="actingFor"
                  value={newDocument.actingFor}
                  onChange={handleInputChange}
                  placeholder="Например: в интересах несовершеннолетнего / подопечного (необязательно)"
                />
              </div>

              {/* В интересах ФИО (устаревшее — оставим как представитель) */}
              <div className="form-group">
                <label htmlFor="representativeName">ФИО представителя</label>
                <input
                  type="text"
                  id="representativeName"
                  name="representativeName"
                  value={newDocument.representativeName}
                  onChange={handleInputChange}
                  placeholder="Если действует представитель (необязательно)"
                />
              </div>
              
              {/* Номер телефона клиента — только российский формат */}
              <div className="form-group">
                <label htmlFor="clientPhone">Номер телефона *</label>
                <input
                  type="tel"
                  id="clientPhone"
                  name="clientPhone"
                  value={newDocument.clientPhone}
                  onChange={handlePhoneChange}
                  placeholder="+7 (___) ___-__-__"
                  inputMode="tel"
                  autoComplete="tel"
                  maxLength={18}
                  required
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
              
              {/* Тема договора (свободный ввод) */}
              <div className="form-group">
                <label htmlFor="contractTopic">Тема договора *</label>
                <input
                  id="contractTopic"
                  type="text"
                  className="form-input"
                  value={contractTopic}
                  onChange={(e) => setContractTopic(e.target.value)}
                  placeholder="Например: Возмещение ущерба по ДТП"
                  list="contract-topic-suggestions"
                  required
                />
                <datalist id="contract-topic-suggestions">
                  {TOPICS.map(topic => (
                    <option key={topic} value={topic} />
                  ))}
                </datalist>
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
                      <span className="radio-text">Документы</span>
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
                      <span className="radio-text">Представление интересов</span>
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

                {/* Эксперт — для договоров «Подготовка документов» */}
                {newDocument.subjectType === 'documents' && (
                  <div className="custom-subject-input" style={{ marginTop: 8 }}>
                    <label htmlFor="expertId" style={{ display: 'block', marginBottom: 4 }}>
                      Эксперт (готовит документы)
                    </label>
                    <select
                      id="expertId"
                      name="expertId"
                      value={newDocument.expertId}
                      onChange={(e) => setNewDocument(prev => ({ ...prev, expertId: e.target.value }))}
                      className="form-input"
                    >
                      <option value="">— Не назначен —</option>
                      {experts.map(exp => (
                        <option key={exp.id} value={exp.id}>{exp.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* ТЗ для эксперта — обязательно для «Подготовки документов» */}
                {newDocument.subjectType === 'documents' && (
                  <div
                    className="tz-block"
                    style={{
                      marginTop: 12,
                      padding: 12,
                      border: '1px solid var(--color-border, #e5e7eb)',
                      borderRadius: 8,
                      background: 'rgba(30,64,175,0.02)',
                    }}
                  >
                    <div style={{ fontWeight: 600, marginBottom: 8 }}>
                      Техническое задание <span style={{ color: 'var(--color-muted, #888)', fontWeight: 400 }}>
                        (обязательно для документов)
                      </span>
                    </div>

                    <div className="form-group">
                      <label htmlFor="customerGoal">Цель заказчика *</label>
                      <input
                        type="text"
                        id="customerGoal"
                        name="customerGoal"
                        maxLength={500}
                        value={newDocument.customerGoal}
                        onChange={handleInputChange}
                        placeholder="Коротко: что клиент хочет получить в итоге"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="situationDescription">Описание ситуации *</label>
                      <textarea
                        id="situationDescription"
                        name="situationDescription"
                        value={newDocument.situationDescription}
                        onChange={handleInputChange}
                        rows={4}
                        placeholder="Кратко изложите ситуацию клиента, факты, стороны, суммы"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="expertDeadlineDays">Дедлайн для эксперта (дней) *</label>
                      <input
                        type="number"
                        id="expertDeadlineDays"
                        name="expertDeadlineDays"
                        min="1"
                        step="1"
                        value={newDocument.expertDeadlineDays}
                        onChange={handleInputChange}
                        placeholder="Например: 7"
                        required
                      />
                    </div>
                  </div>
                )}
              </div>
              
              {/* Финансовый блок */}
              <div
                className="finance-block"
                style={{
                  marginTop: 12,
                  padding: 12,
                  border: '1px solid var(--color-border, #e5e7eb)',
                  borderRadius: 8,
                  background: 'rgba(100, 116, 139, 0.04)',
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: 8 }}>Финансы по договору</div>

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

                <div className="form-row">
                  <div className="form-group half-width">
                    <label htmlFor="legalCostComp">Возмещение юр. расходов, ₽</label>
                    <input
                      type="number"
                      id="legalCostComp"
                      name="legalCostComp"
                      value={newDocument.legalCostComp}
                      onChange={handleInputChange}
                      placeholder="Планируемая сумма"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className="form-group half-width">
                    <label htmlFor="moralComp">Моральная компенсация, ₽</label>
                    <input
                      type="number"
                      id="moralComp"
                      name="moralComp"
                      value={newDocument.moralComp}
                      onChange={handleInputChange}
                      placeholder="Планируемая сумма"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
                <div style={{ fontSize: 12, color: 'var(--color-muted, #777)' }}>
                  Эти суммы — справочная пометка эксперту. В статистику офиса не идут.
                </div>
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
              
              {/* Материалы дела — файлы любых форматов, загружаются сразу */}
              <div className="form-group">
                <label>Материалы дела (фото, сканы, файлы любых форматов)</label>
                <input
                  type="file"
                  multiple
                  onChange={async (ev) => {
                    const files = Array.from(ev.target.files || []);
                    if (files.length === 0) return;
                    const tok = localStorage.getItem('token');
                    if (!tok) { showWarning('Требуется авторизация'); return; }
                    setUploadingFiles(true);
                    try {
                      for (const f of files) {
                        const fd = new FormData();
                        fd.append('file', f);
                        fd.append('category', 'Приложение к договору');
                        const resp = await fetch(buildApiUrl('/materials/upload'), {
                          method: 'POST',
                          headers: (() => { const h = getAuthHeaders(); delete (h as any)['Content-Type']; return h; })(),
                          body: fd,
                        });
                        if (resp.ok) {
                          const j = await resp.json();
                          if (j?.data?.id) {
                            setUploadedMaterialIds((prev) => [...prev, Number(j.data.id)]);
                            setNewDocument((prev) => ({ ...prev, materials: [...prev.materials, f] }));
                          }
                        }
                      }
                    } catch (err) {
                      console.warn('upload err', err);
                    } finally {
                      setUploadingFiles(false);
                      ev.target.value = '';
                    }
                  }}
                  className="file-input"
                />
                {uploadingFiles && (
                  <div style={{ fontSize: 12, color: 'var(--color-muted, #777)', marginTop: 6 }}>
                    Загружаем файлы...
                  </div>
                )}
                {newDocument.materials.length > 0 && (
                  <div className="uploaded-files" style={{ marginTop: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                      Загружено ({newDocument.materials.length}):
                    </div>
                    <div className="files-list">
                      {newDocument.materials.map((file, index) => (
                        <div key={index} className="file-item" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <span className="file-name">{file.name}</span>
                          <span style={{ color: 'var(--color-muted,#888)', fontSize: 12 }}>
                            ({Math.round((file.size || 0) / 1024)} КБ)
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div style={{ fontSize: 12, color: 'var(--color-muted, #777)', marginTop: 6 }}>
                  Файлы автоматически будут привязаны к делу клиента после создания договора.
                </div>
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
      {!headless && isViewModalOpen && selectedDocument && (
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
      {!headless && isEditModalOpen && selectedDocument && editedDocument && (
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
              <button type="button" className="delete-btn" onClick={() => deleteDocument()} title="Удалить договор">
                <FiTrash2 size={16} />
                Удалить
              </button>
              <button type="button" className="submit-btn" onClick={saveDocumentChanges}>Сохранить изменения</button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно подтверждения удаления */}
      {!headless && isDeleteModalOpen && documentToDelete && (
        <div className="modal-overlay" onClick={cancelDeleteDocument}>
          <div className="modal-content delete-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Подтверждение удаления</h3>
              <button className="modal-close-btn" onClick={cancelDeleteDocument}>&times;</button>
            </div>
            <div className="delete-warning">
              <FiTrash2 size={48} className="warning-icon" />
              <p>Вы уверены, что хотите удалить договор?</p>
              <div className="document-info">
                <strong>"{documentToDelete.title}"</strong>
                <br />
                <span className="client-name">Клиент: {documentToDelete.client}</span>
              </div>
              <p className="warning-text">Это действие нельзя отменить.</p>
            </div>
            <div className="form-actions">
              <button type="button" className="cancel-btn" onClick={cancelDeleteDocument}>
                Отмена
              </button>
              <button type="button" className="delete-btn confirm-delete" onClick={confirmDeleteDocument}>
                <FiTrash2 size={16} />
                Удалить договор
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Toast Container для уведомлений */}
      <ToastContainer 
        toasts={notifications.map(notification => ({
          ...notification,
          onClose: removeNotification
        }))} 
        onClose={removeNotification} 
      />
    </div>
  );
};

export default Documents;