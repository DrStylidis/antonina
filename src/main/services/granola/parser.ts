import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { app } from 'electron'

export interface GranolaMeeting {
  id: string
  title: string
  date: string
  durationMinutes: number | null
  participants: string[]
  panelHtml: string | null
  panelTitle: string | null
  hasTranscript: boolean
}

function getGranolaCachePath(): string {
  return join(app.getPath('home'), 'Library', 'Application Support', 'Granola', 'cache-v3.json')
}

export function parseGranolaCache(): GranolaMeeting[] {
  const cachePath = getGranolaCachePath()

  if (!existsSync(cachePath)) {
    console.warn('Granola cache not found at', cachePath)
    return []
  }

  let raw: string
  try {
    raw = readFileSync(cachePath, 'utf-8')
  } catch (err) {
    console.error('Failed to read Granola cache file:', err)
    return []
  }

  // First parse: outer JSON { cache: "<JSON string>" }
  let outer: { cache: string }
  try {
    outer = JSON.parse(raw)
  } catch (err) {
    console.error('Failed to parse outer Granola cache JSON:', err)
    return []
  }

  if (!outer.cache || typeof outer.cache !== 'string') {
    console.error('Granola cache missing inner "cache" string')
    return []
  }

  // Second parse: inner JSON string -> actual state data
  let inner: {
    state: {
      documents: Record<string, GranolaDocument>
      documentPanels: Record<string, Record<string, GranolaPanel>>
      transcripts: Record<string, unknown>
    }
  }
  try {
    inner = JSON.parse(outer.cache)
  } catch (err) {
    console.error('Failed to parse inner Granola cache JSON:', err)
    return []
  }

  const documents = inner?.state?.documents ?? {}
  const documentPanels = inner?.state?.documentPanels ?? {}
  const transcripts = inner?.state?.transcripts ?? {}

  const meetings: GranolaMeeting[] = []

  for (const [docId, doc] of Object.entries(documents)) {
    // Skip deleted documents
    if (doc.deleted_at) continue

    // Skip non-meeting documents
    if (doc.type !== 'meeting') continue

    // Calculate duration from calendar event
    let durationMinutes: number | null = null
    const calEvent = doc.google_calendar_event
    if (calEvent?.start?.dateTime && calEvent?.end?.dateTime) {
      const startMs = new Date(calEvent.start.dateTime).getTime()
      const endMs = new Date(calEvent.end.dateTime).getTime()
      if (!isNaN(startMs) && !isNaN(endMs) && endMs > startMs) {
        durationMinutes = Math.round((endMs - startMs) / 60000)
      }
    }

    // Extract participants — filter out self
    const participants: string[] = []
    if (calEvent?.attendees && Array.isArray(calEvent.attendees)) {
      for (const attendee of calEvent.attendees) {
        if (attendee.self) continue
        if (attendee.email) {
          participants.push(attendee.email)
        }
      }
    }

    // Look up panels for this document
    let panelHtml: string | null = null
    let panelTitle: string | null = null
    const panels = documentPanels[docId]
    if (panels) {
      const panelEntries = Object.values(panels)
      if (panelEntries.length > 0) {
        const firstPanel = panelEntries[0]
        panelHtml = firstPanel.original_content ?? null
        panelTitle = firstPanel.title ?? null
      }
    }

    // Check transcript existence
    const hasTranscript = docId in transcripts

    meetings.push({
      id: docId,
      title: doc.title || 'Untitled Meeting',
      date: doc.created_at,
      durationMinutes,
      participants,
      panelHtml,
      panelTitle,
      hasTranscript
    })
  }

  // Sort by date descending (most recent first)
  meetings.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return meetings
}

export function getRecentMeetings(days: number = 7): GranolaMeeting[] {
  const all = parseGranolaCache()
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  return all.filter((m) => new Date(m.date) >= cutoff)
}

// ---- Internal types matching Granola cache structure ----

interface GranolaDocument {
  id: string
  title: string
  created_at: string
  updated_at: string
  deleted_at: string | null
  type: string
  google_calendar_event?: {
    start?: { dateTime?: string }
    end?: { dateTime?: string }
    attendees?: Array<{ email?: string; self?: boolean }>
  }
  people?: unknown[]
}

interface GranolaPanel {
  title?: string
  original_content?: string
}
