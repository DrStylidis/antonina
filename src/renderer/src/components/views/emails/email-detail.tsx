import { useState } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { Paperclip, Clock, MailOpen, Mail, Archive, Loader2 } from 'lucide-react'
import { DraftPanel } from './draft-panel'
import type { Email, EmailDraft } from '@/types'

interface EmailDetailProps {
  email: Email | null
  onEmailUpdated?: (email: Email) => void
}

export function EmailDetail({ email, onEmailUpdated }: EmailDetailProps) {
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [currentDraft, setCurrentDraft] = useState<EmailDraft | undefined>(email?.draft)
  const [archived, setArchived] = useState(false)

  if (!email) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-[14px] text-zinc-600">Select an email to view</p>
      </div>
    )
  }

  if (archived) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-[14px] text-zinc-500">Email archived</p>
      </div>
    )
  }

  const formattedDate = new Date(email.receivedAt).toLocaleString('en-SE', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })

  async function handleMarkRead() {
    setActionLoading('read')
    setActionError(null)
    const newReadState = !email!.isRead
    const result = await window.api.emails.markRead(email!.id, newReadState)
    setActionLoading(null)
    if (result.error) {
      setActionError(result.error)
    } else if (onEmailUpdated) {
      onEmailUpdated({ ...email!, isRead: newReadState })
    }
  }

  async function handleArchive() {
    setActionLoading('archive')
    setActionError(null)
    const result = await window.api.emails.archive(email!.id)
    setActionLoading(null)
    if (result.error) {
      setActionError(result.error)
    } else {
      setArchived(true)
    }
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-5">
        {/* Header */}
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h2 className="text-[18px] font-semibold leading-tight">{email.subject}</h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <span className="text-[13px] font-semibold text-primary">
                {email.fromName.charAt(0)}
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-medium">{email.fromName}</p>
              <p className="text-[12px] text-zinc-500">{email.fromAddress}</p>
            </div>

            <div className="flex items-center gap-1.5 text-zinc-500 shrink-0">
              {email.hasAttachments && <Paperclip className="w-3.5 h-3.5" />}
              <Clock className="w-3.5 h-3.5" />
              <span className="text-[12px]">{formattedDate}</span>
            </div>
          </div>
        </div>

        {/* Action bar */}
        <div className="flex items-center gap-2 mt-3">
          <Button
            size="sm"
            variant="outline"
            className="text-[12px] h-8"
            onClick={handleMarkRead}
            disabled={actionLoading !== null}
          >
            {actionLoading === 'read' ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : email.isRead ? (
              <Mail className="w-3.5 h-3.5 mr-1.5" />
            ) : (
              <MailOpen className="w-3.5 h-3.5 mr-1.5" />
            )}
            {email.isRead ? 'Mark Unread' : 'Mark Read'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-[12px] h-8"
            onClick={handleArchive}
            disabled={actionLoading !== null}
          >
            {actionLoading === 'archive' ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <Archive className="w-3.5 h-3.5 mr-1.5" />
            )}
            Archive
          </Button>
        </div>

        {actionError && (
          <p className="text-[12px] text-red-400 mt-2">{actionError}</p>
        )}

        <Separator className="my-4" />

        {/* Body */}
        <div className="text-[14px] text-zinc-300 leading-relaxed whitespace-pre-wrap">
          {email.body}
        </div>

        {/* Draft panel */}
        <DraftPanel
          draft={currentDraft ?? email.draft}
          emailId={email.id}
          onDraftGenerated={(draft) => setCurrentDraft(draft)}
        />
      </div>
    </ScrollArea>
  )
}
