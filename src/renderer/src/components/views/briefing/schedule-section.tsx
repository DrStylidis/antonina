import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import type { BriefingItem } from '@/types'

interface ScheduleSectionProps {
  items: BriefingItem[]
  tomorrowItems?: BriefingItem[]
  visibleCount: number
  offset?: number
}

function TimelineItem({ item, index, isLast, visibleCount }: {
  item: BriefingItem
  index: number
  isLast: boolean
  visibleCount: number
}) {
  return (
    <div
      className={cn(
        'flex gap-4 transition-all duration-200',
        index < visibleCount ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'
      )}
    >
      {/* Time column */}
      <div className="w-14 shrink-0 pt-4 text-right">
        <span className="text-[13px] font-mono text-amber-500">{item.time}</span>
      </div>

      {/* Timeline line */}
      <div className="flex flex-col items-center shrink-0">
        <div className="w-2 h-2 rounded-full bg-amber-500 mt-5" />
        {!isLast && (
          <div className="w-px flex-1 bg-zinc-800" />
        )}
      </div>

      {/* Content card */}
      <div className="flex-1 pb-3">
        <div className="rounded-xl bg-card border border-border/50 p-4 hover:bg-zinc-800 transition-colors">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[15px] font-semibold">{item.title}</p>
            <Badge variant="outline" className="text-[11px] shrink-0">
              {item.source}
            </Badge>
          </div>
          <p className="text-[14px] text-zinc-400 leading-relaxed mt-1">{item.body}</p>
        </div>
      </div>
    </div>
  )
}

export function ScheduleSection({ items, tomorrowItems = [], visibleCount, offset = 0 }: ScheduleSectionProps) {
  if (items.length === 0 && tomorrowItems.length === 0) return null

  const hasBothDays = items.length > 0 && tomorrowItems.length > 0

  return (
    <div>
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-500 mb-3">
        Schedule
      </h3>

      {/* Today */}
      {items.length > 0 && (
        <div>
          {hasBothDays && (
            <p className="text-[12px] font-semibold text-amber-400 mb-2 ml-[4.5rem]">Today</p>
          )}
          <div className="space-y-0">
            {items.map((item, i) => (
              <TimelineItem
                key={`today-${i}`}
                item={item}
                index={i + offset}
                isLast={i === items.length - 1 && tomorrowItems.length === 0}
                visibleCount={visibleCount}
              />
            ))}
          </div>
        </div>
      )}

      {/* Tomorrow */}
      {tomorrowItems.length > 0 && (
        <div className={items.length > 0 ? 'mt-4' : ''}>
          {hasBothDays && (
            <p className="text-[12px] font-semibold text-blue-400 mb-2 ml-[4.5rem]">Tomorrow</p>
          )}
          {!hasBothDays && items.length === 0 && (
            <p className="text-[12px] font-semibold text-blue-400 mb-2 ml-[4.5rem]">Tomorrow</p>
          )}
          <div className="space-y-0">
            {tomorrowItems.map((item, i) => (
              <TimelineItem
                key={`tomorrow-${i}`}
                item={item}
                index={i + offset + items.length}
                isLast={i === tomorrowItems.length - 1}
                visibleCount={visibleCount}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
