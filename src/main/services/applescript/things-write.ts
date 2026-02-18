import { runAppleScript } from './runner'
import { sanitizeTaskId, escapeAppleScriptString } from './sanitize'

export async function deleteTask(taskId: string): Promise<void> {
  const script = `
    tell application "Things3"
      set td to to do id "${sanitizeTaskId(taskId)}"
      move td to list "Trash"
    end tell
  `
  await runAppleScript(script, 10000)
}

export async function updateTaskName(taskId: string, newName: string): Promise<void> {
  const safeName = escapeAppleScriptString(newName)
  const script = `
    tell application "Things3"
      set name of to do id "${sanitizeTaskId(taskId)}" to "${safeName}"
    end tell
  `
  await runAppleScript(script, 10000)
}

export async function updateTaskNotes(taskId: string, newNotes: string): Promise<void> {
  const safeNotes = escapeAppleScriptString(newNotes)
  const script = `
    tell application "Things3"
      set notes of to do id "${sanitizeTaskId(taskId)}" to "${safeNotes}"
    end tell
  `
  await runAppleScript(script, 10000)
}

export async function completeTask(taskId: string): Promise<void> {
  const script = `
    tell application "Things3"
      set status of to do id "${sanitizeTaskId(taskId)}" to completed
    end tell
  `
  await runAppleScript(script, 10000)
}
