import { ElectronAPI } from '@electron-toolkit/preload'

interface BriefingAPI {
  generate: () => Promise<unknown>
  latest: () => Promise<unknown>
  history: () => Promise<unknown>
  onProgress: (callback: (step: string) => void) => () => void
}

interface EmailsAPI {
  fetch: () => Promise<unknown>
  approveDraft: (draftId: string, content: string) => Promise<unknown>
  send: (draftId: string) => Promise<unknown>
  rejectDraft: (draftId: string) => Promise<unknown>
}

interface ScheduleAPI {
  today: () => Promise<unknown>
}

interface TasksAPI {
  today: () => Promise<unknown>
}

interface HealthAPI {
  status: () => Promise<unknown>
}

interface SettingsAPI {
  get: () => Promise<unknown>
  update: (settings: Record<string, unknown>) => Promise<unknown>
}

interface AppAPI {
  briefing: BriefingAPI
  emails: EmailsAPI
  schedule: ScheduleAPI
  tasks: TasksAPI
  health: HealthAPI
  settings: SettingsAPI
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: AppAPI
  }
}
