import { ipcMain } from 'electron'
import { fetchEmails, sendMail, markEmailRead, archiveEmail } from '../services/graph/mail'
import { isGraphConfigured, hasTokens } from '../services/graph/auth'
import { classifyEmails } from '../services/ai/classify'
import { generateDrafts } from '../services/ai/drafts'
import { isApiKeyConfigured } from '../services/ai/client'
import { getSettings } from './settings'

interface StoredDraft {
  id: string
  emailId: string
  content: string
  tone: 'formal' | 'professional' | 'casual'
  confidence: number
  note?: string
  status: 'pending' | 'approved' | 'sent' | 'rejected'
  createdAt: string
  // Store reply metadata for sending
  toAddress: string
  toName: string
  subject: string
}

// In-memory draft store (Phase 6 will move to SQLite)
const draftStore = new Map<string, StoredDraft>()

// Cache for last fetched emails
let lastFetchedEmails: ReturnType<typeof buildEmailResponse>[] = []

function buildEmailResponse(
  email: {
    id: string
    fromName: string
    fromAddress: string
    subject: string
    body: string
    receivedAt: string
    hasAttachments: boolean
    isRead: boolean
    classification: string
  },
  draft?: StoredDraft
) {
  return {
    id: email.id,
    fromName: email.fromName,
    fromAddress: email.fromAddress,
    subject: email.subject,
    preview: email.body.substring(0, 150),
    body: email.body,
    receivedAt: email.receivedAt,
    isRead: email.isRead,
    classification: email.classification,
    hasAttachments: email.hasAttachments,
    draft: draft
      ? {
          id: draft.id,
          emailId: draft.emailId,
          content: draft.content,
          tone: draft.tone,
          confidence: draft.confidence,
          note: draft.note,
          status: draft.status,
          createdAt: draft.createdAt
        }
      : undefined
  }
}

export function registerEmailHandlers(): void {
  ipcMain.handle('emails:fetch', async () => {
    try {
      if (!isGraphConfigured() || !hasTokens()) {
        return {
          error: 'Microsoft account not connected. Sign in via Settings.',
          emails: []
        }
      }

      const rawEmails = await fetchEmails()
      const settings = getSettings()

      let classifiedEmails
      if (isApiKeyConfigured()) {
        // Build importance map from Outlook's importance flag
        const importanceMap = new Map<string, string>()
        for (const e of rawEmails) {
          if (e.importance) importanceMap.set(e.id, e.importance)
        }
        classifiedEmails = await classifyEmails(
          rawEmails,
          settings.noisePatterns,
          importanceMap
        )
      } else {
        // No API key — return unclassified
        classifiedEmails = rawEmails.map((e) => ({
          ...e,
          classification: 'normal' as const
        }))
      }

      // Generate drafts for VIP/important if API key configured
      if (isApiKeyConfigured()) {
        try {
          const drafts = await generateDrafts(
            classifiedEmails.map((e) => ({
              id: e.id,
              fromName: e.fromName,
              fromAddress: e.fromAddress,
              subject: e.subject,
              body: e.body,
              classification: e.classification
            }))
          )

          for (const draft of drafts) {
            const email = classifiedEmails.find((e) => e.id === draft.emailId)
            if (email) {
              const draftId = `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
              const stored: StoredDraft = {
                id: draftId,
                emailId: draft.emailId,
                content: draft.content,
                tone: draft.tone,
                confidence: draft.confidence,
                note: draft.note,
                status: 'pending',
                createdAt: new Date().toISOString(),
                toAddress: email.fromAddress,
                toName: email.fromName,
                subject: email.subject.startsWith('Re:')
                  ? email.subject
                  : `Re: ${email.subject}`
              }
              draftStore.set(draftId, stored)
            }
          }
        } catch (error) {
          console.error('Draft generation error:', error)
        }
      }

      lastFetchedEmails = classifiedEmails.map((email) => {
        const draft = Array.from(draftStore.values()).find(
          (d) => d.emailId === email.id && d.status === 'pending'
        )
        return buildEmailResponse(email, draft)
      })

      return { emails: lastFetchedEmails }
    } catch (error) {
      console.error('Email fetch error:', error)
      return {
        error: error instanceof Error ? error.message : 'Failed to fetch emails',
        emails: []
      }
    }
  })

  ipcMain.handle('emails:approve-draft', (_event, draftId: string, content: string) => {
    const draft = draftStore.get(draftId)
    if (!draft) return { error: 'Draft not found' }

    draft.content = content
    draft.status = 'approved'
    draftStore.set(draftId, draft)
    return { success: true }
  })

  ipcMain.handle('emails:send', async (_event, draftId: string) => {
    const draft = draftStore.get(draftId)
    if (!draft) return { error: 'Draft not found' }

    try {
      await sendMail(draft.toAddress, draft.toName, draft.subject, draft.content)
      draft.status = 'sent'
      draftStore.set(draftId, draft)
      return { success: true }
    } catch (error) {
      console.error('Send error:', error)
      return { error: error instanceof Error ? error.message : 'Failed to send' }
    }
  })

  ipcMain.handle('emails:reject-draft', (_event, draftId: string) => {
    const draft = draftStore.get(draftId)
    if (!draft) return { error: 'Draft not found' }

    draft.status = 'rejected'
    draftStore.set(draftId, draft)
    return { success: true }
  })

  ipcMain.handle('emails:generate-draft', async (_event, emailId: string) => {
    const email = lastFetchedEmails.find(e => e.id === emailId)
    if (!email) return { error: 'Email not found' }

    try {
      const drafts = await generateDrafts([{
        id: email.id,
        fromName: email.fromName,
        fromAddress: email.fromAddress,
        subject: email.subject,
        body: email.body,
        classification: email.classification as 'important' | 'normal' | 'noise'
      }], true)

      if (drafts.length > 0) {
        const draft = drafts[0]
        const draftId = `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
        const stored: StoredDraft = {
          id: draftId,
          emailId: email.id,
          content: draft.content,
          tone: draft.tone,
          confidence: draft.confidence,
          note: draft.note,
          status: 'pending',
          createdAt: new Date().toISOString(),
          toAddress: email.fromAddress,
          toName: email.fromName,
          subject: email.subject.startsWith('Re:') ? email.subject : `Re: ${email.subject}`
        }
        draftStore.set(draftId, stored)

        return {
          draft: {
            id: draftId,
            emailId: email.id,
            content: draft.content,
            tone: draft.tone,
            confidence: draft.confidence,
            note: draft.note,
            status: 'pending',
            createdAt: stored.createdAt
          }
        }
      }
      return { error: 'Could not generate draft' }
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Draft generation failed' }
    }
  })

  ipcMain.handle('emails:mark-read', async (_event, emailId: string, isRead: boolean) => {
    try {
      await markEmailRead(emailId, isRead)
      return { success: true }
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Failed to update email' }
    }
  })

  ipcMain.handle('emails:archive', async (_event, emailId: string) => {
    try {
      await archiveEmail(emailId)
      return { success: true }
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Failed to archive email' }
    }
  })
}
