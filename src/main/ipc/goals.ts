import { ipcMain } from 'electron'
import { getGoals, updateGoal } from '../services/db/goals'

export function registerGoalsHandlers(): void {
  ipcMain.handle('goals:list', async () => {
    try {
      return { goals: getGoals() }
    } catch (error) {
      return { goals: [], error: String(error) }
    }
  })

  ipcMain.handle('goals:update', async (_event, id: string, updates: { enabled?: number; title?: string; description?: string }) => {
    try {
      updateGoal(id, updates)
      return { success: true }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })
}
