import { fetchEmailDelta } from '../graph/delta'
import { loadConfig } from '../config'
import { showNotification } from '../notifications'
import { isApiKeyConfigured } from '../ai/client'
import { runAgentSession } from '../agent/orchestrator'

let watcherInterval: ReturnType<typeof setInterval> | null = null

async function checkForNewEmails(): Promise<void> {
  try {
    const { newEmails } = await fetchEmailDelta()

    if (newEmails.length === 0) return

    const config = loadConfig()

    // Check for high-importance emails (Outlook flag)
    const highImportance = newEmails.filter(e => e.importance === 'high')

    // Check noise patterns to exclude
    const noisePatterns = config.email.noise_patterns
    const importantEmails = newEmails.filter(e => {
      if (e.importance === 'high') return true
      const addr = e.from?.emailAddress?.address?.toLowerCase() || ''
      const subj = e.subject?.toLowerCase() || ''
      const isNoise = noisePatterns.some(p => addr.includes(p.toLowerCase()) || subj.includes(p.toLowerCase()))
      return !isNoise && !e.isRead
    })

    if (highImportance.length > 0 && isApiKeyConfigured()) {
      // Trigger focused agent session for important emails
      const subjects = highImportance.map(e => e.subject).join(', ')
      showNotification(
        'Important Email Detected',
        `${highImportance.length} high-priority email(s): ${subjects.substring(0, 100)}`
      )

      await runAgentSession(
        'vip_check',
        `URGENT: ${highImportance.length} high-importance email(s) detected. Subjects: ${subjects}. Fetch the latest emails, analyze these urgent items, draft replies if needed, and notify ${config.founder.name} of anything requiring immediate action.`
      )
    } else if (importantEmails.length >= 3) {
      // Batch of unread non-noise emails — worth a check
      showNotification(
        'New Emails',
        `${importantEmails.length} new emails need attention`
      )
    }
  } catch (error) {
    console.error('Email watcher check failed:', error)
  }
}

export function startEmailWatcher(intervalMinutes = 30): void {
  const intervalMs = intervalMinutes * 60 * 1000
  watcherInterval = setInterval(checkForNewEmails, intervalMs)

  // Also run an initial check after 30 seconds (give app time to initialize)
  setTimeout(checkForNewEmails, 30000)

  console.log(`Email watcher started (${intervalMinutes}-minute interval)`)
}

export function stopEmailWatcher(): void {
  if (watcherInterval) {
    clearInterval(watcherInterval)
    watcherInterval = null
  }
  console.log('Email watcher stopped')
}
