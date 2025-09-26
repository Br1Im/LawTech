import React, { useState, useEffect } from "react";
import { buildApiUrl } from '../shared/utils/apiUtils';
import { useAuth } from '../shared/lib/hooks/useAuth';
import "./Clients.css";
import { useNavigate } from 'react-router-dom';

interface ExpertDocument {
  id?: number;
  name: string;
  url: string;
}

interface Contract {
  id: number;
  clientName: string;
  contractNumber: string;
  theme: string;
  lawyer: string;
  materials: string[];
  assignedExpert: string | null;
  expertDocuments: ExpertDocument[];
}

interface ClientsProps {
  onTabClick?: (tab: string) => void;
  onContractSelect?: (contractId: number) => void;
}

const Clients: React.FC<ClientsProps> = ({ onTabClick, onContractSelect }) => {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  // Removed unused state variable officeId since it was only set but never read

  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  // Получение данных с сервера
  useEffect(() => {
    const fetchClients = async () => {
      if (!isAuthenticated || !user) {
        setError('Требуется авторизация');
        setContracts([]);
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

        // Получаем ID офиса из данных пользователя
        const officeId = user.office_id;
        console.log('Получаем клиентов для офиса:', officeId);

        if (!officeId) {
          throw new Error('Офис не найден');
        }

        // Пробуем получить данные из API
        try {
          // Сначала пробуем получить клиентов напрямую из офиса
          // Поправленный путь: получаем контракты конкретного офиса
          const officeResponse = await fetch(buildApiUrl(`/office/${officeId}/contracts`), {
             headers: {
               Authorization: `Bearer ${token}`
             }
           });

          // Проверяем, что ответ успешен и содержит JSON
          const isJson = officeResponse.headers.get('content-type')?.includes('application/json');

          if (officeResponse.ok && isJson) {
            const officeData = await officeResponse.json();
            console.log('Данные офиса получены:', officeData);

            let contractsArray: any[] = [];

            if (Array.isArray(officeData)) {
              contractsArray = officeData;
            } else if (officeData.contracts && Array.isArray(officeData.contracts)) {
              contractsArray = officeData.contracts;
            }

            if (contractsArray.length > 0) {
              console.log('Найдены контракты:', contractsArray.length);

              const clientsFromContracts = contractsArray.map((contract: any) => ({
                   id: contract.id,
                   clientName: contract.client_name || 'Без имени',
                   contractNumber: contract.contract_number || contract.contractNumber || `Д-${contract.id}`,
                   theme: contract.subject || contract.contract_type || 'Не указано',
                   lawyer: contract.lawyer_name || 'Не назначен',
                   materials: contract.materials || [],
                   assignedExpert: contract.assignedExpert || null,
                   expertDocuments: contract.expertDocuments || [],
                 }));
                 
                 setContracts(clientsFromContracts);
                 return; // Выходим, так как данные успешно получены
               } else {
                 console.log('В данных офиса нет контрактов, пробуем другой метод');
               }
          }
          
          // Если не удалось получить из офиса, пробуем получить клиентов напрямую
          const clientsResponse = await fetch(buildApiUrl(`/office/${officeId}/clients`), {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });

          if (clientsResponse.ok) {
            const clientsData = await clientsResponse.json();
            console.log('Данные клиентов получены:', clientsData);
            setContracts(clientsData);
            return; // Выходим, так как данные успешно получены
          }
          
          // Если и этот метод не сработал, пробуем получить контракты напрямую
          const contractsResponse = await fetch(buildApiUrl(`/contracts?office_id=${officeId}`), {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
          
          if (contractsResponse.ok) {
            const contractsData = await contractsResponse.json();
            console.log('Данные контрактов получены:', contractsData);
            
            if (Array.isArray(contractsData) && contractsData.length > 0) {
              // Преобразуем контракты в формат клиентов
              const clientsFromContracts = contractsData.map(contract => ({
                id: contract.id,
                clientName: contract.client_name || 'Без имени',
                contractNumber: contract.contract_number || contract.contractNumber || `Д-${contract.id}`,
                theme: contract.subject || contract.contract_type || 'Не указано',
                lawyer: contract.lawyer_name || 'Не назначен',
                materials: contract.materials || [],
                assignedExpert: contract.assignedExpert || null,
                expertDocuments: contract.expertDocuments || [],
              }));
              
              setContracts(clientsFromContracts);
              return; // Выходим, так как данные успешно получены
            }
          }
          
          // Если все методы не сработали, выбрасываем ошибку
          throw new Error('Не удалось получить данные клиентов');
          
        } catch (apiError) {
          console.error('Ошибка API при получении клиентов:', apiError);
          throw new Error('Не удалось получить список клиентов');
        }
      } catch (err) {
        console.error('Ошибка получения клиентов:', err);
        setError((err as Error).message || 'Не удалось загрузить список клиентов');
        
        // Для тестирования используем демо-данные
        setContracts([
          {
            id: 1,
            clientName: "Петров Алексей Викторович",
            contractNumber: "Д-001",
            theme: "Уголовное право",
            lawyer: "Иван Алексеевич Сидоров",
            materials: ["Документ 1.pdf", "Документ 2.pdf"],
            assignedExpert: null,
            expertDocuments: [],
          },
          {
            id: 2,
            clientName: "Смирнова Екатерина Сергеевна",
            contractNumber: "Д-002",
            theme: "Семейное право",
            lawyer: "Иван Алексеевич Сидоров",
            materials: ["Документ 3.pdf"],
            assignedExpert: null,
            expertDocuments: [
              { name: "Анализ ситуации.docx", url: "#" },
              { name: "Рекомендации.pdf", url: "#" }
            ],
          }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchClients();
  }, [isAuthenticated, user]);

  // Обработчик для связи с клиентом (заглушка)
  const handleContact = (clientId: number) => {
    console.log(`Связь с клиентом ${clientId}`);
    // Здесь можно добавить функционал связи с клиентом
  };

  // Обработчик для просмотра документов
  const handleViewDocuments = (contractId: number) => {
    if (onTabClick) {
      onTabClick("Договоры");
    }
    if (onContractSelect) {
      onContractSelect(contractId);
    }
  };

  return (
    <div className="clients-container">
      <h2 className="clients-title">Клиенты с договорами</h2>
      
      {error && <div className="error-message">{error}</div>}
      
      {loading ? (
        <div className="loading-indicator">Загрузка клиентов...</div>
      ) : (
        <>
          {contracts.length > 0 ? (
            <>
              <div className="clients-count">
                Найдено клиентов с договорами: <strong>{contracts.length}</strong>
              </div>
              <div className="clients-grid">
                {contracts.map((contract) => (
                  <div key={contract.id} className="client-item">
                    <div className="client-header">
                      <h3>{contract.clientName || 'Клиент без имени'}</h3>
                      <span 
                        className="contract-number"
                        onClick={() => handleViewDocuments(contract.id)}
                        style={{ cursor: 'pointer' }}
                      >
                        {contract.contractNumber || `Договор №${contract.id}`}
                      </span>
                    </div>
                    
                    <div className="client-details">
                      <p>
                        <strong>Тема:</strong> {contract.theme || 'Не указана'}
                      </p>
                      <p>
                        <strong>Юрист:</strong> {contract.lawyer || 'Не назначен'}
                      </p>
                      <p>
                        <strong>Материалы:</strong> {
                          Array.isArray(contract.materials) && contract.materials.length > 0 
                            ? contract.materials.join(", ") 
                            : "Нет материалов"
                        }
                      </p>
                      <p>
                        <strong>Статус:</strong> {contract.assignedExpert ? `Назначен эксперт (${contract.assignedExpert})` : "Ожидает назначения эксперта"}
                      </p>
                    </div>
                    
                    {Array.isArray(contract.expertDocuments) && contract.expertDocuments.length > 0 ? (
                      <div className="expert-documents">
                        <h4>Документы от эксперта:</h4>
                        <ul>
                          {contract.expertDocuments.map((doc, index) => (
                            <li key={index}>
                              <a href={doc.url} download>
                                {doc.name}
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <p className="no-documents">Документы от эксперта отсутствуют</p>
                    )}
                    
                    <div className="client-actions">
                      <button 
                        className="action-btn"
                        onClick={() => handleContact(contract.id)}
                      >
                        Связаться
                      </button>
                      <button 
                        className="action-btn"
                        onClick={() => handleViewDocuments(contract.id)}
                      >
                        Документы
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="no-clients-container">
              <p className="no-clients">Клиенты с договорами не найдены</p>
              <p className="no-clients-hint">Возможно, необходимо добавить договоры в систему или проверить соединение с базой данных.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Clients;