import { app } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { getAllFeedbackStats } from '../db/feedback'
import { getActiveGoals } from '../db/goals'
import { loadConfig } from '../config'

function buildDefaultContext(): string {
  const config = loadConfig()
  const f = config.founder

  let context = `# Antonina — Agent Context

## Identity
You are Antonina, the Chief of Staff AI for ${f.full_name}, ${f.role} of ${f.company}.
`

  if (f.company_description || f.bio) {
    context += `\n## Company Context\n`
    if (f.company_description) context += `${f.company_description}\n`
    if (f.bio) context += `\n${f.bio}\n`
  }

  context += `
## Communication Style
- ${f.communication_style}
- Formal for investors and VCs
- Professional for clients
- Casual for internal team
- Sign off as "${f.sign_off || f.name}"
`

  if (config.vip_contacts.length > 0) {
    context += `\n## Key Contact Categories\n`
    for (const vip of config.vip_contacts) {
      context += `- **${vip.label}**`
      if (vip.tone) context += `: ${vip.tone}`
      context += `\n`
    }
  }

  context += `
## Rules
- NEVER send emails without human approval
- Calendar modifications need approval
- You may create tasks and show notifications freely
- Keep API costs reasonable
- Be proactive about flagging urgent items
`

  return context
}

function getContextPath(): string {
  return join(app.getPath('userData'), 'agent-context.md')
}

export function loadAgentContext(): string {
  const contextPath = getContextPath()
  const defaultContext = buildDefaultContext()
  if (!existsSync(contextPath)) {
    writeFileSync(contextPath, defaultContext, 'utf-8')
  }
  try {
    return readFileSync(contextPath, 'utf-8')
  } catch {
    return defaultContext
  }
}

export function saveAgentContext(content: string): void {
  writeFileSync(getContextPath(), content, 'utf-8')
}

export function resetAgentContext(): string {
  const defaultContext = buildDefaultContext()
  writeFileSync(getContextPath(), defaultContext, 'utf-8')
  return defaultContext
}

export function buildLearnedContext(): string {
  try {
    const stats = getAllFeedbackStats()
    if (Object.keys(stats).length === 0) return ''

    let context = '\n\n## Learned from Past Decisions\n'
    for (const [action, s] of Object.entries(stats)) {
      if (s.total < 3) continue // Need minimum data
      const approvalRate = Math.round((s.approved / s.total) * 100)
      const editRate = Math.round(s.editRate * 100)
      context += `- **${action}**: ${approvalRate}% approved`
      if (editRate > 0) context += `, ${editRate}% edited before approval`
      if (s.rejected > 0) context += `, ${s.rejected} rejected`
      context += ` (${s.total} total)\n`
    }
    return context
  } catch {
    return ''
  }
}

export function buildGoalsContext(): string {
  try {
    const goals = getActiveGoals()
    if (goals.length === 0) return ''

    let context = '\n\n## Active Goals\n'
    for (const g of goals) {
      context += `- **${g.title}**: ${g.description}`
      if (g.last_status) context += ` (last check: ${g.last_status})`
      context += '\n'
    }
    return context
  } catch {
    return ''
  }
}

export function buildTimeContext(): string {
  const config = loadConfig()
  const timezone = config.founder.timezone
  const now = new Date()
  const formatter = new Intl.DateTimeFormat('en-SE', {
    timeZone: timezone,
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })
  const timeStr = formatter.format(now)

  const hour = parseInt(new Intl.DateTimeFormat('en', { timeZone: timezone, hour: 'numeric', hour12: false }).format(now))
  let period = 'morning'
  if (hour >= 12 && hour < 17) period = 'afternoon'
  else if (hour >= 17) period = 'evening'

  return `\nCurrent time: ${timeStr} (${period})`
}

export function buildFullContext(): string {
  const identity = loadAgentContext()
  const learned = buildLearnedContext()
  const goals = buildGoalsContext()
  const time = buildTimeContext()
  return `${identity}${learned}${goals}${time}`
}
