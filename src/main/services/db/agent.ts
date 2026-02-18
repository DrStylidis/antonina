import { getDb } from './index'

interface SessionRow {
  id: string
  trigger: string
  status: string
  started_at: string
  completed_at: string | null
  summary: string | null
  tool_calls: number
  total_cost_usd: number
  errors: string | null
}

interface ActionRow {
  id: string
  session_id: string
  tool_name: string
  input_json: string | null
  output_json: string | null
  status: string
  created_at: string
}

interface ApprovalRow {
  id: string
  session_id: string
  action_type: string
  title: string
  description: string
  data_json: string
  status: string
  created_at: string
  resolved_at: string | null
}

interface SessionUpdate {
  status?: string
  completedAt?: string
  summary?: string
  tool_calls?: number
  total_cost_usd?: number
  errors?: string
}

export function createSession(id: string, trigger: string): void {
  const db = getDb()
  db.prepare('INSERT OR IGNORE INTO agent_sessions (id, trigger) VALUES (?, ?)').run(id, trigger)
}

export function ensureSessionExists(id: string, trigger = 'chat'): void {
  const db = getDb()
  db.prepare('INSERT OR IGNORE INTO agent_sessions (id, trigger) VALUES (?, ?)').run(id, trigger)
}

export function updateSession(id: string, updates: SessionUpdate): void {
  const db = getDb()
  const fields: string[] = []
  const values: unknown[] = []

  if (updates.status !== undefined) {
    fields.push('status = ?')
    values.push(updates.status)
  }
  if (updates.completedAt !== undefined) {
    fields.push('completed_at = ?')
    values.push(updates.completedAt)
  }
  if (updates.summary !== undefined) {
    fields.push('summary = ?')
    values.push(updates.summary)
  }
  if (updates.tool_calls !== undefined) {
    fields.push('tool_calls = ?')
    values.push(updates.tool_calls)
  }
  if (updates.total_cost_usd !== undefined) {
    fields.push('total_cost_usd = ?')
    values.push(updates.total_cost_usd)
  }
  if (updates.errors !== undefined) {
    fields.push('errors = ?')
    values.push(updates.errors)
  }

  if (fields.length === 0) return

  values.push(id)
  db.prepare(`UPDATE agent_sessions SET ${fields.join(', ')} WHERE id = ?`).run(...values)
}

export function getRecentSessions(limit = 20): SessionRow[] {
  const db = getDb()
  return db
    .prepare('SELECT * FROM agent_sessions ORDER BY started_at DESC LIMIT ?')
    .all(limit) as SessionRow[]
}

export function getSession(id: string): SessionRow | undefined {
  const db = getDb()
  return db.prepare('SELECT * FROM agent_sessions WHERE id = ?').get(id) as SessionRow | undefined
}

export function logAction(
  id: string,
  sessionId: string,
  toolName: string,
  inputJson: string | null,
  outputJson: string | null,
  status: string
): void {
  const db = getDb()
  db.prepare(
    'INSERT INTO agent_actions (id, session_id, tool_name, input_json, output_json, status) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, sessionId, toolName, inputJson, outputJson, status)
}

export function getSessionActions(sessionId: string): ActionRow[] {
  const db = getDb()
  return db
    .prepare('SELECT * FROM agent_actions WHERE session_id = ? ORDER BY created_at ASC')
    .all(sessionId) as ActionRow[]
}

export function createApproval(
  id: string,
  sessionId: string,
  actionType: string,
  title: string,
  description: string,
  dataJson: string,
  riskLevel?: string
): void {
  const db = getDb()
  if (riskLevel) {
    db.prepare(
      'INSERT INTO approval_queue (id, session_id, action_type, title, description, data_json, risk_level) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(id, sessionId, actionType, title, description, dataJson, riskLevel)
  } else {
    db.prepare(
      'INSERT INTO approval_queue (id, session_id, action_type, title, description, data_json) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(id, sessionId, actionType, title, description, dataJson)
  }
}

export function getPendingApprovals(): ApprovalRow[] {
  const db = getDb()
  return db
    .prepare("SELECT * FROM approval_queue WHERE status = 'pending' ORDER BY created_at ASC")
    .all() as ApprovalRow[]
}

export function resolveApproval(id: string, status: 'approved' | 'rejected'): void {
  const db = getDb()
  db.prepare("UPDATE approval_queue SET status = ?, resolved_at = datetime('now') WHERE id = ?").run(
    status,
    id
  )
}
