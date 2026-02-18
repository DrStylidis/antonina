import { useState, useEffect } from 'react'
import { MeetingCard } from './meeting-card'
import { MeetingDetail } from './meeting-detail'
import { MeetingListSkeleton } from '@/components/shared/loading-skeleton'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useStaggeredEntrance } from '@/hooks/use-staggered-entrance'
import type { GranolaMeeting } from '@/types'

export function MeetingsView() {
  const [meetings, setMeetings] = useState<GranolaMeeting[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const visibleCount = useStaggeredEntrance(meetings.length)

  async function fetchMeetings() {
    setLoading(true)
    setError(null)
    try {
      const result = await window.api.meetings.list()
      if (result.error) setError(result.error)
      setMeetings(result.meetings ?? [])
      if (result.meetings?.length > 0 && !selectedId) {
        setSelectedId(result.meetings[0].id)
      }
    } catch (err) {
      setError('Failed to load meetings')
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchMeetings()
  }, [])

  const selectedMeeting = meetings.find((m) => m.id === selectedId) ?? null

  return (
    <div className="flex h-[calc(100vh-48px-48px)]">
      {/* Left panel - Meeting list */}
      <div className="w-[35%] border-r border-border/50 flex flex-col">
        {loading ? (
          <MeetingListSkeleton />
        ) : error && meetings.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <AlertTriangle className="w-8 h-8 text-amber-500 mb-3" />
            <p className="text-[13px] text-zinc-400 mb-3">{error}</p>
            <Button size="sm" variant="outline" onClick={fetchMeetings}>
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Retry
            </Button>
          </div>
        ) : (
          <>
            {/* Header with refresh */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-border/50">
              <span className="text-[12px] font-medium text-zinc-500">
                {meetings.length} meeting{meetings.length !== 1 ? 's' : ''}
              </span>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0"
                onClick={fetchMeetings}
              >
                <RefreshCw className="w-3.5 h-3.5 text-zinc-500" />
              </Button>
            </div>

            {/* Meeting list */}
            <ScrollArea className="flex-1">
              <div className="py-1">
                {meetings.map((meeting, index) => (
                  <MeetingCard
                    key={meeting.id}
                    meeting={meeting}
                    isSelected={selectedId === meeting.id}
                    onSelect={() => setSelectedId(meeting.id)}
                    visible={index < visibleCount}
                  />
                ))}
              </div>
            </ScrollArea>
          </>
        )}
      </div>

      {/* Right panel - Meeting detail */}
      <div className="w-[65%]">
        <MeetingDetail
          key={selectedMeeting?.id ?? 'none'}
          meeting={selectedMeeting}
        />
      </div>
    </div>
  )
}
