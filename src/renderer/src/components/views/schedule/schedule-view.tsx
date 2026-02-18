import { useState, useEffect, useCallback } from 'react'
import { useStaggeredEntrance } from '@/hooks/use-staggered-entrance'
import { Calendar, AlertTriangle, RefreshCw } from 'lucide-react'
import { EventCard } from './event-card'
import { CalendarChat } from './calendar-chat'
import { ScheduleSkeleton } from '@/components/shared/loading-skeleton'
import { Button } from '@/components/ui/button'
import type { CalendarEvent } from '@/types'

export function ScheduleView() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSchedule = useCallback(async () => {
    setLoading(true)
    setError(null)
    const result = await window.api.schedule.today()
    if (result.error) setError(result.error)
    setEvents(result.events ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchSchedule()
  }, [fetchSchedule])

  const refreshEvents = useCallback(async () => {
    const result = await window.api.schedule.today()
    if (!result.error) setEvents(result.events ?? [])
  }, [])

  const now = new Date()
  const todayStr = now.toDateString()
  const todayEvents = events.filter(e => new Date(e.startTime).toDateString() === todayStr)
  const tomorrowEvents = events.filter(e => new Date(e.startTime).toDateString() !== todayStr)

  const visibleCount = useStaggeredEntrance(events.length)

  const todayLabel = now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  })

  const tmrw = new Date(now)
  tmrw.setDate(tmrw.getDate() + 1)
  const tomorrowLabel = tmrw.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  })

  if (loading) return <ScheduleSkeleton />

  return (
    <div className="flex flex-col h-full">
      {/* Events list */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl">
          {error && (
            <div className="flex items-center gap-2 text-amber-400 text-[13px] bg-amber-500/10 rounded-lg px-3 py-2 mb-4">
              <AlertTriangle className="w-4 h-4" />
              {error}
            </div>
          )}

          {/* Today section */}
          <div className="flex items-center gap-3 mb-4">
            <Calendar className="w-5 h-5 text-primary" />
            <h2 className="text-[20px] font-semibold">Today</h2>
            <span className="text-[13px] text-zinc-500">{todayLabel}</span>
            <span className="text-[12px] text-zinc-600">{todayEvents.length} events</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={fetchSchedule}
              className="ml-auto text-zinc-500 h-7"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          </div>

          {todayEvents.length === 0 ? (
            <div className="text-center py-8 mb-6">
              <p className="text-[14px] text-zinc-500">No events scheduled for today</p>
            </div>
          ) : (
            <div className="space-y-3 mb-6">
              {todayEvents.map((event, i) => (
                <EventCard key={event.id} event={event} index={i} visibleCount={visibleCount} />
              ))}
            </div>
          )}

          {/* Tomorrow section */}
          {tomorrowEvents.length > 0 && (
            <>
              <div className="flex items-center gap-3 mb-4">
                <Calendar className="w-5 h-5 text-zinc-500" />
                <h2 className="text-[17px] font-semibold text-zinc-400">Tomorrow</h2>
                <span className="text-[13px] text-zinc-600">{tomorrowLabel}</span>
                <span className="text-[12px] text-zinc-600">{tomorrowEvents.length} events</span>
              </div>
              <div className="space-y-3 mb-4">
                {tomorrowEvents.map((event, i) => (
                  <EventCard key={event.id} event={event} index={todayEvents.length + i} visibleCount={visibleCount} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Embedded chat panel */}
      <CalendarChat onEventsChanged={refreshEvents} />
    </div>
  )
}
