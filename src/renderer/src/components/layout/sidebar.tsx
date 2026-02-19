import { cn } from '@/lib/utils'
import {
  Sunrise,
  Mail,
  Calendar,
  CheckSquare,
  FileText,
  MessageSquare,
  Clock,
  Activity,
  Settings
} from 'lucide-react'

export type View = 'briefing' | 'emails' | 'schedule' | 'tasks' | 'meetings' | 'order' | 'history' | 'activity' | 'settings'

const NAV_ITEMS = [
  { id: 'briefing' as const, label: 'Briefing', icon: Sunrise },
  { id: 'emails' as const, label: 'Emails', icon: Mail },
  { id: 'schedule' as const, label: 'Schedule', icon: Calendar },
  { id: 'tasks' as const, label: 'Tasks', icon: CheckSquare },
  { id: 'meetings' as const, label: 'Meetings', icon: FileText },
  { id: 'order' as const, label: 'Order & Plan', icon: MessageSquare },
  { id: 'history' as const, label: 'History', icon: Clock },
  { id: 'activity' as const, label: 'Activity', icon: Activity }
]

const BOTTOM_ITEMS = [
  { id: 'settings' as const, label: 'Settings', icon: Settings }
]

interface SidebarProps {
  activeView: View
  onNavigate: (view: View) => void
  pendingApprovals?: number
}

export function Sidebar({ activeView, onNavigate, pendingApprovals }: SidebarProps) {
  return (
    <div className="w-[220px] flex flex-col h-full border-r border-border/50 shrink-0 select-none">
      {/* Drag region for traffic lights */}
      <div
        className="h-[52px] flex items-end px-4 pb-2"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <span className="text-[13px] font-semibold text-zinc-400 tracking-tight">
          Antonina
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-2 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const isActive = activeView === item.id
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={cn(
                'w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors duration-150',
                isActive
                  ? 'bg-primary/10 text-primary-foreground border-l-2 border-primary'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              )}
              style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            >
              <Icon className={cn('w-4 h-4', isActive ? 'text-primary' : 'text-zinc-500')} />
              {item.label}
              {item.id === 'activity' && pendingApprovals != null && pendingApprovals > 0 && (
                <span className="ml-auto inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-semibold">
                  {pendingApprovals}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {/* Bottom items */}
      <div className="px-2 py-2 border-t border-border/50">
        {BOTTOM_ITEMS.map((item) => {
          const Icon = item.icon
          const isActive = activeView === item.id
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={cn(
                'w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors duration-150',
                isActive
                  ? 'bg-primary/10 text-primary-foreground border-l-2 border-primary'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              )}
              style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            >
              <Icon className={cn('w-4 h-4', isActive ? 'text-primary' : 'text-zinc-500')} />
              {item.label}
            </button>
          )
        })}

        {/* Sync status */}
        <div className="mt-2 px-3 py-1">
          <p className="text-[11px] text-zinc-600">Last sync: just now</p>
          <p className="text-[11px] text-zinc-600">Today: $0.00</p>
        </div>
      </div>
    </div>
  )
}
