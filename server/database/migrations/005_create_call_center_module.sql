CREATE TABLE IF NOT EXISTS call_center_leads (
  id INT AUTO_INCREMENT PRIMARY KEY,
  office_id INT NOT NULL,
  source VARCHAR(100) NOT NULL,
  external_id VARCHAR(255) NULL,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NULL,
  email VARCHAR(255) NULL,
  description TEXT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'NEW',
  score INT NOT NULL DEFAULT 0,
  assigned_to INT NULL,
  duplicate_of_lead_id INT NULL,
  first_call_at DATETIME NULL,
  last_call_at DATETIME NULL,
  next_call_at DATETIME NULL,
  metadata JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (office_id) REFERENCES offices(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (duplicate_of_lead_id) REFERENCES call_center_leads(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS call_center_calls (
  id INT AUTO_INCREMENT PRIMARY KEY,
  lead_id INT NOT NULL,
  user_id INT NULL,
  result VARCHAR(50) NOT NULL,
  comment TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lead_id) REFERENCES call_center_leads(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS call_center_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  lead_id INT NOT NULL,
  action VARCHAR(100) NOT NULL,
  user_id INT NULL,
  details JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lead_id) REFERENCES call_center_leads(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS call_center_operator_status (
  user_id INT PRIMARY KEY,
  office_id INT NOT NULL,
  is_online TINYINT(1) NOT NULL DEFAULT 0,
  current_load INT NOT NULL DEFAULT 0,
  last_seen_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_assigned_at DATETIME NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (office_id) REFERENCES offices(id) ON DELETE CASCADE
);

CREATE INDEX idx_call_center_leads_office_status ON call_center_leads(office_id, status);
CREATE INDEX idx_call_center_leads_assigned_to ON call_center_leads(assigned_to);
CREATE INDEX idx_call_center_leads_source_external ON call_center_leads(source, external_id);
CREATE INDEX idx_call_center_calls_lead ON call_center_calls(lead_id);
CREATE INDEX idx_call_center_history_lead ON call_center_history(lead_id);
CREATE INDEX idx_call_center_operator_status_office ON call_center_operator_status(office_id, is_online);
