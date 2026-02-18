import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Send, Pencil, X, Bot, Loader2 } from 'lucide-react'
import type { EmailDraft } from '@/types'

interface DraftPanelProps {
  draft?: EmailDraft
  emailId: string
  onDraftGenerated?: (draft: EmailDraft) => void
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  approved: 'bg-green-500/10 text-green-400 border-green-500/20',
  sent: 'bg-green-500/10 text-green-400 border-green-500/20',
  rejected: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
}

export function DraftPanel({ draft, emailId, onDraftGenerated }: DraftPanelProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [content, setContent] = useState(draft?.content ?? '')
  const [status, setStatus] = useState(draft?.status ?? 'pending')
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    if (draft) {
      setContent(draft.content)
      setStatus(draft.status)
    }
  }, [draft])

  if (!draft) {
    return (
      <div className="rounded-xl bg-zinc-900/50 border border-border/30 p-4 mt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-zinc-500">
            <Bot className="w-4 h-4" />
            <p className="text-[13px]">No draft generated for this email</p>
          </div>
          <Button
            size="sm"
            className="text-[12px] h-8"
            disabled={generating}
            onClick={async () => {
              setGenerating(true)
              setActionError(null)
              const result = await window.api.emails.generateDraft(emailId)
              setGenerating(false)
              if (result.error) {
                setActionError(result.error)
              } else if (result.draft && onDraftGenerated) {
                onDraftGenerated(result.draft)
              }
            }}
          >
            {generating ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Bot className="w-3.5 h-3.5 mr-1.5" />}
            {generating ? 'Generating...' : 'Generate Draft'}
          </Button>
        </div>
        {actionError && <p className="text-[12px] text-red-400 mt-2">{actionError}</p>}
      </div>
    )
  }

  async function handleApproveAndSend() {
    setActionLoading(true)
    setActionError(null)
    const approveResult = await window.api.emails.approveDraft(draft!.id, content)
    if (approveResult.error) {
      setActionError(approveResult.error)
      setActionLoading(false)
      return
    }
    const sendResult = await window.api.emails.send(draft!.id)
    setActionLoading(false)
    if (sendResult.error) {
      setActionError(sendResult.error)
    } else {
      setStatus('sent')
    }
  }

  async function handleSkip() {
    setActionLoading(true)
    setActionError(null)
    const result = await window.api.emails.rejectDraft(draft!.id)
    setActionLoading(false)
    if (result.error) {
      setActionError(result.error)
    } else {
      setStatus('rejected')
    }
  }

  async function handleEditDone() {
    if (isEditing) {
      // Save edits to backend
      setActionLoading(true)
      const result = await window.api.emails.approveDraft(draft!.id, content)
      setActionLoading(false)
      if (result.error) {
        setActionError(result.error)
        return
      }
    }
    setIsEditing(!isEditing)
  }

  return (
    <div className="rounded-xl bg-zinc-900/50 border border-border/30 p-4 mt-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-primary" />
          <span className="text-[13px] font-medium text-zinc-300">AI Draft Reply</span>
        </div>
        <Badge className={cn('text-[11px]', STATUS_STYLES[status])}>
          {status}
        </Badge>
      </div>

      {isEditing ? (
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          className="w-full bg-zinc-800 border border-border rounded-lg p-3 text-[14px] text-zinc-300 leading-relaxed resize-none focus:outline-none focus:ring-1 focus:ring-primary min-h-[120px]"
          rows={6}
        />
      ) : (
        <div className="text-[14px] text-zinc-400 leading-relaxed whitespace-pre-wrap bg-zinc-800/50 rounded-lg p-3">
          {content}
        </div>
      )}

      {draft.note && (
        <p className="text-[12px] text-zinc-600 mt-2 italic">{draft.note}</p>
      )}

      {actionError && (
        <p className="text-[12px] text-red-400 mt-2">{actionError}</p>
      )}

      {status === 'pending' && (
        <div className="flex items-center gap-2 mt-3">
          <Button
            size="sm"
            className="bg-green-600 hover:bg-green-700 active:scale-95 text-white text-[12px] h-8 transition-all duration-150"
            onClick={handleApproveAndSend}
            disabled={actionLoading}
          >
            {actionLoading ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Send className="w-3.5 h-3.5 mr-1.5" />}
            Approve & Send
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-[12px] h-8 active:scale-95 transition-all duration-150"
            onClick={handleEditDone}
            disabled={actionLoading}
          >
            <Pencil className="w-3.5 h-3.5 mr-1.5" />
            {isEditing ? 'Done' : 'Edit'}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-zinc-500 text-[12px] h-8 active:scale-95 transition-all duration-150"
            onClick={handleSkip}
            disabled={actionLoading}
          >
            <X className="w-3.5 h-3.5 mr-1.5" />
            Skip
          </Button>
        </div>
      )}

      {status === 'sent' && (
        <p className="text-[12px] text-green-500 mt-2">Reply sent successfully</p>
      )}
    </div>
  )
}
