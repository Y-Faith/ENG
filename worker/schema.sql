CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  daily_usage INTEGER DEFAULT 0,
  usage_date TEXT DEFAULT (date('now'))
);

CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  scene TEXT NOT NULL DEFAULT 'daily',
  difficulty TEXT NOT NULL DEFAULT 'intermediate',
  messages TEXT NOT NULL DEFAULT '[]',
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  ended_at TEXT,
  duration_seconds INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS usage_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id),
  date TEXT NOT NULL DEFAULT (date('now')),
  count INTEGER DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_usage_user_date ON usage_logs(user_id, date);
CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(user_id);