import { ipcMain } from 'electron'
import { isThings3Running } from '../services/applescript/things'
import { isApiKeyConfigured } from '../services/ai/client'
import { isGraphConfigured, hasTokens, getAccessToken } from '../services/graph/auth'
import { getLatestBriefing } from '../services/db/briefings'
import { getDailyCost } from '../services/db/costs'

export function registerHealthHandlers(): void {
  ipcMain.handle('health:status', async () => {
    const things3 = await isThings3Running()

    const latestBriefing = getLatestBriefing()
    const dailyCost = getDailyCost()

    return {
      outlook: isGraphConfigured() && hasTokens(),
      things3,
      apiKey: isApiKeyConfigured(),
      lastBriefing: latestBriefing ? latestBriefing.generatedAt : null,
      dailyCost
    }
  })

  // OAuth sign-in flow
  ipcMain.handle('auth:microsoft-signin', async () => {
    try {
      await getAccessToken()
      return { success: true }
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Sign-in failed'
      }
    }
  })

  // Check Microsoft connection status
  ipcMain.handle('auth:microsoft-status', () => {
    return {
      configured: isGraphConfigured(),
      connected: hasTokens()
    }
  })
}
