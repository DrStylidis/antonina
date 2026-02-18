import { getDb } from './index'
import { randomUUID } from 'crypto'

interface ChatMessage {
  id: string
  session_id: string
  role: 'user' | 'assistant' | 'tool_result'
  content: string
  tool_calls_json: string | null
  created_at: string
}

export function createChatMessage(
  sessionId: string,
  role: 'user' | 'assistant' | 'tool_result',
  content: string,
  toolCallsJson?: string
): string {
  const db = getDb()
  const id = randomUUID()
  db.prepare(
    'INSERT INTO chat_messages (id, session_id, role, content, tool_calls_json) VALUES (?, ?, ?, ?, ?)'
  ).run(id, sessionId, role, content, toolCallsJson || null)
  return id
}

export function getChatHistory(sessionId: string): ChatMessage[] {
  const db = getDb()
  return db
    .prepare('SELECT * FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC')
    .all(sessionId) as ChatMessage[]
}

export function getLatestChatSession(): string | null {
  const db = getDb()
  const row = db
    .prepare('SELECT DISTINCT session_id FROM chat_messages ORDER BY created_at DESC LIMIT 1')
    .get() as { session_id: string } | undefined
  return row?.session_id || null
}

export function clearChatSession(sessionId: string): void {
  const db = getDb()
  db.prepare('DELETE FROM chat_messages WHERE session_id = ?').run(sessionId)
}
