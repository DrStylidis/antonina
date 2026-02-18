import { app } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync, copyFileSync } from 'fs'
import YAML from 'yaml'

export interface AppConfig {
  founder: {
    name: string
    full_name: string
    role: string
    company: string
    company_description: string
    timezone: string
    bio: string
    communication_style: string
    sign_off: string
  }
  schedule: {
    morning_sweep: string
    evening_sweep: string
    refresh_interval_minutes: number
  }
  outlook: {
    account_email: string
  }
  email: {
    lookback_hours: number
    max_emails: number
    noise_patterns: string[]
  }
  api: {
    briefing_model: string
    triage_model: string
    draft_model: string
    agent_model: string
    max_daily_cost_usd: number
  }
  agent: {
    max_sessions_per_hour: number
    max_sessions_per_day: number
    max_tool_calls_per_session: number
    autonomy_mode: 'conservative' | 'balanced' | 'executive'
  }
  meeting_prep?: {
    enabled: boolean
    minutes_before: number
  }
  vip_contacts: Array<{
    pattern: string
    label: string
    tone?: string
  }>
  mcp_servers: Array<{
    name: string
    command: string
    args: string[]
    env?: Record<string, string>
  }>
}

const DEFAULT_CONFIG: AppConfig = {
  founder: {
    name: 'User',
    full_name: 'Your Name',
    role: 'Founder',
    company: 'Your Company',
    company_description: '',
    timezone: 'UTC',
    bio: '',
    communication_style: 'Professional and concise',
    sign_off: 'User'
  },
  schedule: {
    morning_sweep: '05:30',
    evening_sweep: '18:00',
    refresh_interval_minutes: 30
  },
  outlook: {
    account_email: ''
  },
  email: {
    lookback_hours: 12,
    max_emails: 50,
    noise_patterns: ['unsubscribe', 'newsletter', 'no-reply', 'noreply', 'marketing']
  },
  api: {
    briefing_model: 'claude-sonnet-4-5-20250929',
    triage_model: 'claude-haiku-4-5-20251001',
    draft_model: 'claude-sonnet-4-5-20250929',
    agent_model: 'claude-opus-4-6',
    max_daily_cost_usd: 10.0
  },
  agent: {
    max_sessions_per_hour: 6,
    max_sessions_per_day: 50,
    max_tool_calls_per_session: 20,
    autonomy_mode: 'balanced' as const
  },
  meeting_prep: {
    enabled: true,
    minutes_before: 15
  },
  vip_contacts: [],
  mcp_servers: []
}

function getConfigPath(): string {
  return join(app.getPath('userData'), 'config.yaml')
}

export function loadConfig(): AppConfig {
  const configPath = getConfigPath()

  if (!existsSync(configPath)) {
    // Try to copy bundled config first, otherwise write defaults
    const bundledConfig = join(__dirname, '../../config.yaml')
    if (existsSync(bundledConfig)) {
      copyFileSync(bundledConfig, configPath)
    } else {
      writeFileSync(configPath, YAML.stringify(DEFAULT_CONFIG), 'utf-8')
    }
  }

  try {
    const raw = readFileSync(configPath, 'utf-8')
    const parsed = YAML.parse(raw) as Partial<AppConfig>
    // Merge with defaults so missing keys are filled in
    return {
      founder: { ...DEFAULT_CONFIG.founder, ...parsed.founder },
      schedule: { ...DEFAULT_CONFIG.schedule, ...parsed.schedule },
      outlook: { ...DEFAULT_CONFIG.outlook, ...parsed.outlook },
      email: { ...DEFAULT_CONFIG.email, ...parsed.email },
      api: { ...DEFAULT_CONFIG.api, ...parsed.api },
      agent: { ...DEFAULT_CONFIG.agent, ...parsed.agent },
      meeting_prep: { ...DEFAULT_CONFIG.meeting_prep, ...parsed.meeting_prep },
      vip_contacts: parsed.vip_contacts ?? DEFAULT_CONFIG.vip_contacts,
      mcp_servers: parsed.mcp_servers ?? DEFAULT_CONFIG.mcp_servers
    }
  } catch (error) {
    console.error('Failed to load config, using defaults:', error)
    return DEFAULT_CONFIG
  }
}

export function getUserPromptContext(): string {
  const config = loadConfig()
  const f = config.founder
  let ctx = `${f.full_name}, ${f.role} of ${f.company}`
  if (f.company_description) ctx += ` — ${f.company_description}`
  if (f.bio) ctx += `\n\n${f.bio}`
  return ctx
}

export function saveConfig(config: AppConfig): void {
  const configPath = getConfigPath()
  writeFileSync(configPath, YAML.stringify(config), 'utf-8')
}
