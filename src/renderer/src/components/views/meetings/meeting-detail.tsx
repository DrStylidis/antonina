import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { FileText, Calendar, Users } from 'lucide-react'
import type { GranolaMeeting } from '@/types'

interface MeetingDetailProps {
  meeting: GranolaMeeting | null
}

function formatFullDate(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-SE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function MeetingDetail({ meeting }: MeetingDetailProps) {
  if (!meeting) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <FileText className="w-10 h-10 text-zinc-700" />
        <p className="text-[14px] text-zinc-600">Select a meeting to view its analysis</p>
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-5">
        {/* Header */}
        <div className="space-y-3">
          <h2 className="text-[15px] font-semibold leading-tight text-foreground">
            {meeting.title}
          </h2>

          <div className="flex items-center gap-3 text-zinc-500">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              <span className="text-[12px]">{formatFullDate(meeting.date)}</span>
            </div>
            {meeting.durationMinutes !== null && (
              <span className="text-[12px]">
                {meeting.durationMinutes} min
              </span>
            )}
          </div>

          {/* Participants */}
          {meeting.participants.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-zinc-500">
                <Users className="w-3.5 h-3.5" />
                <span className="text-[12px] font-medium">
                  {meeting.participants.length} attendee{meeting.participants.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {meeting.participants.map((participant, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center px-2 py-0.5 rounded-md bg-zinc-800 border border-border/50 text-[11px] text-zinc-400"
                  >
                    {participant}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <Separator className="my-4" />

        {/* Body - Granola panel HTML */}
        {meeting.panelHtml ? (
          <div className="prose-granola">
            <style>{`
              .prose-granola h3 {
                font-size: 14px;
                font-weight: 600;
                color: #e4e4e7;
                margin-top: 16px;
                margin-bottom: 8px;
              }
              .prose-granola h3:first-child {
                margin-top: 0;
              }
              .prose-granola ul {
                list-style-type: disc;
                padding-left: 16px;
              }
              .prose-granola li {
                margin-bottom: 4px;
                color: #a1a1aa;
                font-size: 13px;
                line-height: 1.6;
              }
              .prose-granola li ul {
                margin-top: 4px;
              }
              .prose-granola strong,
              .prose-granola b {
                font-weight: 600;
                color: #d4d4d8;
              }
              .prose-granola p {
                margin-bottom: 8px;
                color: #a1a1aa;
                font-size: 13px;
                line-height: 1.6;
              }
            `}</style>
            <div dangerouslySetInnerHTML={{ __html: meeting.panelHtml }} />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <FileText className="w-8 h-8 text-zinc-700" />
            <p className="text-[13px] text-zinc-600">No analysis available for this meeting</p>
          </div>
        )}
      </div>
    </ScrollArea>
  )
}
