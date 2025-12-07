import React, { useState, useEffect } from "react";
import { useAuth } from '../shared/lib/hooks/useAuth';
import { buildApiUrl } from '../shared/utils/apiUtils';
import "./Clients.css";

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
        
        // Загружаем договоры с сервера
        const contractsResponse = await fetch(buildApiUrl(`/office/${officeId}/contracts`), {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!contractsResponse.ok) {
          throw new Error('Не удалось получить список договоров');
        }

        const contractsData = await contractsResponse.json();
        console.log('Получены договоры:', contractsData);
        
        const allContracts = contractsData.data || [];
        
        // Группируем договоры по клиентам (уникальные клиенты)
        const clientsMap = new Map();
        
        allContracts.forEach((contract: any) => {
          const clientId = contract.id_client;
          const clientName = contract.client_name || 'Без имени';
          
          if (!clientsMap.has(clientId)) {
            clientsMap.set(clientId, {
              id: clientId,
              clientName: clientName,
              contractNumber: `CLI-${clientId}`,
              theme: contract.title || 'Договор',
              lawyer: contract.employee_name || (user.first_name + ' ' + user.last_name),
              materials: [],
              assignedExpert: null,
              expertDocuments: [],
              contractsCount: 1
            });
          } else {
            // Увеличиваем счетчик договоров для этого клиента
            const client = clientsMap.get(clientId);
            client.contractsCount += 1;
          }
        });
        
        // Преобразуем Map в массив
        const clientContracts = Array.from(clientsMap.values());
        console.log('Уникальные клиенты с договорами:', clientContracts.length);
        
        setContracts(clientContracts);
        
      } catch (err) {
        console.error('Ошибка получения клиентов:', err);
        setError((err as Error).message || 'Не удалось загрузить список клиентов');
        setContracts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchClients();
    
    // Слушатель события создания клиента
    const handleClientCreated = () => {
      console.log('Получено событие создания клиента, обновляем список');
      fetchClients();
    };
    
    window.addEventListener('clientCreated', handleClientCreated);
    
    return () => {
      window.removeEventListener('clientCreated', handleClientCreated);
    };
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
                        onClick={() => handleViewDocuments(contract.id || 0)}
                        style={{ cursor: 'pointer' }}
                      >
                        {contract.contractNumber || `Договор №${contract.id || 0}`}
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
                            <li key={`${contract.id}-expert-doc-${index}-${doc.name}`}>
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
                        onClick={() => handleContact(contract.id || 0)}
                      >
                        Связаться
                      </button>
                      <button 
                        className="action-btn"
                        onClick={() => handleViewDocuments(contract.id || 0)}
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
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Clients;