import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import type { BriefingItem } from '@/types'

interface TasksSectionProps {
  items: BriefingItem[]
  visibleCount: number
  offset?: number
}

export function TasksSection({ items, visibleCount, offset = 0 }: TasksSectionProps) {
  if (items.length === 0) return null

  return (
    <div>
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-500 mb-3">
        Tasks
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {items.map((item, i) => (
          <div
            key={i}
            className={cn(
              'rounded-xl bg-card border border-border/50 p-4 transition-all duration-200 hover:bg-zinc-800',
              item.urgency === 'urgent' ? 'border-l-2 border-l-red-500' : 'border-l-2 border-l-emerald-500',
              i + offset < visibleCount ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-[15px] font-semibold">{item.title}</p>
              {item.urgency === 'urgent' && (
                <Badge className="bg-red-500/10 text-red-400 border-red-500/20 text-[11px] shrink-0">
                  Urgent
                </Badge>
              )}
            </div>
            <p className="text-[14px] text-zinc-400 leading-relaxed mt-1">{item.body}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
