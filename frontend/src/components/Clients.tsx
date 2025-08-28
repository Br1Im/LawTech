import React, { useState, useEffect } from "react";
import { buildApiUrl } from '../shared/utils/apiUtils';
import { useOffice } from '../context/OfficeContext';
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

const Clients: React.FC = () => {
  const { currentOffice, loading: officeLoading, error: officeError } = useOffice();

  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Получение данных с сервера
  useEffect(() => {
    const fetchClients = async () => {
      if (!currentOffice) return;

      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('Требуется авторизация');
        }

        const clientsResponse = await fetch(buildApiUrl(`/office/${currentOffice.id}/clients`), {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (!clientsResponse.ok) {
          throw new Error('Не удалось получить список клиентов');
        }

        const clientsData = await clientsResponse.json();
        setContracts(clientsData);
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
  }, [currentOffice]);

  // Обработчик для связи с клиентом (заглушка)
  const handleContact = (clientId: number) => {
    console.log(`Связь с клиентом ${clientId}`);
    // Здесь можно добавить функционал связи с клиентом
  };

  // Обработчик для просмотра документов (заглушка)
  const handleViewDocuments = (clientId: number) => {
    console.log(`Просмотр документов клиента ${clientId}`);
    // Здесь можно добавить функционал просмотра документов
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
    <div className="clients-container">
      <h2 className="clients-title">Клиенты офиса {currentOffice.title}</h2>
      
      {error && <div className="error-message">{error}</div>}
      
      {loading ? (
        <div className="loading-indicator">Загрузка клиентов...</div>
      ) : (
        <div className="clients-grid">
          {contracts.length > 0 ? (
            contracts.map((contract) => (
              <div key={contract.id} className="client-item">
                <div className="client-header">
                  <h3>{contract.clientName}</h3>
                  <span className="contract-number">{contract.contractNumber}</span>
                </div>
                
                <div className="client-details">
                  <p>
                    <strong>Тема:</strong> {contract.theme}
                  </p>
                  <p>
                    <strong>Юрист:</strong> {contract.lawyer}
                  </p>
                  <p>
                    <strong>Материалы:</strong> {contract.materials.length > 0 ? contract.materials.join(", ") : "Нет материалов"}
                  </p>
                  <p>
                    <strong>Статус:</strong> {contract.assignedExpert ? `Назначен эксперт (${contract.assignedExpert})` : "Ожидает назначения эксперта"}
                  </p>
                </div>
                
                {contract.expertDocuments.length > 0 ? (
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
            ))
          ) : (
            <p className="no-clients">Клиенты не найдены</p>
          )}
        </div>
      )}
    </div>
  );
};

export default Clients;