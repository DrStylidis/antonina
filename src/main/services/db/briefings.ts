import { getDb } from './index'
import crypto from 'crypto'

interface StoredBriefing {
  id: string
  headline: string
  data_json: string
  generated_at: string
}

interface BriefingData {
  id: string
  headline: string
  sections: unknown[]
  stats: Record<string, unknown>
  generatedAt: string
}

export function saveBriefing(briefing: {
  headline: string
  sections: unknown[]
  stats: Record<string, unknown>
}): BriefingData {
  const db = getDb()
  const id = crypto.randomUUID()
  const dataJson = JSON.stringify({ sections: briefing.sections, stats: briefing.stats })

  db.prepare(
    'INSERT OR REPLACE INTO briefings (id, headline, data_json, generated_at) VALUES (?, ?, ?, datetime(\'now\'))'
  ).run(id, briefing.headline, dataJson)

  const row = db.prepare('SELECT * FROM briefings WHERE id = ?').get(id) as StoredBriefing

  const parsed = JSON.parse(row.data_json)
  return {
    id: row.id,
    headline: row.headline,
    sections: parsed.sections,
    stats: parsed.stats,
    generatedAt: row.generated_at
  }
}

export function getLatestBriefing(): BriefingData | null {
  const db = getDb()
  const row = db
    .prepare('SELECT * FROM briefings ORDER BY generated_at DESC LIMIT 1')
    .get() as StoredBriefing | undefined

  if (!row) return null

  const parsed = JSON.parse(row.data_json)
  return {
    id: row.id,
    headline: row.headline,
    sections: parsed.sections,
    stats: parsed.stats,
    generatedAt: row.generated_at
  }
}

export function getBriefingHistory(days: number): BriefingData[] {
  const db = getDb()
  const rows = db
    .prepare(
      'SELECT * FROM briefings WHERE generated_at >= datetime(\'now\', ? || \' days\') ORDER BY generated_at DESC'
    )
    .all(`-${days}`) as StoredBriefing[]

  return rows.map((row) => {
    const parsed = JSON.parse(row.data_json)
    return {
      id: row.id,
      headline: row.headline,
      sections: parsed.sections,
      stats: parsed.stats,
      generatedAt: row.generated_at
    }
  })
}
