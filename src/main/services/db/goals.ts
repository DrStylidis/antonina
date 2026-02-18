import { getDb } from './index'

interface Goal {
  id: string
  title: string
  description: string
  check_expression: string
  schedule: string
  enabled: number
  last_checked_at: string | null
  last_status: string | null
  created_at: string
}

export function getGoals(): Goal[] {
  const db = getDb()
  return db.prepare('SELECT * FROM goals ORDER BY created_at').all() as Goal[]
}

export function getActiveGoals(): Goal[] {
  const db = getDb()
  return db.prepare('SELECT * FROM goals WHERE enabled = 1 ORDER BY created_at').all() as Goal[]
}

export function getGoal(id: string): Goal | undefined {
  const db = getDb()
  return db.prepare('SELECT * FROM goals WHERE id = ?').get(id) as Goal | undefined
}

export function createGoal(
  id: string,
  title: string,
  description: string,
  checkExpression: string,
  schedule = 'hourly'
): void {
  const db = getDb()
  db.prepare(`
    INSERT OR IGNORE INTO goals (id, title, description, check_expression, schedule)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, title, description, checkExpression, schedule)
}

export function updateGoal(id: string, updates: Partial<Pick<Goal, 'title' | 'description' | 'enabled' | 'schedule'>>): void {
  const db = getDb()
  const sets: string[] = []
  const values: unknown[] = []

  if (updates.title !== undefined) { sets.push('title = ?'); values.push(updates.title) }
  if (updates.description !== undefined) { sets.push('description = ?'); values.push(updates.description) }
  if (updates.enabled !== undefined) { sets.push('enabled = ?'); values.push(updates.enabled) }
  if (updates.schedule !== undefined) { sets.push('schedule = ?'); values.push(updates.schedule) }

  if (sets.length === 0) return
  values.push(id)
  db.prepare(`UPDATE goals SET ${sets.join(', ')} WHERE id = ?`).run(...values)
}

export function updateGoalStatus(id: string, status: string): void {
  const db = getDb()
  db.prepare(
    "UPDATE goals SET last_status = ?, last_checked_at = datetime('now') WHERE id = ?"
  ).run(status, id)
}

export function deleteGoal(id: string): void {
  const db = getDb()
  db.prepare('DELETE FROM goals WHERE id = ?').run(id)
}

export function seedDefaultGoals(): void {
  createGoal(
    'inbox_under_control',
    'Keep inbox manageable',
    'Monitor inbox and triage when unread important emails exceed 20',
    'inbox_count_check',
    'hourly'
  )
  createGoal(
    'meetings_prepped',
    'Prepare for meetings',
    'Check upcoming meetings and prepare briefing materials 15 minutes before',
    'meeting_prep_check',
    'every_15min'
  )
  createGoal(
    'tasks_reviewed',
    'Daily task review',
    'Review and update today\'s task list during morning sweep',
    'task_review_check',
    'on_sweep'
  )
}
