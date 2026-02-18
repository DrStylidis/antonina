import { ipcMain, BrowserWindow } from 'electron'
import { fetchEmails } from '../services/graph/mail'
import { fetchTodayAndTomorrowEvents } from '../services/graph/calendar'
import { isGraphConfigured, hasTokens } from '../services/graph/auth'
import { fetchTodayTasks, isThings3Running } from '../services/applescript/things'
import { classifyEmails } from '../services/ai/classify'
import { generateBriefing } from '../services/ai/briefing'
import { isApiKeyConfigured } from '../services/ai/client'
import { getSettings } from './settings'
import { saveBriefing, getLatestBriefing, getBriefingHistory } from '../services/db/briefings'
import { rateLimitCheck } from '../services/rate-limit'

function sendProgress(step: string): void {
  const windows = BrowserWindow.getAllWindows()
  if (windows.length > 0) {
    windows[0].webContents.send('briefing:progress', step)
  }
}

export function registerBriefingHandlers(): void {
  ipcMain.handle('briefing:generate', async () => {
    if (!rateLimitCheck('briefing:generate', 30000)) {
      return { error: 'Please wait 30 seconds between briefing generations' }
    }
    if (!isApiKeyConfigured()) {
      return { error: 'API key not configured. Set it in Settings.' }
    }

    try {
      sendProgress('Checking connections...')

      // Fetch emails via Graph API
      let rawEmails: Awaited<ReturnType<typeof fetchEmails>> = []
      if (isGraphConfigured() && hasTokens()) {
        sendProgress('Fetching emails from Microsoft 365...')
        rawEmails = await fetchEmails()
      } else {
        sendProgress('Microsoft account not connected — skipping emails')
      }

      // Classify emails
      sendProgress('Classifying emails with AI...')
      const settings = getSettings()
      // Build importance map from Outlook's importance flag
      const importanceMap = new Map<string, string>()
      for (const e of rawEmails) {
        if (e.importance) importanceMap.set(e.id, e.importance)
      }
      const classifiedEmails =
        rawEmails.length > 0
          ? await classifyEmails(rawEmails, settings.noisePatterns, importanceMap)
          : []

      // Fetch calendar via Graph API
      let events: Awaited<ReturnType<typeof fetchTodayAndTomorrowEvents>> = []
      if (isGraphConfigured() && hasTokens()) {
        sendProgress('Fetching calendar events...')
        events = await fetchTodayAndTomorrowEvents()
      }

      // Fetch tasks via AppleScript (Things 3)
      let tasks: Awaited<ReturnType<typeof fetchTodayTasks>> = []
      const thingsRunning = await isThings3Running()
      if (thingsRunning) {
        sendProgress('Fetching tasks from Things 3...')
        tasks = await fetchTodayTasks()
      } else {
        sendProgress('Things 3 not running — skipping tasks')
      }

      // Generate briefing
      sendProgress('Generating briefing with AI...')
      const briefingResult = await generateBriefing(
        classifiedEmails.map((e) => ({
          fromName: e.fromName,
          fromAddress: e.fromAddress,
          subject: e.subject,
          body: e.body,
          classification: e.classification
        })),
        events.map((e) => ({
          title: e.title,
          startTime: e.startTime,
          endTime: e.endTime,
          location: e.location,
          isAllDay: e.isAllDay,
          attendees: e.attendees
        })),
        tasks.map((t) => ({
          name: t.name,
          notes: t.notes,
          dueDate: t.dueDate,
          project: t.project,
          tags: t.tags,
          completed: t.completed
        }))
      )

      // Compute stats
      const now = new Date()
      const emailsNeedAttention = classifiedEmails.filter(
        (e) => e.classification === 'important'
      ).length

      const todayEvents = events.filter((e) => {
        try {
          const start = new Date(e.startTime)
          return start.toDateString() === now.toDateString()
        } catch {
          return true
        }
      })

      const tasksDue = tasks.filter((t) => !t.completed).length
      const tasksOverdue = tasks.filter((t) => {
        if (t.completed || !t.dueDate) return false
        try {
          return new Date(t.dueDate) < now
        } catch {
          return false
        }
      }).length

      const stats = {
        emailsProcessed: classifiedEmails.length,
        emailsNeedAttention,
        meetingsToday: todayEvents.length,
        tasksDue,
        tasksOverdue
      }

      // Save to SQLite
      const stored = saveBriefing({
        headline: briefingResult.headline,
        sections: briefingResult.sections,
        stats
      })

      sendProgress('Briefing ready!')
      return {
        briefing: {
          id: stored.id,
          generatedAt: stored.generatedAt,
          headline: stored.headline,
          sections: stored.sections,
          stats: stored.stats
        }
      }
    } catch (error) {
      console.error('Briefing generation error:', error)
      return {
        error: error instanceof Error ? error.message : 'Failed to generate briefing'
      }
    }
  })

  ipcMain.handle('briefing:latest', () => {
    const latest = getLatestBriefing()
    if (!latest) return { briefing: null }

    return {
      briefing: {
        id: latest.id,
        generatedAt: latest.generatedAt,
        headline: latest.headline,
        sections: latest.sections,
        stats: latest.stats
      }
    }
  })

  ipcMain.handle('briefing:history', () => {
    const briefings = getBriefingHistory(30)
    return {
      briefings: briefings.map((b) => ({
        id: b.id,
        generatedAt: b.generatedAt,
        headline: b.headline,
        sections: b.sections,
        stats: b.stats
      }))
    }
  })
}
