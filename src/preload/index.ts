import { contextBridge, ipcRenderer } from 'electron'

const api = {
  briefing: {
    generate: () => ipcRenderer.invoke('briefing:generate'),
    latest: () => ipcRenderer.invoke('briefing:latest'),
    history: () => ipcRenderer.invoke('briefing:history'),
    onProgress: (callback: (step: string) => void) => {
      ipcRenderer.on('briefing:progress', (_event, step) => callback(step))
      return () => {
        ipcRenderer.removeAllListeners('briefing:progress')
      }
    }
  },
  emails: {
    fetch: () => ipcRenderer.invoke('emails:fetch'),
    approveDraft: (draftId: string, content: string) =>
      ipcRenderer.invoke('emails:approve-draft', draftId, content),
    send: (draftId: string) => ipcRenderer.invoke('emails:send', draftId),
    rejectDraft: (draftId: string) => ipcRenderer.invoke('emails:reject-draft', draftId),
    generateDraft: (emailId: string) => ipcRenderer.invoke('emails:generate-draft', emailId),
    markRead: (emailId: string, isRead: boolean) =>
      ipcRenderer.invoke('emails:mark-read', emailId, isRead),
    archive: (emailId: string) => ipcRenderer.invoke('emails:archive', emailId)
  },
  schedule: {
    today: () => ipcRenderer.invoke('schedule:today'),
    createEvent: (input: Record<string, unknown>) =>
      ipcRenderer.invoke('schedule:create-event', input)
  },
  tasks: {
    today: () => ipcRenderer.invoke('tasks:today'),
    complete: (taskId: string) => ipcRenderer.invoke('tasks:complete', taskId)
  },
  health: {
    status: () => ipcRenderer.invoke('health:status')
  },
  auth: {
    microsoftSignIn: () => ipcRenderer.invoke('auth:microsoft-signin'),
    microsoftStatus: () => ipcRenderer.invoke('auth:microsoft-status')
  },
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    update: (settings: Record<string, unknown>) => ipcRenderer.invoke('settings:update', settings),
    getContext: () => ipcRenderer.invoke('settings:get-context'),
    saveContext: (content: string) => ipcRenderer.invoke('settings:save-context', content),
    resetContext: () => ipcRenderer.invoke('settings:reset-context')
  },
  chat: {
    send: (message: string) => ipcRenderer.invoke('chat:send', message),
    history: () => ipcRenderer.invoke('chat:history'),
    clear: () => ipcRenderer.invoke('chat:clear'),
    onChunk: (callback: (chunk: string) => void) => {
      ipcRenderer.on('chat:chunk', (_event, chunk) => callback(chunk))
      return () => { ipcRenderer.removeAllListeners('chat:chunk') }
    },
    onToolCall: (callback: (data: unknown) => void) => {
      ipcRenderer.on('chat:tool-call', (_event, data) => callback(data))
      return () => { ipcRenderer.removeAllListeners('chat:tool-call') }
    },
    onDone: (callback: () => void) => {
      ipcRenderer.on('chat:done', () => callback())
      return () => { ipcRenderer.removeAllListeners('chat:done') }
    }
  },
  agent: {
    pendingApprovals: () => ipcRenderer.invoke('agent:pending-approvals'),
    approve: (id: string, editedDataJson?: string) =>
      ipcRenderer.invoke('agent:approve', id, editedDataJson),
    reject: (id: string) => ipcRenderer.invoke('agent:reject', id),
    sessions: () => ipcRenderer.invoke('agent:sessions'),
    sessionActions: (id: string) => ipcRenderer.invoke('agent:session-actions', id),
    runNow: () => ipcRenderer.invoke('agent:run-now'),
    onActivity: (callback: (activity: unknown) => void) => {
      ipcRenderer.on('agent:activity', (_event, activity) => callback(activity))
      return () => {
        ipcRenderer.removeAllListeners('agent:activity')
      }
    }
  },
  goals: {
    list: (): Promise<{ goals: Array<{ id: string; title: string; description: string; enabled: number; last_status: string | null; schedule: string }> }> =>
      ipcRenderer.invoke('goals:list'),
    update: (id: string, updates: { enabled?: number }): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('goals:update', id, updates),
  },
  meetings: {
    list: () => ipcRenderer.invoke('meetings:list'),
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore
  window.api = api
}
