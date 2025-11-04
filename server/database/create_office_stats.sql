CREATE TABLE IF NOT EXISTS office_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  office_id INTEGER NOT NULL,
  period_type TEXT CHECK(period_type IN ('day', 'week', 'month', 'year')) NOT NULL,
  revenue REAL DEFAULT 0,
  orders INTEGER DEFAULT 0,
  clients INTEGER DEFAULT 0,
  employees INTEGER DEFAULT 0,
  expenses REAL DEFAULT 0,
  documents INTEGER DEFAULT 0,
  visits INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(office_id, period_type),
  FOREIGN KEY (office_id) REFERENCES offices(id) ON DELETE CASCADE
);