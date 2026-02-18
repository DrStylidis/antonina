import { useState, useEffect } from 'react'
import { Sidebar, type View } from '@/components/layout/sidebar'
import { ViewTransition } from '@/components/layout/view-transition'
import { ErrorBoundary } from '@/components/shared/error-boundary'
import { BriefingView } from '@/components/views/briefing/briefing-view'
import { EmailsView } from '@/components/views/emails/emails-view'
import { ScheduleView } from '@/components/views/schedule/schedule-view'
import { TasksView } from '@/components/views/tasks/tasks-view'
import { HistoryView } from '@/components/views/history/history-view'
import { SettingsView } from '@/components/views/settings/settings-view'
import { ActivityView } from '@/components/views/activity/activity-view'
import { MeetingsView } from '@/components/views/meetings/meetings-view'
import { Toaster } from 'sonner'

const VIEW_TITLES: Record<View, string> = {
  briefing: 'Morning Briefing',
  emails: 'Email Triage',
  schedule: 'Today\'s Schedule',
  tasks: 'Tasks',
  meetings: 'Meeting Notes',
  history: 'Briefing History',
  activity: 'Agent Activity',
  settings: 'Settings'
}

function renderView(view: View) {
  switch (view) {
    case 'briefing':
      return <BriefingView />
    case 'emails':
      return <EmailsView />
    case 'schedule':
      return <ScheduleView />
    case 'tasks':
      return <TasksView />
    case 'meetings':
      return <MeetingsView />
    case 'history':
      return <HistoryView />
    case 'activity':
      return <ActivityView />
    case 'settings':
      return <SettingsView />
  }
}

export default function App() {
  const [activeView, setActiveView] = useState<View>('briefing')
  const [pendingApprovals, setPendingApprovals] = useState(0)

  useEffect(() => {
    // Initial fetch
    window.api.agent.pendingApprovals().then((items) => setPendingApprovals(items.length)).catch(() => {})
    // Poll every 10 seconds
    const interval = setInterval(() => {
      window.api.agent.pendingApprovals().then((items) => setPendingApprovals(items.length)).catch(() => {})
    }, 10000)
    return () => clearInterval(interval)
  }, [])

  return (
    <ErrorBoundary>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar activeView={activeView} onNavigate={setActiveView} pendingApprovals={pendingApprovals} />
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Title bar / drag region */}
          <div
            className="h-12 flex items-center px-6 border-b border-border/50 shrink-0"
            style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
          >
            <h1 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-500">
              {VIEW_TITLES[activeView]}
            </h1>
          </div>

          {/* Content area */}
          <div className="flex-1 overflow-y-auto">
            <ViewTransition viewKey={activeView}>
              <ErrorBoundary>
                {activeView === 'emails' || activeView === 'meetings' ? (
                  renderView(activeView)
                ) : (
                  <div className="p-6">
                    {renderView(activeView)}
                  </div>
                )}
              </ErrorBoundary>
            </ViewTransition>
          </div>
        </main>
      </div>
      <Toaster
        theme="dark"
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#18181b',
            border: '1px solid rgba(63, 63, 70, 0.5)',
            color: '#fafafa'
          }
        }}
      />
    </ErrorBoundary>
  )
}
