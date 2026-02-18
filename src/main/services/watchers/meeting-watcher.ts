import { fetchTodayAndTomorrowEvents } from '../graph/calendar'
import { showNotification } from '../notifications'
import { isApiKeyConfigured } from '../ai/client'
import { runAgentSession } from '../agent/orchestrator'
import { loadConfig } from '../config'

let meetingTimers: ReturnType<typeof setTimeout>[] = []
let scanInterval: ReturnType<typeof setInterval> | null = null

async function scanAndSchedulePreps(): Promise<void> {
  // Clear existing timers
  meetingTimers.forEach(t => clearTimeout(t))
  meetingTimers = []

  try {
    const events = await fetchTodayAndTomorrowEvents()
    const now = new Date()
    const config = loadConfig()
    const minutesBefore = config.meeting_prep?.minutes_before ?? 15

    for (const event of events) {
      if (event.isAllDay) continue

      const start = new Date(event.startTime)
      const prepTime = new Date(start.getTime() - minutesBefore * 60 * 1000)
      const msUntilPrep = prepTime.getTime() - now.getTime()

      if (msUntilPrep > 0 && msUntilPrep < 24 * 60 * 60 * 1000) {
        const timer = setTimeout(async () => {
          if (!isApiKeyConfigured()) return

          const attendeeList = event.attendees.join(', ')
          showNotification(
            `Meeting Prep: ${event.title}`,
            `Starting in ${minutesBefore} minutes${attendeeList ? ` with ${attendeeList}` : ''}`
          )

          try {
            await runAgentSession(
              'meeting_prep' as 'manual',
              `MEETING PREP: "${event.title}" starts at ${event.startTime}.
Attendees: ${attendeeList || 'None listed'}
Location: ${event.location || 'Not specified'}

Please prepare a meeting brief:
1. Check recent emails from/about any attendees
2. Look up contact memory for attendees (use read_memory tool)
3. Check if there are related tasks
4. Summarize key talking points and any open items
5. Show a notification with the prep summary`
            )
          } catch (err) {
            console.error('Meeting prep session failed:', err)
          }
        }, msUntilPrep)

        meetingTimers.push(timer)
      }
    }

    console.log(`Meeting watcher: scheduled ${meetingTimers.length} prep timers`)
  } catch (error) {
    console.error('Meeting watcher scan failed:', error)
  }
}

export function startMeetingWatcher(): void {
  // Initial scan after 60 seconds
  setTimeout(scanAndSchedulePreps, 60000)

  // Rescan every hour to pick up new meetings
  scanInterval = setInterval(scanAndSchedulePreps, 60 * 60 * 1000)

  console.log('Meeting watcher started')
}

export function stopMeetingWatcher(): void {
  meetingTimers.forEach(t => clearTimeout(t))
  meetingTimers = []
  if (scanInterval) {
    clearInterval(scanInterval)
    scanInterval = null
  }
  console.log('Meeting watcher stopped')
}
