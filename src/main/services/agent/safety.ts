import { getDailyCost } from '../db/costs'
import { loadConfig } from '../config'

type RiskLevel = 'low' | 'medium' | 'high'
type AutonomyMode = 'conservative' | 'balanced' | 'executive'

const RISK_LEVELS: Record<string, RiskLevel> = {
  // Low risk - always auto-execute
  fetch_emails: 'low',
  fetch_sent_emails: 'low',
  fetch_calendar: 'low',
  read_tasks: 'low',
  show_notification: 'low',
  read_memory: 'low',
  update_memory: 'low',
  generate_briefing: 'low',
  save_briefing: 'low',
  update_task: 'low',
  list_goals: 'low',
  update_goal_status: 'low',

  // Things 3 MCP tools
  things_add_task: 'medium',
  things_add_project: 'medium',
  things_update_task: 'medium',
  things_search: 'low',
  things_show_list: 'low',
  things_get_today: 'low',
  things_get_upcoming: 'low',

  // Granola meeting notes (read-only)
  get_recent_meetings: 'low',
  list_meetings: 'low',
  search_meetings: 'low',
  get_meeting: 'low',
  get_transcript: 'low',
  get_meeting_notes: 'low',
  list_participants: 'low',
  export_meeting: 'low',
  get_statistics: 'low',
  analyze_patterns: 'low',

  // Medium risk - depends on autonomy mode
  create_calendar_event: 'medium',
  draft_reply: 'medium',
  delete_task: 'medium',
  request_human_review: 'medium',

  // High risk - usually needs approval
  send_email: 'high',
  delete_calendar_event: 'high',
  update_calendar_event: 'high',
}

export function getRiskLevel(toolName: string): RiskLevel {
  if (RISK_LEVELS[toolName]) return RISK_LEVELS[toolName]
  // Check MCP tools: strip "serverName__" prefix
  const sep = toolName.indexOf('__')
  if (sep > 0) {
    const baseName = toolName.slice(sep + 2)
    if (RISK_LEVELS[baseName]) return RISK_LEVELS[baseName]
  }
  return 'high' // Unknown tools default to high — must be explicitly registered
}

export interface SafetyCheck {
  needsApproval: boolean
  riskLevel: RiskLevel
  notify: boolean
}

export function checkActionSafety(toolName: string): SafetyCheck {
  const config = loadConfig()
  const mode: AutonomyMode = config.agent.autonomy_mode || 'balanced'
  const riskLevel = getRiskLevel(toolName)

  switch (mode) {
    case 'conservative':
      // Approve medium + high
      return {
        needsApproval: riskLevel !== 'low',
        riskLevel,
        notify: false
      }
    case 'balanced':
      // Auto medium with notify, approve high
      if (riskLevel === 'high') return { needsApproval: true, riskLevel, notify: false }
      if (riskLevel === 'medium') return { needsApproval: false, riskLevel, notify: true }
      return { needsApproval: false, riskLevel, notify: false }
    case 'executive':
      // Auto everything with notify for medium+high
      return {
        needsApproval: false,
        riskLevel,
        notify: riskLevel !== 'low'
      }
    default:
      return { needsApproval: riskLevel !== 'low', riskLevel, notify: false }
  }
}

// Keep backward compat - other files may still call this
export function requiresApproval(toolName: string): boolean {
  return checkActionSafety(toolName).needsApproval
}

// In-memory rate tracking
const sessionTimestamps: number[] = []

export function canStartSession(): { allowed: boolean; reason?: string } {
  const config = loadConfig()
  const dailyCost = getDailyCost()

  if (dailyCost >= config.api.max_daily_cost_usd) {
    return { allowed: false, reason: `Daily cost limit reached ($${dailyCost.toFixed(2)} / $${config.api.max_daily_cost_usd})` }
  }

  return { allowed: true }
}

export function checkRateLimit(): { allowed: boolean; reason?: string } {
  const config = loadConfig()
  const now = Date.now()
  const oneHourAgo = now - 60 * 60 * 1000
  const oneDayAgo = now - 24 * 60 * 60 * 1000

  // Clean up old entries
  while (sessionTimestamps.length > 0 && sessionTimestamps[0] < oneDayAgo) {
    sessionTimestamps.shift()
  }

  const sessionsLastHour = sessionTimestamps.filter((t) => t >= oneHourAgo).length
  if (sessionsLastHour >= config.agent.max_sessions_per_hour) {
    return { allowed: false, reason: `Rate limit: ${sessionsLastHour} sessions in the last hour (max ${config.agent.max_sessions_per_hour})` }
  }

  const sessionsLastDay = sessionTimestamps.length
  if (sessionsLastDay >= config.agent.max_sessions_per_day) {
    return { allowed: false, reason: `Rate limit: ${sessionsLastDay} sessions in the last 24 hours (max ${config.agent.max_sessions_per_day})` }
  }

  // Record this session
  sessionTimestamps.push(now)
  return { allowed: true }
}
