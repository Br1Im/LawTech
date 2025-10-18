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
        
        // Намеренно устанавливаем пустой массив клиентов
        console.log('Клиенты отключены по запросу пользователя');
        setContracts([]);
        
      } catch (err) {
        console.error('Ошибка получения клиентов:', err);
        setError((err as Error).message || 'Не удалось загрузить список клиентов');
        setContracts([]);
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
              <p className="no-clients-hint">Возможно, необходимо добавить договоры в систему или проверить соединение с базой данных.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Clients;