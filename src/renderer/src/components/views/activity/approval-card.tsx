import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, XCircle, Clock, Mail, Calendar, Loader2, Pencil } from 'lucide-react'
import type { ApprovalItem } from '@/types'

interface ApprovalCardProps {
  approval: ApprovalItem
  onApprove: (id: string, editedDataJson?: string) => void
  onReject: (id: string) => void
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

function RiskBadge({ level }: { level?: string }) {
  if (!level || level === 'low') return null
  const colors = level === 'high'
    ? 'bg-red-500/10 text-red-400 border-red-500/20'
    : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
  return (
    <Badge className={`${colors} text-[10px] h-5`}>
      {level} risk
    </Badge>
  )
}

function ActionIcon({ type }: { type: string }) {
  switch (type) {
    case 'send_email':
      return <Mail className="w-4 h-4 text-amber-400" />
    case 'create_calendar_event':
      return <Calendar className="w-4 h-4 text-amber-400" />
    default:
      return <Clock className="w-4 h-4 text-amber-400" />
  }
}

function EmailPayload({ data, editing, onBodyChange }: {
  data: Record<string, unknown>
  editing: boolean
  onBodyChange?: (body: string) => void
}) {
  return (
    <div className="space-y-2 text-[13px]">
      <div className="flex gap-2">
        <span className="text-zinc-500 shrink-0 w-16">To:</span>
        <span className="text-zinc-300">{String(data.to ?? data.recipient ?? '')}</span>
      </div>
      <div className="flex gap-2">
        <span className="text-zinc-500 shrink-0 w-16">Subject:</span>
        <span className="text-zinc-300">{String(data.subject ?? '')}</span>
      </div>
      {data.body != null && (
        <div className="flex gap-2">
          <span className="text-zinc-500 shrink-0 w-16">Body:</span>
          {editing ? (
            <textarea
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded-md p-2 text-zinc-300 text-[12px] leading-relaxed resize-y min-h-[80px] focus:outline-none focus:border-amber-500/50"
              value={String(data.body)}
              onChange={(e) => onBodyChange?.(e.target.value)}
              rows={5}
            />
          ) : (
            <span className="text-zinc-400 whitespace-pre-wrap text-[12px] leading-relaxed">
              {String(data.body)}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

function CalendarPayload({ data }: { data: Record<string, unknown> }) {
  return (
    <div className="space-y-2 text-[13px]">
      <div className="flex gap-2">
        <span className="text-zinc-500 shrink-0 w-16">Event:</span>
        <span className="text-zinc-300">{String(data.subject ?? data.title ?? '')}</span>
      </div>
      {data.time && (
        <div className="flex gap-2">
          <span className="text-zinc-500 shrink-0 w-16">Time:</span>
          <span className="text-zinc-300">{String(data.time)}</span>
        </div>
      )}
      {data.start_time && (
        <div className="flex gap-2">
          <span className="text-zinc-500 shrink-0 w-16">Time:</span>
          <span className="text-zinc-300">{String(data.start_time)}{data.end_time ? ` - ${String(data.end_time)}` : ''}</span>
        </div>
      )}
      {data.attendees && (
        <div className="flex gap-2">
          <span className="text-zinc-500 shrink-0 w-16">Guests:</span>
          <span className="text-zinc-300">
            {Array.isArray(data.attendees) ? data.attendees.join(', ') : String(data.attendees)}
          </span>
        </div>
      )}
    </div>
  )
}

function GenericPayload({ data }: { data: Record<string, unknown> }) {
  return (
    <pre className="text-[11px] text-zinc-500 bg-zinc-900 rounded-md p-2 overflow-x-auto">
      {JSON.stringify(data, null, 2)}
    </pre>
  )
}

export function ApprovalCard({ approval, onApprove, onReject }: ApprovalCardProps) {
  const [loading, setLoading] = useState<'approve' | 'reject' | null>(null)
  const [editing, setEditing] = useState(false)

  let initialData: Record<string, unknown> = {}
  try {
    initialData = JSON.parse(approval.data_json)
  } catch {
    // ignore parse errors
  }

  const [editedData, setEditedData] = useState(initialData)

  const isEmail = approval.action_type === 'send_email'

  function handleBodyChange(body: string) {
    setEditedData((prev) => ({ ...prev, body }))
  }

  async function handleApprove() {
    setLoading('approve')
    const edited = isEmail && JSON.stringify(editedData) !== approval.data_json
    onApprove(approval.id, edited ? JSON.stringify(editedData) : undefined)
  }

  async function handleReject() {
    setLoading('reject')
    onReject(approval.id)
  }

  return (
    <Card className="border-l-4 border-l-amber-500 bg-card py-0 gap-0 overflow-hidden">
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <ActionIcon type={approval.action_type} />
            <div className="min-w-0">
              <p className="text-[13px] font-semibold truncate">{approval.title}</p>
              <p className="text-[12px] text-zinc-500">{approval.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <RiskBadge level={approval.risk_level} />
            <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[10px] h-5 shrink-0">
              Pending
            </Badge>
          </div>
        </div>

        {/* Payload */}
        <div className="bg-zinc-900/50 rounded-lg p-3 border border-border/30">
          {isEmail ? (
            <EmailPayload data={editedData} editing={editing} onBodyChange={handleBodyChange} />
          ) : approval.action_type === 'create_calendar_event' ? (
            <CalendarPayload data={editedData} />
          ) : (
            <GenericPayload data={editedData} />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-1">
          <p className="text-[11px] text-zinc-600">
            Requested by agent at {formatTime(approval.created_at)}
          </p>
          <div className="flex items-center gap-2">
            {isEmail && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setEditing(!editing)}
                disabled={loading !== null}
                className="text-zinc-400 border-zinc-600 hover:bg-zinc-800 hover:text-zinc-200 text-[12px] h-7"
              >
                <Pencil className="w-3.5 h-3.5" />
                {editing ? 'Done' : 'Edit'}
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={handleReject}
              disabled={loading !== null}
              className="text-red-400 border-red-500/30 hover:bg-red-500/10 hover:text-red-300 text-[12px] h-7"
            >
              {loading === 'reject' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <XCircle className="w-3.5 h-3.5" />
              )}
              Reject
            </Button>
            <Button
              size="sm"
              onClick={handleApprove}
              disabled={loading !== null}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-[12px] h-7"
            >
              {loading === 'approve' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle className="w-3.5 h-3.5" />
              )}
              Approve
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
