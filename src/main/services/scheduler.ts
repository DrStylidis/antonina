import cron from 'node-cron'
import { loadConfig } from './config'
import { showNotification } from './notifications'
import { isApiKeyConfigured } from './ai/client'
import { runAgentSession } from './agent/orchestrator'
import { startEmailWatcher, stopEmailWatcher } from './watchers/email-watcher'
import { startMeetingWatcher, stopMeetingWatcher } from './watchers/meeting-watcher'
import { checkGoals } from './agent/goal-checker'
import { seedDefaultGoals } from './db/goals'

let morningJob: ReturnType<typeof cron.schedule> | null = null
let eveningJob: ReturnType<typeof cron.schedule> | null = null
let goalCheckJob: ReturnType<typeof cron.schedule> | null = null

function timeToCron(time: string): string {
  const [hours, minutes] = time.split(':')
  return `${minutes} ${hours} * * *`
}

async function runMorningSweep(): Promise<void> {
  try {
    if (!isApiKeyConfigured()) return

    showNotification('Morning Sweep', 'Antonina is generating your daily briefing...')
    await runAgentSession(
      'morning_sweep',
      'Good morning. Run the morning sweep: fetch emails, calendar events, and tasks. Classify and prioritize everything. Generate a daily briefing, save it, and show a notification with the headline. If there are urgent or important items, highlight them. Draft replies for important emails and queue them for my review.'
    )
  } catch (error) {
    console.error('Morning sweep failed:', error)
  }
}

async function runEveningSweep(): Promise<void> {
  try {
    if (!isApiKeyConfigured()) return

    showNotification('Evening Sweep', 'Antonina is preparing your evening summary...')
    await runAgentSession(
      'evening_sweep',
      'Good evening. Run the evening sweep: check for any new important emails since this morning. Review tomorrow\'s calendar. Check for overdue or incomplete tasks. Generate an evening briefing summarizing what happened today and what\'s coming tomorrow. Show a notification with the summary.'
    )
  } catch (error) {
    console.error('Evening sweep failed:', error)
  }
}

export function startScheduler(): void {
  const config = loadConfig()

  // Morning sweep
  const morningCron = timeToCron(config.schedule.morning_sweep)
  morningJob = cron.schedule(morningCron, () => {
    runMorningSweep()
  })

  // Evening sweep
  const eveningCron = timeToCron(config.schedule.evening_sweep)
  eveningJob = cron.schedule(eveningCron, () => {
    runEveningSweep()
  })

  // Start watchers
  startEmailWatcher(config.schedule.refresh_interval_minutes)
  startMeetingWatcher()

  // Seed default goals if needed
  try { seedDefaultGoals() } catch { /* table might not exist yet */ }

  // Goal checker - every 30 minutes
  goalCheckJob = cron.schedule('*/30 * * * *', () => {
    checkGoals().catch(err => console.error('Goal check failed:', err))
  })

  console.log(
    `Scheduler started: morning=${config.schedule.morning_sweep}, evening=${config.schedule.evening_sweep}`
  )
}

export function stopScheduler(): void {
  if (morningJob) {
    morningJob.stop()
    morningJob = null
  }
  if (eveningJob) {
    eveningJob.stop()
    eveningJob = null
  }
  if (goalCheckJob) {
    goalCheckJob.stop()
    goalCheckJob = null
  }
  stopEmailWatcher()
  stopMeetingWatcher()
  console.log('Scheduler stopped')
}
