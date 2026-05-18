CREATE TABLE IF NOT EXISTS memories (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  importance INTEGER NOT NULL DEFAULT 5,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  compressed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_memories_user ON memories(user_id, status);
CREATE INDEX IF NOT EXISTS idx_memories_compress ON memories(user_id, status, created_at);
