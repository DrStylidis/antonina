import { useState, useEffect } from 'react'
import { EmailList } from './email-list'
import { EmailDetail } from './email-detail'
import { EmailListSkeleton } from '@/components/shared/loading-skeleton'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Email } from '@/types'

export function EmailsView() {
  const [emails, setEmails] = useState<Email[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function fetchEmails() {
    setLoading(true)
    setError(null)
    const result = await window.api.emails.fetch()
    if (result.error) setError(result.error)
    setEmails(result.emails ?? [])
    if (result.emails?.length > 0 && !selectedId) {
      setSelectedId(result.emails[0].id)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchEmails()
  }, [])

  const selectedEmail = emails.find((e) => e.id === selectedId) ?? null

  return (
    <div className="flex h-[calc(100vh-48px-48px)]">
      {/* Left panel - Email list */}
      <div className="w-[40%] border-r border-border/50">
        {loading ? (
          <EmailListSkeleton />
        ) : error && emails.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <AlertTriangle className="w-8 h-8 text-amber-500 mb-3" />
            <p className="text-[13px] text-zinc-400 mb-3">{error}</p>
            <Button size="sm" variant="outline" onClick={fetchEmails}>
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Retry
            </Button>
          </div>
        ) : (
          <EmailList
            emails={emails}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onRefresh={fetchEmails}
          />
        )}
      </div>

      {/* Right panel - Email detail */}
      <div className="w-[60%]">
        <EmailDetail
          key={selectedEmail?.id ?? 'none'}
          email={selectedEmail}
          onEmailUpdated={(updated) => {
            setEmails(prev => prev.map(e => e.id === updated.id ? updated : e))
          }}
        />
      </div>
    </div>
  )
}
