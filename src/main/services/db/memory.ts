import { getDb } from './index'

interface MemoryEntry {
  id: number
  category: string
  key: string
  value: string
  created_at: string
  updated_at: string
}

export function getMemory(category: string, key: string): MemoryEntry | undefined {
  const db = getDb()
  return db
    .prepare('SELECT * FROM agent_memory WHERE category = ? AND key = ?')
    .get(category, key) as MemoryEntry | undefined
}

export function setMemory(category: string, key: string, value: string): void {
  const db = getDb()
  db.prepare(`
    INSERT INTO agent_memory (category, key, value)
    VALUES (?, ?, ?)
    ON CONFLICT(category, key) DO UPDATE SET
      value = excluded.value,
      updated_at = datetime('now')
  `).run(category, key, value)
}

export function searchMemory(category?: string, limit = 20): MemoryEntry[] {
  const db = getDb()
  if (category) {
    return db
      .prepare('SELECT * FROM agent_memory WHERE category = ? ORDER BY updated_at DESC LIMIT ?')
      .all(category, limit) as MemoryEntry[]
  }
  return db
    .prepare('SELECT * FROM agent_memory ORDER BY updated_at DESC LIMIT ?')
    .all(limit) as MemoryEntry[]
}

export function deleteMemory(category: string, key: string): void {
  const db = getDb()
  db.prepare('DELETE FROM agent_memory WHERE category = ? AND key = ?').run(category, key)
}

export function pruneOldMemory(daysOld = 30): number {
  const db = getDb()
  const result = db
    .prepare("DELETE FROM agent_memory WHERE updated_at < datetime('now', '-' || ? || ' days')")
    .run(daysOld)
  return result.changes
}

export function getRecentJournals(limit = 2): MemoryEntry[] {
  return searchMemory('journal', limit)
}

export function getPendingItems(): MemoryEntry[] {
  return searchMemory('pending', 50)
}
