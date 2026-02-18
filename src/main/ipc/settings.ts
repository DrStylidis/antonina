import { ipcMain, safeStorage } from 'electron'
import { resetClient } from '../services/ai/client'
import { loadConfig, saveConfig } from '../services/config'
import { loadAgentContext, saveAgentContext } from '../services/agent/context'
import { getDb } from '../services/db'
import type { AppConfig } from '../services/config'

interface AppSettings {
  anthropicApiKey: string
  briefingModel: string
  triageModel: string
  draftModel: string
  morningSweedTime: string
  eveningSweedTime: string
  refreshIntervalMinutes: number
  noisePatterns: string[]
  maxDailyCostUsd: number
  autonomyMode: 'conservative' | 'balanced' | 'executive'
}

function loadApiKey(): string {
  try {
    const db = getDb()
    const row = db.prepare("SELECT value FROM settings WHERE key = 'anthropic_api_key'").get() as { value: string } | undefined
    if (row?.value) {
      if (safeStorage.isEncryptionAvailable()) {
        try {
          return safeStorage.decryptString(Buffer.from(row.value, 'base64'))
        } catch {
          // Legacy plaintext value — return as-is, will be re-encrypted on next save
          return row.value
        }
      }
      return row.value
    }
  } catch { /* DB not ready yet */ }
  return process.env.ANTHROPIC_API_KEY || ''
}

function saveApiKey(key: string): void {
  const db = getDb()
  let stored = key
  if (safeStorage.isEncryptionAvailable()) {
    stored = safeStorage.encryptString(key).toString('base64')
  }
  db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('anthropic_api_key', ?)").run(stored)
}

let apiKey = ''

export function initApiKey(): void {
  apiKey = loadApiKey()
  if (apiKey) {
    process.env.ANTHROPIC_API_KEY = apiKey
  }
}

export function getSettings(): AppSettings {
  const config = loadConfig()
  return {
    anthropicApiKey: apiKey,
    briefingModel: config.api.briefing_model,
    triageModel: config.api.triage_model,
    draftModel: config.api.draft_model,
    morningSweedTime: config.schedule.morning_sweep,
    eveningSweedTime: config.schedule.evening_sweep,
    refreshIntervalMinutes: config.schedule.refresh_interval_minutes,
    noisePatterns: config.email.noise_patterns,
    maxDailyCostUsd: config.api.max_daily_cost_usd,
    autonomyMode: config.agent.autonomy_mode
  }
}

export function registerSettingsHandlers(): void {
  ipcMain.handle('settings:get', () => {
    const settings = getSettings()
    return {
      ...settings,
      anthropicApiKey: settings.anthropicApiKey ? '••••••••' : ''
    }
  })

  ipcMain.handle('settings:update', (_event, newSettings: Partial<AppSettings>) => {
    // Validate settings
    if (newSettings.maxDailyCostUsd !== undefined) {
      if (typeof newSettings.maxDailyCostUsd !== 'number' || newSettings.maxDailyCostUsd < 0.5 || newSettings.maxDailyCostUsd > 100) {
        return { error: 'maxDailyCostUsd must be between 0.50 and 100' }
      }
    }
    if (newSettings.autonomyMode !== undefined) {
      if (!['conservative', 'balanced', 'executive'].includes(newSettings.autonomyMode)) {
        return { error: 'autonomyMode must be conservative, balanced, or executive' }
      }
    }
    if (newSettings.refreshIntervalMinutes !== undefined) {
      if (typeof newSettings.refreshIntervalMinutes !== 'number' || newSettings.refreshIntervalMinutes < 5 || newSettings.refreshIntervalMinutes > 1440) {
        return { error: 'refreshIntervalMinutes must be between 5 and 1440' }
      }
    }
    if (newSettings.morningSweedTime !== undefined) {
      if (!/^\d{2}:\d{2}$/.test(newSettings.morningSweedTime)) {
        return { error: 'morningSweedTime must be in HH:MM format' }
      }
    }
    if (newSettings.eveningSweedTime !== undefined) {
      if (!/^\d{2}:\d{2}$/.test(newSettings.eveningSweedTime)) {
        return { error: 'eveningSweedTime must be in HH:MM format' }
      }
    }

    // Handle API key update
    if (newSettings.anthropicApiKey && newSettings.anthropicApiKey !== '••••••••') {
      apiKey = newSettings.anthropicApiKey
      process.env.ANTHROPIC_API_KEY = newSettings.anthropicApiKey
      saveApiKey(newSettings.anthropicApiKey)
      resetClient()
    } else if (newSettings.anthropicApiKey === '••••••••') {
      // User didn't change the masked key — keep old value
    }

    // Update config file for non-secret settings
    const config = loadConfig()
    const updated: AppConfig = {
      ...config,
      schedule: {
        ...config.schedule,
        ...(newSettings.morningSweedTime !== undefined && {
          morning_sweep: newSettings.morningSweedTime
        }),
        ...(newSettings.eveningSweedTime !== undefined && {
          evening_sweep: newSettings.eveningSweedTime
        }),
        ...(newSettings.refreshIntervalMinutes !== undefined && {
          refresh_interval_minutes: newSettings.refreshIntervalMinutes
        })
      },
      email: {
        ...config.email,
        noise_patterns: newSettings.noisePatterns ?? config.email.noise_patterns
      },
      api: {
        ...config.api,
        ...(newSettings.briefingModel !== undefined && {
          briefing_model: newSettings.briefingModel
        }),
        ...(newSettings.triageModel !== undefined && { triage_model: newSettings.triageModel }),
        ...(newSettings.draftModel !== undefined && { draft_model: newSettings.draftModel }),
        ...(newSettings.maxDailyCostUsd !== undefined && {
          max_daily_cost_usd: newSettings.maxDailyCostUsd
        })
      },
      agent: {
        ...config.agent,
        ...(newSettings.autonomyMode !== undefined && {
          autonomy_mode: newSettings.autonomyMode
        })
      }
    }
    saveConfig(updated)

    return { success: true }
  })

  // Agent context file handlers
  ipcMain.handle('settings:get-context', () => {
    const content = loadAgentContext()
    return { content }
  })

  ipcMain.handle('settings:save-context', (_event, content: string) => {
    saveAgentContext(content)
    return { success: true }
  })
}
