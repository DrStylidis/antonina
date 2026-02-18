import { cn } from '@/lib/utils'
import { MapPin, Monitor, Lightbulb } from 'lucide-react'
import type { CalendarEvent } from '@/types'

interface EventCardProps {
  event: CalendarEvent
  index: number
  visibleCount: number
}

const AVATAR_COLORS = [
  'bg-blue-500/20 text-blue-400',
  'bg-emerald-500/20 text-emerald-400',
  'bg-purple-500/20 text-purple-400',
  'bg-amber-500/20 text-amber-400',
  'bg-pink-500/20 text-pink-400'
]

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('en-SE', { hour: '2-digit', minute: '2-digit' })
}

export function EventCard({ event, index, visibleCount }: EventCardProps) {
  const start = formatTime(event.startTime)
  const end = formatTime(event.endTime)

  return (
    <div
      className={cn(
        'rounded-xl bg-card border border-border/50 p-4 hover:bg-zinc-800 hover:border-border hover:shadow-lg hover:shadow-black/20 transition-all duration-200',
        index < visibleCount ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'
      )}
    >
      {/* Time */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[14px] font-mono text-amber-500 font-medium">
          {start} – {end}
        </span>
      </div>

      {/* Title */}
      <h3 className="text-[15px] font-semibold">{event.title}</h3>

      {/* Location */}
      {event.location && (
        <div className="flex items-center gap-1.5 mt-2">
          {event.isOnline ? (
            <Monitor className="w-3.5 h-3.5 text-zinc-500" />
          ) : (
            <MapPin className="w-3.5 h-3.5 text-zinc-500" />
          )}
          <span className="text-[13px] text-zinc-400">{event.location}</span>
        </div>
      )}

      {/* Attendees */}
      {event.attendees.length > 0 && (
        <div className="flex items-center gap-1 mt-3">
          {event.attendees.slice(0, 5).map((name, i) => (
            <div
              key={i}
              className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold -ml-1 first:ml-0 ring-2 ring-card',
                AVATAR_COLORS[i % AVATAR_COLORS.length]
              )}
              title={name}
            >
              {name.charAt(0)}
            </div>
          ))}
          {event.attendees.length > 5 && (
            <span className="text-[11px] text-zinc-500 ml-1">
              +{event.attendees.length - 5}
            </span>
          )}
        </div>
      )}

      {/* Prep note */}
      {event.prepNote && (
        <div className="mt-3 rounded-lg bg-zinc-800/50 px-3 py-2 flex items-start gap-2">
          <Lightbulb className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
          <p className="text-[13px] text-zinc-400 leading-relaxed">{event.prepNote}</p>
        </div>
      )}
    </div>
  )
}
