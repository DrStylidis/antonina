import { ipcMain } from 'electron'
import { fetchTodayTasks, isThings3Running } from '../services/applescript/things'
import { completeTask } from '../services/applescript/things-write'

export function registerTaskHandlers(): void {
  ipcMain.handle('tasks:complete', async (_event, taskId: string) => {
    try {
      await completeTask(taskId)
      return { success: true }
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Failed to complete task' }
    }
  })

  ipcMain.handle('tasks:today', async () => {
    try {
      const running = await isThings3Running()
      if (!running) {
        return { error: 'Things 3 is not running.', tasks: [] }
      }

      const rawTasks = await fetchTodayTasks()

      const now = new Date()
      const tasks = rawTasks.map((t) => {
        let isOverdue = false
        if (t.dueDate && !t.completed) {
          try {
            const due = new Date(t.dueDate)
            isOverdue = due < now
          } catch {
            // Ignore parse errors
          }
        }

        return {
          id: t.id,
          name: t.name,
          notes: t.notes || undefined,
          dueDate: t.dueDate || undefined,
          project: t.project || undefined,
          tags: t.tags,
          completed: t.completed,
          isOverdue
        }
      })

      return { tasks }
    } catch (error) {
      console.error('Tasks fetch error:', error)
      return {
        error: error instanceof Error ? error.message : 'Failed to fetch tasks',
        tasks: []
      }
    }
  })
}
