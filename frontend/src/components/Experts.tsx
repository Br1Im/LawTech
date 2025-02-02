import React, { useState } from "react";
import "./Experts.css";

interface ExpertDocument {
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

interface Expert {
  id: number;
  name: string;
}

const Experts: React.FC = () => {
  const [contracts, setContracts] = useState<Contract[]>([
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
      expertDocuments: [],
    },
  ]);
  
  const [userRole, setUserRole] = useState<string>("Руководитель экспертов"); // В реальном проекте это будет приходить с сервера
  
  const [experts] = useState<Expert[]>([
    { id: 1, name: "Эксперт 1" },
    { id: 2, name: "Эксперт 2" },
  ]);

  // Функция для распределения задачи эксперту (для руководителя)
  const assignTask = (contractId: number, expertId: number) => {
    setContracts((prevContracts) =>
      prevContracts.map((contract) =>
        contract.id === contractId
          ? { ...contract, assignedExpert: experts.find((e) => e.id === expertId)?.name || null }
          : contract
      )
    );
  };

  // Функция для загрузки документа экспертом
  const handleFileUpload = (contractId: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const fileURL = URL.createObjectURL(file);
      
      setContracts((prevContracts) =>
        prevContracts.map((contract) =>
          contract.id === contractId
            ? {
                ...contract,
                expertDocuments: [
                  ...contract.expertDocuments,
                  { name: file.name, url: fileURL },
                ],
              }
            : contract
        )
      );
    }
  };

  return (
    <div className="experts-container">
      <h2 className="experts-title">Эксперты</h2>

      {userRole === "Руководитель экспертов" ? (
        // Интерфейс для руководителя экспертов
        <div className="leader-view">
          <h3>Список задач</h3>
          <div className="contracts-list">
            {contracts.map((contract) => (
              <div key={contract.id} className="contract-item">
                <p>
                  <strong>Клиент:</strong> {contract.clientName}
                </p>
                <p>
                  <strong>Номер договора:</strong> {contract.contractNumber}
                </p>
                <p>
                  <strong>Тема:</strong> {contract.theme}
                </p>
                <p>
                  <strong>Материалы дела:</strong>{" "}
                  {contract.materials.join(", ") || "Нет материалов"}
                </p>
                <p>
                  <strong>Назначенный эксперт:</strong>{" "}
                  {contract.assignedExpert || "Не назначен"}
                </p>
                <div className="assign-expert">
                  <select
                    onChange={(e) => assignTask(contract.id, parseInt(e.target.value))}
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Выберите эксперта
                    </option>
                    {experts.map((expert) => (
                      <option key={expert.id} value={expert.id}>
                        {expert.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        // Интерфейс для эксперта
        <div className="expert-view">
          <h3>Мои задачи</h3>
          <div className="contracts-list">
            {contracts
              .filter((contract) => contract.assignedExpert === "Эксперт 1") // Пример для эксперта
              .map((contract) => (
                <div key={contract.id} className="contract-item">
                  <p>
                    <strong>Клиент:</strong> {contract.clientName}
                  </p>
                  <p>
                    <strong>Номер договора:</strong> {contract.contractNumber}
                  </p>
                  <p>
                    <strong>Тема:</strong> {contract.theme}
                  </p>
                  <p>
                    <strong>Материалы дела:</strong>{" "}
                    {contract.materials.join(", ") || "Нет материалов"}
                  </p>
                  <div className="upload-document">
                    <h4>Загрузить документ</h4>
                    <input
                      type="file"
                      accept=".doc,.docx"
                      onChange={(e) => handleFileUpload(contract.id, e)}
                    />
                  </div>
                  {contract.expertDocuments.length > 0 && (
                    <div className="uploaded-documents">
                      <h4>Загруженные документы:</h4>
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
                  )}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Experts; 