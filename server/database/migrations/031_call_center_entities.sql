CREATE TABLE IF NOT EXISTS call_centers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  public_id VARCHAR(32) NULL,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NULL,
  owner_user_id INT NOT NULL,
  connection_code VARCHAR(64) NOT NULL,
  code_rotated_at DATETIME NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_call_centers_public_id (public_id),
  UNIQUE KEY uq_call_centers_connection_code (connection_code),
  KEY idx_call_centers_owner (owner_user_id),
  CONSTRAINT fk_call_centers_owner FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS call_center_members (
  call_center_id BIGINT UNSIGNED NOT NULL,
  user_id INT NOT NULL,
  member_role VARCHAR(32) NOT NULL DEFAULT 'operator',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (call_center_id, user_id),
  UNIQUE KEY uq_call_center_member_user (user_id),
  CONSTRAINT fk_cc_members_center FOREIGN KEY (call_center_id) REFERENCES call_centers(id) ON DELETE CASCADE,
  CONSTRAINT fk_cc_members_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS office_call_centers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  office_id INT NOT NULL,
  call_center_id BIGINT UNSIGNED NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  connected_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  disconnected_at DATETIME NULL,
  connected_by INT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_office_call_center (office_id, call_center_id),
  KEY idx_office_cc_active (office_id, is_active),
  KEY idx_cc_office_active (call_center_id, is_active),
  CONSTRAINT fk_office_cc_office FOREIGN KEY (office_id) REFERENCES offices(id) ON DELETE CASCADE,
  CONSTRAINT fk_office_cc_center FOREIGN KEY (call_center_id) REFERENCES call_centers(id) ON DELETE CASCADE,
  CONSTRAINT fk_office_cc_actor FOREIGN KEY (connected_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS call_center_connection_requests (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  office_id INT NOT NULL,
  call_center_id BIGINT UNSIGNED NOT NULL,
  requested_by INT NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'pending',
  responded_by INT NULL,
  responded_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_cc_requests_center_status (call_center_id, status),
  KEY idx_cc_requests_office_status (office_id, status),
  CONSTRAINT fk_cc_requests_office FOREIGN KEY (office_id) REFERENCES offices(id) ON DELETE CASCADE,
  CONSTRAINT fk_cc_requests_center FOREIGN KEY (call_center_id) REFERENCES call_centers(id) ON DELETE CASCADE,
  CONSTRAINT fk_cc_requests_requester FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_cc_requests_responder FOREIGN KEY (responded_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS call_center_connection_history (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  office_id INT NULL,
  call_center_id BIGINT UNSIGNED NOT NULL,
  action VARCHAR(32) NOT NULL,
  actor_user_id INT NULL,
  details JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_cc_history_center (call_center_id, created_at),
  KEY idx_cc_history_office (office_id, created_at),
  CONSTRAINT fk_cc_history_office FOREIGN KEY (office_id) REFERENCES offices(id) ON DELETE SET NULL,
  CONSTRAINT fk_cc_history_center FOREIGN KEY (call_center_id) REFERENCES call_centers(id) ON DELETE CASCADE,
  CONSTRAINT fk_cc_history_actor FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS call_center_code_rotations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  call_center_id BIGINT UNSIGNED NOT NULL,
  rotated_by INT NULL,
  rotated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_cc_code_rotations (call_center_id, rotated_at),
  CONSTRAINT fk_cc_rotations_center FOREIGN KEY (call_center_id) REFERENCES call_centers(id) ON DELETE CASCADE,
  CONSTRAINT fk_cc_rotations_actor FOREIGN KEY (rotated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Связи намеренно не создаются из legacy users.office_id.
-- Колл-центр создаётся при регистрации начальника, сотрудники добавляются через
-- call_center_members, а юридические офисы подключаются только через подтверждённую заявку.
