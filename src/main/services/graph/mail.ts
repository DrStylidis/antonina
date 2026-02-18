import { getGraphClient } from './auth'

export interface RawEmail {
  id: string
  fromName: string
  fromAddress: string
  subject: string
  body: string
  receivedAt: string
  hasAttachments: boolean
  isRead: boolean
  importance?: string
}

interface GraphMessage {
  id: string
  subject: string
  body: { contentType: string; content: string }
  receivedDateTime: string
  hasAttachments: boolean
  isRead: boolean
  importance?: 'low' | 'normal' | 'high'
  from?: {
    emailAddress: {
      name: string
      address: string
    }
  }
  toRecipients?: Array<{
    emailAddress: {
      name: string
      address: string
    }
  }>
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export async function fetchEmails(limit = 20): Promise<RawEmail[]> {
  const client = await getGraphClient()
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const response = await client
    .api('/me/mailFolders/inbox/messages')
    .top(limit)
    .filter(`receivedDateTime ge ${sevenDaysAgo}`)
    .select('id,subject,body,receivedDateTime,hasAttachments,isRead,from,importance')
    .orderby('receivedDateTime desc')
    .get()

  const messages: GraphMessage[] = response.value || []

  return messages.map((msg) => ({
    id: msg.id,
    fromName: msg.from?.emailAddress?.name || '',
    fromAddress: msg.from?.emailAddress?.address || '',
    subject: msg.subject || '',
    body: stripHtml(msg.body?.content || ''),
    receivedAt: msg.receivedDateTime,
    hasAttachments: msg.hasAttachments || false,
    isRead: msg.isRead || false,
    importance: msg.importance || 'normal'
  }))
}

export async function fetchSentEmails(limit = 20): Promise<RawEmail[]> {
  const client = await getGraphClient()
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const response = await client
    .api('/me/mailFolders/sentitems/messages')
    .top(limit)
    .filter(`sentDateTime ge ${sevenDaysAgo}`)
    .select('id,subject,body,sentDateTime,hasAttachments,isRead,toRecipients,importance')
    .orderby('sentDateTime desc')
    .get()

  const messages: GraphMessage[] = response.value || []

  return messages.map((msg) => {
    const firstRecipient = msg.toRecipients?.[0]?.emailAddress
    return {
      id: msg.id,
      fromName: firstRecipient?.name || '',
      fromAddress: firstRecipient?.address || '',
      subject: msg.subject || '',
      body: stripHtml(msg.body?.content || ''),
      receivedAt: msg.receivedDateTime,
      hasAttachments: msg.hasAttachments || false,
      isRead: true,
      importance: msg.importance || 'normal'
    }
  })
}

export async function markEmailRead(id: string, isRead: boolean): Promise<void> {
  const client = await getGraphClient()
  await client.api(`/me/messages/${id}`).patch({ isRead })
}

export async function archiveEmail(id: string): Promise<void> {
  const client = await getGraphClient()
  await client.api(`/me/messages/${id}/move`).post({ destinationId: 'archive' })
}

export async function sendMail(
  toAddress: string,
  toName: string,
  subject: string,
  body: string
): Promise<void> {
  const client = await getGraphClient()

  await client.api('/me/sendMail').post({
    message: {
      subject,
      body: {
        contentType: 'Text',
        content: body
      },
      toRecipients: [
        {
          emailAddress: {
            address: toAddress,
            name: toName
          }
        }
      ]
    }
  })
}
