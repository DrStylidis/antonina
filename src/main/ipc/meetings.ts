import { ipcMain } from 'electron'
import { getRecentMeetings } from '../services/granola/parser'

export function registerMeetingsHandlers(): void {
  ipcMain.handle('meetings:list', async () => {
    try {
      const meetings = getRecentMeetings(7)
      return { meetings }
    } catch (error) {
      console.error('Failed to fetch meeting notes:', error)
      return { meetings: [], error: error instanceof Error ? error.message : 'Failed to load meetings' }
    }
  })
}
