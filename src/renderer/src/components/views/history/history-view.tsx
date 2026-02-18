import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { ChevronRight, Mail, Calendar, CheckSquare, Clock } from 'lucide-react'
import type { Briefing } from '@/types'

export function HistoryView() {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [briefings, setBriefings] = useState<Briefing[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    window.api.briefing.history().then((result) => {
      setBriefings(result.briefings ?? [])
      setLoading(false)
    })
  }, [])

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="max-w-3xl space-y-3">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-500 mb-3">
          Past Briefings
        </h3>
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl bg-card border border-border/50 p-4 animate-pulse">
            <div className="h-3 bg-zinc-800 rounded w-32 mb-2" />
            <div className="h-4 bg-zinc-800 rounded w-64" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="max-w-3xl space-y-3">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-500 mb-3">
        Past Briefings
      </h3>

      {briefings.length === 0 ? (
        <div className="text-center py-12">
          <Clock className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
          <p className="text-[14px] text-zinc-500">No briefings generated yet</p>
          <p className="text-[12px] text-zinc-600 mt-1">
            Go to the Briefing tab and generate your first one
          </p>
        </div>
      ) : (
        briefings.map((briefing) => {
          const isExpanded = expandedId === briefing.id

          return (
            <div
              key={briefing.id}
              className="rounded-xl bg-card border border-border/50 overflow-hidden transition-colors hover:bg-zinc-800/50"
            >
              <button
                onClick={() => setExpandedId(isExpanded ? null : briefing.id)}
                className="w-full text-left p-4"
              >
                <div className="flex items-start gap-3">
                  <ChevronRight
                    className={cn(
                      'w-4 h-4 text-zinc-500 mt-0.5 shrink-0 transition-transform duration-200',
                      isExpanded && 'rotate-90'
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] text-zinc-500">
                      {formatDate(briefing.generatedAt)}
                    </p>
                    <p className="text-[15px] font-semibold mt-1">{briefing.headline}</p>

                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex items-center gap-1 text-[12px] text-zinc-500">
                        <Mail className="w-3 h-3" />
                        {briefing.stats.emailsProcessed} emails
                      </div>
                      <div className="flex items-center gap-1 text-[12px] text-zinc-500">
                        <Calendar className="w-3 h-3" />
                        {briefing.stats.meetingsToday} meetings
                      </div>
                      <div className="flex items-center gap-1 text-[12px] text-zinc-500">
                        <CheckSquare className="w-3 h-3" />
                        {briefing.stats.tasksDue} tasks
                      </div>
                      {briefing.stats.tasksOverdue > 0 && (
                        <Badge className="bg-red-500/10 text-red-400 border-red-500/20 text-[10px] h-4">
                          {briefing.stats.tasksOverdue} overdue
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </button>

              {isExpanded && briefing.sections.length > 0 && (
                <div className="border-t border-border/50 px-4 py-3 space-y-2">
                  {briefing.sections.flatMap((section) =>
                    section.items.map((item, i) => (
                      <div
                        key={`${section.type}-${i}`}
                        className="flex items-start gap-2 py-1.5"
                      >
                        <Badge variant="outline" className="text-[10px] h-4 mt-0.5 shrink-0">
                          {item.source}
                        </Badge>
                        <div>
                          <p className="text-[13px] font-medium">{item.title}</p>
                          <p className="text-[12px] text-zinc-500">{item.body}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {isExpanded && briefing.sections.length === 0 && (
                <div className="border-t border-border/50 px-4 py-3">
                  <p className="text-[13px] text-zinc-600 italic">
                    Full briefing data not available
                  </p>
                </div>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}
