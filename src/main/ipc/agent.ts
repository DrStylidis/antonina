import { ipcMain } from 'electron'
import {
  getPendingApprovals,
  resolveApproval,
  getRecentSessions,
  getSessionActions
} from '../services/db/agent'
import { executeTool } from '../services/agent/tools'
import { runAgentSession } from '../services/agent/orchestrator'
import { logFeedback } from '../services/db/feedback'
import { rateLimitCheck } from '../services/rate-limit'
import { loadConfig } from '../services/config'

export function registerAgentHandlers(): void {
  ipcMain.handle('agent:pending-approvals', () => {
    return getPendingApprovals()
  })

  ipcMain.handle('agent:approve', async (_event, id: string, editedDataJson?: string) => {
    const approvals = getPendingApprovals()
    const approval = approvals.find((a) => a.id === id)
    if (!approval) return { error: 'Approval not found' }

    try {
      const data = JSON.parse(editedDataJson ?? approval.data_json)
      if (typeof data !== 'object' || data === null) {
        return { error: 'Approval data must be a JSON object' }
      }
      await executeTool(approval.action_type, data, approval.session_id)
      resolveApproval(id, 'approved')

      // Log feedback for learning
      const createdAt = new Date(approval.created_at).getTime()
      const timeToDecision = Date.now() - createdAt
      const wasEdited = editedDataJson !== undefined && editedDataJson !== null
      logFeedback(
        approval.action_type,
        wasEdited ? 'edited_then_approved' : 'approved',
        wasEdited,
        undefined,
        timeToDecision
      )

      return { success: true }
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Failed' }
    }
  })

  ipcMain.handle('agent:reject', (_event, id: string) => {
    const approvals = getPendingApprovals()
    const approval = approvals.find((a) => a.id === id)
    if (!approval) return { error: 'Approval not found' }

    resolveApproval(id, 'rejected')

    // Log feedback for learning
    if (approval) {
      const createdAt = new Date(approval.created_at).getTime()
      const timeToDecision = Date.now() - createdAt
      logFeedback(approval.action_type, 'rejected', false, undefined, timeToDecision)
    }

    return { success: true }
  })

  ipcMain.handle('agent:sessions', () => {
    return getRecentSessions()
  })

  ipcMain.handle('agent:session-actions', (_event, id: string) => {
    return getSessionActions(id)
  })

  ipcMain.handle('agent:run-now', async () => {
    try {
      if (!rateLimitCheck('agent:run-now', 15000)) {
        return { error: 'Please wait 15 seconds between manual agent runs' }
      }
      const config = loadConfig()
      const result = await runAgentSession(
        'manual',
        `The user manually triggered an agent session. Fetch the latest emails, calendar, and tasks. Analyze what needs attention right now. Generate a briefing, draft replies for important emails, and notify ${config.founder.name} of anything urgent.`
      )
      return { success: true, sessionId: result.sessionId, summary: result.summary }
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Agent session failed' }
    }
  })
}
