import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import type { BriefingItem } from '@/types'

interface PrioritySectionProps {
  items: BriefingItem[]
  visibleCount: number
}

export function PrioritySection({ items, visibleCount }: PrioritySectionProps) {
  if (items.length === 0) return null

  return (
    <div>
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-500 mb-3">
        Priority
      </h3>
      <div className="space-y-3">
        {items.map((item, i) => (
          <div
            key={i}
            className={cn(
              'rounded-xl bg-card border border-border/50 p-4 transition-all duration-200 hover:bg-zinc-800 hover:border-border hover:shadow-lg hover:shadow-black/20',
              item.urgency === 'urgent' ? 'border-l-2 border-l-red-500' : 'border-l-2 border-l-blue-500',
              i < visibleCount ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-semibold">{item.title}</p>
                <p className="text-[14px] text-zinc-400 leading-relaxed mt-1">{item.body}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="outline" className="text-[11px]">
                  {item.source}
                </Badge>
                {item.urgency === 'urgent' && (
                  <Badge className="bg-red-500/10 text-red-400 border-red-500/20 text-[11px]">
                    Urgent
                  </Badge>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
