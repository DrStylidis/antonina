import { useState } from 'react'
import { cn } from '@/lib/utils'
import { ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { BriefingItem } from '@/types'

interface LowPrioritySectionProps {
  items: BriefingItem[]
}

export function LowPrioritySection({ items }: LowPrioritySectionProps) {
  const [expanded, setExpanded] = useState(false)

  if (items.length === 0) return null

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 group cursor-pointer"
      >
        <ChevronRight
          className={cn(
            'w-3.5 h-3.5 text-zinc-500 transition-transform duration-200',
            expanded && 'rotate-90'
          )}
        />
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-500 group-hover:text-zinc-400">
          Low Priority
        </h3>
        <Badge variant="outline" className="text-[10px] h-4 px-1.5">
          {items.length}
        </Badge>
      </button>

      {expanded && (
        <div className="mt-3 space-y-2">
          {items.map((item, i) => (
            <div
              key={i}
              className="rounded-lg bg-card/50 border border-border/30 px-4 py-3 hover:bg-zinc-800/50 transition-colors"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-medium text-zinc-300">{item.title}</p>
                  <p className="text-[13px] text-zinc-500 mt-0.5 truncate">{item.body}</p>
                </div>
                <Badge variant="outline" className="text-[11px] shrink-0">
                  {item.source}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
