import { cn } from '@/lib/utils'
import { Clock, Users, FileText } from 'lucide-react'
import type { GranolaMeeting } from '@/types'

interface MeetingCardProps {
  meeting: GranolaMeeting
  isSelected: boolean
  onSelect: () => void
  visible: boolean
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-SE', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  })
}

function formatDuration(minutes: number | null) {
  if (minutes === null) return null
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

export function MeetingCard({ meeting, isSelected, onSelect, visible }: MeetingCardProps) {
  const hasAnalysis = meeting.panelHtml !== null

  return (
    <button
      onClick={onSelect}
      className={cn(
        'w-full text-left px-3 py-3 border-b border-border/30 transition-all duration-200',
        isSelected
          ? 'bg-primary/10 border-l-2 border-l-primary'
          : 'hover:bg-zinc-800/50 border-l-2 border-l-transparent',
        visible
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 translate-y-1'
      )}
    >
      <div className="flex items-start gap-2.5">
        <div className="flex-1 min-w-0">
          {/* Title */}
          <p className={cn(
            'text-[13px] truncate',
            isSelected ? 'font-semibold text-foreground' : 'font-medium text-zinc-300'
          )}>
            {meeting.title}
          </p>

          {/* Date */}
          <p className="text-[12px] text-zinc-500 mt-0.5">
            {formatDate(meeting.date)}
          </p>

          {/* Meta row */}
          <div className="flex items-center gap-3 mt-1.5">
            {meeting.durationMinutes !== null && (
              <span className="flex items-center gap-1 text-[11px] text-zinc-500">
                <Clock className="w-3 h-3" />
                {formatDuration(meeting.durationMinutes)}
              </span>
            )}

            {meeting.participants.length > 0 && (
              <span className="flex items-center gap-1 text-[11px] text-zinc-500">
                <Users className="w-3 h-3" />
                {meeting.participants.length} attendee{meeting.participants.length !== 1 ? 's' : ''}
              </span>
            )}

            {hasAnalysis && (
              <span className="flex items-center gap-1 text-[11px] text-primary">
                <FileText className="w-3 h-3" />
                <span className="text-[10px]">Analysis</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  )
}
