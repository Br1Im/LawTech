-- Создание таблицы для личных сообщений между пользователями
CREATE TABLE IF NOT EXISTS private_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  text TEXT NOT NULL,
  sender_id INT NOT NULL,
  receiver_id INT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Индексы для быстрого поиска
  INDEX idx_sender_id (sender_id),
  INDEX idx_receiver_id (receiver_id),
  INDEX idx_conversation (sender_id, receiver_id),
  
  -- Внешние ключи (если таблица users существует)
  -- FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  -- FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Комментарии к таблице и полям
ALTER TABLE private_messages COMMENT = 'Таблица для хранения личных сообщений между пользователями';
ALTER TABLE private_messages MODIFY COLUMN text TEXT NOT NULL COMMENT 'Текст сообщения';
ALTER TABLE private_messages MODIFY COLUMN sender_id INT NOT NULL COMMENT 'ID отправителя';
ALTER TABLE private_messages MODIFY COLUMN receiver_id INT NOT NULL COMMENT 'ID получателя';
ALTER TABLE private_messages MODIFY COLUMN is_read BOOLEAN DEFAULT FALSE COMMENT 'Флаг прочтения сообщения';
ALTER TABLE private_messages MODIFY COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Дата и время создания';
ALTER TABLE private_messages MODIFY COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Дата и время обновления'; 