import type Database from 'better-sqlite3'

export function createSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS briefings (
      id TEXT PRIMARY KEY,
      headline TEXT NOT NULL,
      data_json TEXT NOT NULL,
      generated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS email_cache (
      id TEXT PRIMARY KEY,
      from_name TEXT NOT NULL,
      from_address TEXT NOT NULL,
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      received_at TEXT NOT NULL,
      classification TEXT NOT NULL DEFAULT 'normal',
      has_attachments INTEGER NOT NULL DEFAULT 0,
      fetched_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS drafts (
      id TEXT PRIMARY KEY,
      email_id TEXT NOT NULL,
      content TEXT NOT NULL,
      tone TEXT NOT NULL DEFAULT 'professional',
      confidence REAL NOT NULL DEFAULT 0.5,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS api_costs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      model TEXT NOT NULL,
      input_tokens INTEGER NOT NULL DEFAULT 0,
      output_tokens INTEGER NOT NULL DEFAULT 0,
      cost_usd REAL NOT NULL DEFAULT 0.0,
      operation TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS agent_sessions (
      id TEXT PRIMARY KEY,
      trigger TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'running',
      started_at TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT,
      summary TEXT,
      tool_calls INTEGER DEFAULT 0,
      total_cost_usd REAL DEFAULT 0,
      errors TEXT
    );

    CREATE TABLE IF NOT EXISTS agent_actions (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES agent_sessions(id),
      tool_name TEXT NOT NULL,
      input_json TEXT,
      output_json TEXT,
      status TEXT NOT NULL DEFAULT 'executed',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS approval_queue (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES agent_sessions(id),
      action_type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      data_json TEXT NOT NULL,
      risk_level TEXT DEFAULT 'medium',
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      resolved_at TEXT
    );

    -- Chat messages (Feature 1)
    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'tool_result')),
      content TEXT NOT NULL,
      tool_calls_json TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Agent memory (Feature 4)
    CREATE TABLE IF NOT EXISTS agent_memory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(category, key)
    );
    CREATE INDEX IF NOT EXISTS idx_memory_category ON agent_memory(category);
    CREATE INDEX IF NOT EXISTS idx_memory_updated ON agent_memory(updated_at);

    -- Action feedback for learning (Phase 2)
    CREATE TABLE IF NOT EXISTS action_feedback (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action_type TEXT NOT NULL,
      outcome TEXT NOT NULL,
      was_edited INTEGER NOT NULL DEFAULT 0,
      edit_summary TEXT,
      time_to_decision_ms INTEGER,
      hour_of_day INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_feedback_action ON action_feedback(action_type);

    -- Goals management (Phase 3)
    CREATE TABLE IF NOT EXISTS goals (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      check_expression TEXT NOT NULL,
      schedule TEXT NOT NULL DEFAULT 'hourly',
      enabled INTEGER NOT NULL DEFAULT 1,
      last_checked_at TEXT,
      last_status TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `)

  // Migrations for existing databases
  try {
    // Add risk_level column if it doesn't exist (existing approval_queue tables)
    const cols = db.prepare("PRAGMA table_info(approval_queue)").all() as Array<{ name: string }>
    if (!cols.find(c => c.name === 'risk_level')) {
      db.exec("ALTER TABLE approval_queue ADD COLUMN risk_level TEXT DEFAULT 'medium'")
    }
  } catch {
    // Table might not exist yet — CREATE TABLE above handles that
  }
}
