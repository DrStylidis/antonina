import { ipcMain } from 'electron'
import { sendChatMessage } from '../services/agent/chat-session'
import { getChatHistory, getLatestChatSession, clearChatSession } from '../services/db/chat'
import { createSession, getSession } from '../services/db/agent'
import { randomUUID } from 'crypto'

let currentChatSession: string | null = null

function ensureChatSession(): string {
  if (!currentChatSession) {
    currentChatSession = getLatestChatSession()
  }
  if (!currentChatSession) {
    currentChatSession = randomUUID()
    createSession(currentChatSession, 'chat')
  } else if (!getSession(currentChatSession)) {
    // Session exists in chat_messages but not in agent_sessions (pre-fix data)
    createSession(currentChatSession, 'chat')
  }
  return currentChatSession
}

export function registerChatHandlers(): void {
  ipcMain.handle('chat:send', async (_event, message: string) => {
    if (!message || typeof message !== 'string') {
      return { error: 'Message must be a non-empty string' }
    }
    if (message.length > 50000) {
      return { error: 'Message too long (max 50,000 characters)' }
    }
    const sessionId = ensureChatSession()
    try {
      const response = await sendChatMessage(sessionId, message)
      return { response, sessionId }
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Chat failed' }
    }
  })

  ipcMain.handle('chat:history', () => {
    if (!currentChatSession) {
      currentChatSession = getLatestChatSession()
    }
    if (!currentChatSession) return { messages: [], sessionId: null }
    const messages = getChatHistory(currentChatSession)
    return { messages, sessionId: currentChatSession }
  })

  ipcMain.handle('chat:clear', () => {
    if (currentChatSession) {
      clearChatSession(currentChatSession)
    }
    currentChatSession = randomUUID()
    createSession(currentChatSession, 'chat')
    return { sessionId: currentChatSession }
  })
}
