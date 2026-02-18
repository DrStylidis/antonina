import { getDb } from './index'

interface FeedbackEntry {
  id: number
  action_type: string
  outcome: string
  was_edited: number
  edit_summary: string | null
  time_to_decision_ms: number | null
  hour_of_day: number | null
  created_at: string
}

interface FeedbackStats {
  total: number
  approved: number
  rejected: number
  edited: number
  editRate: number
  avgDecisionMs: number | null
}

export function logFeedback(
  actionType: string,
  outcome: 'approved' | 'rejected' | 'edited_then_approved',
  wasEdited: boolean,
  editSummary?: string,
  timeToDecisionMs?: number
): void {
  const db = getDb()
  const hourOfDay = new Date().getHours()
  db.prepare(`
    INSERT INTO action_feedback (action_type, outcome, was_edited, edit_summary, time_to_decision_ms, hour_of_day)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(actionType, outcome, wasEdited ? 1 : 0, editSummary || null, timeToDecisionMs || null, hourOfDay)
}

export function getFeedbackStats(actionType: string): FeedbackStats {
  const db = getDb()
  const rows = db.prepare(
    'SELECT outcome, was_edited, time_to_decision_ms FROM action_feedback WHERE action_type = ? ORDER BY created_at DESC LIMIT 50'
  ).all(actionType) as Array<{ outcome: string; was_edited: number; time_to_decision_ms: number | null }>

  const total = rows.length
  if (total === 0) return { total: 0, approved: 0, rejected: 0, edited: 0, editRate: 0, avgDecisionMs: null }

  const approved = rows.filter(r => r.outcome !== 'rejected').length
  const rejected = rows.filter(r => r.outcome === 'rejected').length
  const edited = rows.filter(r => r.was_edited === 1).length
  const decisionsWithTime = rows.filter(r => r.time_to_decision_ms != null)
  const avgDecisionMs = decisionsWithTime.length > 0
    ? decisionsWithTime.reduce((sum, r) => sum + (r.time_to_decision_ms || 0), 0) / decisionsWithTime.length
    : null

  return { total, approved, rejected, edited, editRate: edited / total, avgDecisionMs }
}

export function getAllFeedbackStats(): Record<string, FeedbackStats> {
  const db = getDb()
  const actionTypes = db.prepare(
    'SELECT DISTINCT action_type FROM action_feedback'
  ).all() as Array<{ action_type: string }>

  const stats: Record<string, FeedbackStats> = {}
  for (const { action_type } of actionTypes) {
    stats[action_type] = getFeedbackStats(action_type)
  }
  return stats
}

export function getRecentFeedback(limit = 10): FeedbackEntry[] {
  const db = getDb()
  return db.prepare(
    'SELECT * FROM action_feedback ORDER BY created_at DESC LIMIT ?'
  ).all(limit) as FeedbackEntry[]
}
