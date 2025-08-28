import React, { useState, useEffect } from 'react';
import { buildApiUrl } from '../shared/utils/apiUtils';
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

  const { currentOffice, loading: officeLoading, error: officeError } = useOffice();

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
      if (!currentOffice) return;
      
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('Требуется авторизация');
        }

        const documentsResponse = await fetch(buildApiUrl(`/office/${currentOffice.id}/documents`), {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (!documentsResponse.ok) {
          throw new Error('Не удалось получить список договоров');
        }

        const documentsData = await documentsResponse.json();
        setDocuments(documentsData.documents || []);
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
  }, [currentOffice]);

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

  if (officeLoading) {
    return <div className="loading-indicator">Загрузка данных офиса...</div>;
  }

  if (officeError) {
    return <div className="error-message">{officeError}</div>;
  }

  if (!currentOffice) {
    return <div className="error-message">Офис не найден</div>;
  }

  return (
    <div className="documents-container">
      <h2>Документы офиса {currentOffice.title}</h2>
      {/* Остальной JSX код компонента */}
    </div>
  );
};

export default Documents;