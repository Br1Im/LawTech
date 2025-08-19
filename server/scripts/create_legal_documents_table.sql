CREATE TABLE IF NOT EXISTS legal_documents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(100),
  embedding JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Индексы для ускорения поиска
CREATE INDEX idx_legal_documents_category ON legal_documents(category);
CREATE INDEX idx_legal_documents_created_at ON legal_documents(created_at);

-- Дополнительная функция для вычисления косинусного сходства (имитация)
DELIMITER //
CREATE FUNCTION IF NOT EXISTS vector_similarity(embedding1 JSON, embedding2 JSON) RETURNS FLOAT
DETERMINISTIC
BEGIN
  -- В реальной среде здесь был бы код для вычисления косинусного сходства
  -- Поскольку MySQL не имеет встроенной функциональности для векторных вычислений,
  -- мы будем использовать это как заглушку, а реальные вычисления делать в приложении
  RETURN 1.0;
END //
DELIMITER ;

-- Примеры данных для тестирования
INSERT INTO legal_documents (title, content, category) VALUES
('Федеральный закон "О персональных данных"', 
 'Федеральный закон от 27.07.2006 N 152-ФЗ регулирует отношения, связанные с обработкой персональных данных. Закон устанавливает требования к хранению, обработке и защите персональных данных граждан РФ.', 
 'Законы'),
('Гражданский кодекс РФ, часть первая', 
 'Гражданский кодекс определяет правовое положение участников гражданского оборота, основания возникновения и порядок осуществления права собственности и других вещных прав, прав на результаты интеллектуальной деятельности.', 
 'Кодексы'),
('Трудовой договор: основные положения', 
 'Трудовой договор - соглашение между работодателем и работником, в соответствии с которым работодатель обязуется предоставить работнику работу по обусловленной трудовой функции, обеспечить условия труда, своевременно и в полном размере выплачивать работнику заработную плату.', 
 'Документы'); 