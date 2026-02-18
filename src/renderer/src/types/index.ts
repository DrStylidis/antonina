// === Window API (exposed by preload) ===

interface ApiResult<T> {
  error?: string
  [key: string]: T | string | undefined
}

interface WindowApi {
  briefing: {
    generate: () => Promise<ApiResult<Briefing> & { briefing?: Briefing }>
    latest: () => Promise<{ briefing: Briefing | null }>
    history: () => Promise<{ briefings: Briefing[] }>
    onProgress: (callback: (step: string) => void) => () => void
  }
  emails: {
    fetch: () => Promise<{ emails: Email[]; error?: string }>
    approveDraft: (draftId: string, content: string) => Promise<{ success?: boolean; error?: string }>
    send: (draftId: string) => Promise<{ success?: boolean; error?: string }>
    rejectDraft: (draftId: string) => Promise<{ success?: boolean; error?: string }>
    generateDraft: (emailId: string) => Promise<{ draft?: EmailDraft; error?: string }>
    markRead: (emailId: string, isRead: boolean) => Promise<{ success?: boolean; error?: string }>
    archive: (emailId: string) => Promise<{ success?: boolean; error?: string }>
  }
  schedule: {
    today: () => Promise<{ events: CalendarEvent[]; error?: string }>
    createEvent: (input: CalendarEventInput) => Promise<{ success?: boolean; eventId?: string; error?: string }>
  }
  tasks: {
    today: () => Promise<{ tasks: Task[]; error?: string }>
    complete: (taskId: string) => Promise<{ success?: boolean; error?: string }>
  }
  health: {
    status: () => Promise<HealthStatus>
  }
  auth: {
    microsoftSignIn: () => Promise<{ success?: boolean; error?: string }>
    microsoftStatus: () => Promise<{ configured: boolean; connected: boolean }>
  }
  settings: {
    get: () => Promise<AppSettings>
    update: (settings: Record<string, unknown>) => Promise<{ success?: boolean }>
    getContext: () => Promise<{ content: string }>
    saveContext: (content: string) => Promise<{ success?: boolean }>
  }
  chat: {
    send: (message: string) => Promise<{ response?: string; error?: string; sessionId?: string }>
    history: () => Promise<{ messages: ChatMessage[]; sessionId: string | null }>
    clear: () => Promise<{ sessionId: string }>
    onChunk: (callback: (chunk: string) => void) => () => void
    onToolCall: (callback: (data: ChatToolCall) => void) => () => void
    onDone: (callback: () => void) => () => void
  }
  agent: {
    pendingApprovals: () => Promise<ApprovalItem[]>
    approve: (id: string, editedDataJson?: string) => Promise<{ success?: boolean; error?: string }>
    reject: (id: string) => Promise<{ success?: boolean; error?: string }>
    sessions: () => Promise<AgentSession[]>
    sessionActions: (id: string) => Promise<AgentAction[]>
    runNow: () => Promise<{ success?: boolean; error?: string; sessionId?: string; summary?: string }>
    onActivity: (callback: (activity: AgentActivity) => void) => () => void
  }
  meetings: {
    list: () => Promise<{ meetings: GranolaMeeting[]; error?: string }>
  }
  goals: {
    list: () => Promise<{ goals: Array<{ id: string; title: string; description: string; enabled: number; last_status: string | null; schedule: string }> }>
    update: (id: string, updates: { enabled?: number }) => Promise<{ success: boolean }>
  }
}

declare global {
  interface Window {
    api: WindowApi
  }
}

// === Email Types ===

export type EmailClassification = 'important' | 'normal' | 'noise'

export type DraftStatus = 'pending' | 'approved' | 'sent' | 'rejected'

export interface Email {
  id: string
  fromName: string
  fromAddress: string
  subject: string
  preview: string
  body: string
  receivedAt: string
  isRead: boolean
  classification: EmailClassification
  hasAttachments: boolean
  draft?: EmailDraft
}

export interface EmailDraft {
  id: string
  emailId: string
  content: string
  tone: 'formal' | 'professional' | 'casual'
  confidence: number
  note?: string
  status: DraftStatus
  createdAt: string
}

// === Calendar Types ===

export interface CalendarEvent {
  id: string
  title: string
  startTime: string
  endTime: string
  location?: string
  isOnline: boolean
  isAllDay: boolean
  attendees: string[]
  prepNote?: string
}

export interface CalendarEventInput {
  subject: string
  startDateTime: string
  endDateTime: string
  body?: string
  location?: string
  attendees?: string[]
  isOnlineMeeting?: boolean
}

// === Task Types ===

export interface Task {
  id: string
  name: string
  notes?: string
  dueDate?: string
  project?: string
  tags: string[]
  completed: boolean
  isOverdue: boolean
}

// === Briefing Types ===

export interface BriefingItem {
  title: string
  body: string
  urgency: 'urgent' | 'normal' | 'low'
  time?: string
  source: 'email' | 'calendar' | 'task'
}

export interface BriefingSection {
  type: 'priority' | 'schedule' | 'tasks' | 'low_priority' | 'tomorrow'
  items: BriefingItem[]
}

export interface BriefingStats {
  emailsProcessed: number
  emailsNeedAttention: number
  meetingsToday: number
  tasksDue: number
  tasksOverdue: number
}

export interface Briefing {
  id: string
  generatedAt: string
  headline: string
  sections: BriefingSection[]
  stats: BriefingStats
}

// === Settings Types ===

export interface AppSettings {
  anthropicApiKey: string
  briefingModel: string
  triageModel: string
  draftModel: string
  morningSweedTime: string
  eveningSweedTime: string
  refreshIntervalMinutes: number
  noisePatterns: string[]
  maxDailyCostUsd: number
  autonomyMode?: 'conservative' | 'balanced' | 'executive'
}

// === Health/Status Types ===

export interface SyncStatus {
  lastSync: string | null
  issyncing: boolean
  error?: string
}

export interface HealthStatus {
  outlook: boolean
  things3: boolean
  apiKey: boolean
  lastBriefing: string | null
  dailyCost: number
}

// === Agent Types ===

export interface AgentActivity {
  sessionId: string
  timestamp: string
  type: 'session_start' | 'tool_call' | 'tool_result' | 'decision' | 'approval_needed' | 'session_end' | 'auto_executed'
  tool?: string
  riskLevel?: string
  summary: string
  details?: string
}

export interface AgentSession {
  id: string
  trigger: string
  status: 'running' | 'completed' | 'failed' | 'cancelled'
  started_at: string
  completed_at: string | null
  summary: string | null
  tool_calls: number
  total_cost_usd: number
  errors: string | null
}

export interface AgentAction {
  id: string
  session_id: string
  tool_name: string
  input_json: string | null
  output_json: string | null
  status: 'executed' | 'pending_approval' | 'approved' | 'rejected'
  created_at: string
}

export interface ApprovalItem {
  id: string
  session_id: string
  action_type: string
  title: string
  description: string
  data_json: string
  status: 'pending' | 'approved' | 'rejected'
  risk_level?: string
  created_at: string
  resolved_at: string | null
}

// === Chat Types ===

export interface ChatMessage {
  id: string
  session_id: string
  role: 'user' | 'assistant' | 'tool_result'
  content: string
  tool_calls_json: string | null
  created_at: string
}

export interface ChatToolCall {
  toolName: string
  status: 'start' | 'done' | 'error'
  result?: string
}

// === Granola Meeting Types ===

export interface GranolaMeeting {
  id: string
  title: string
  date: string
  durationMinutes: number | null
  participants: string[]
  panelHtml: string | null
  panelTitle: string | null
  hasTranscript: boolean
}
