import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Paperclip } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { Email, EmailClassification } from '@/types'

type FilterTab = 'all' | EmailClassification

const FILTER_TABS: { id: FilterTab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'important', label: 'Important' },
  { id: 'normal', label: 'Normal' },
  { id: 'noise', label: 'Noise' }
]

const DOT_COLORS: Record<EmailClassification, string> = {
  important: 'bg-blue-500',
  normal: 'bg-zinc-500',
  noise: 'bg-zinc-700'
}

interface EmailListProps {
  emails: Email[]
  selectedId: string | null
  onSelect: (id: string) => void
  onRefresh?: () => void
}

export function EmailList({ emails, selectedId, onSelect }: EmailListProps) {
  const [filter, setFilter] = useState<FilterTab>('all')

  const filtered = filter === 'all' ? emails : emails.filter(e => e.classification === filter)

  function formatTime(dateStr: string) {
    const d = new Date(dateStr)
    return d.toLocaleTimeString('en-SE', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="flex flex-col h-full">
      {/* Filter tabs */}
      <div className="flex gap-1 px-3 py-2 border-b border-border/50">
        {FILTER_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={cn(
              'px-2.5 py-1 rounded-md text-[12px] font-medium transition-colors',
              filter === tab.id
                ? 'bg-primary/10 text-primary'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Email list */}
      <ScrollArea className="flex-1">
        <div className="py-1">
          {filtered.map(email => (
            <button
              key={email.id}
              onClick={() => onSelect(email.id)}
              className={cn(
                'w-full text-left px-3 py-3 border-b border-border/30 transition-colors',
                selectedId === email.id
                  ? 'bg-blue-500/10'
                  : 'hover:bg-zinc-800/50'
              )}
            >
              <div className="flex items-start gap-2.5">
                {/* Classification dot */}
                <div className={cn('w-2 h-2 rounded-full mt-1.5 shrink-0', DOT_COLORS[email.classification])} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn(
                      'text-[13px] truncate',
                      !email.isRead ? 'font-semibold text-foreground' : 'font-medium text-zinc-400'
                    )}>
                      {email.fromName}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {email.hasAttachments && <Paperclip className="w-3 h-3 text-zinc-500" />}
                      <span className="text-[11px] text-zinc-600">{formatTime(email.receivedAt)}</span>
                    </div>
                  </div>
                  <p className={cn(
                    'text-[12px] truncate mt-0.5',
                    !email.isRead ? 'text-zinc-300' : 'text-zinc-500'
                  )}>
                    {email.subject}
                  </p>
                  <p className="text-[11px] text-zinc-600 truncate mt-0.5">
                    {email.preview.slice(0, 80)}...
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
