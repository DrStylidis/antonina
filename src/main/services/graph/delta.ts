import { getGraphClient } from './auth'
import { getDb } from '../db'

interface DeltaEmail {
  id: string
  subject: string
  from?: { emailAddress: { name: string; address: string } }
  importance?: 'low' | 'normal' | 'high'
  receivedDateTime: string
  isRead: boolean
}

function getDeltaLink(): string | null {
  const db = getDb()
  const row = db.prepare("SELECT value FROM settings WHERE key = 'email_delta_link'").get() as { value: string } | undefined
  return row?.value || null
}

function saveDeltaLink(link: string): void {
  const db = getDb()
  db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('email_delta_link', ?)").run(link)
}

export async function fetchEmailDelta(): Promise<{ newEmails: DeltaEmail[]; hasMore: boolean }> {
  const client = await getGraphClient()
  const deltaLink = getDeltaLink()

  let url: string
  if (deltaLink) {
    url = deltaLink
  } else {
    url = '/me/mailFolders/inbox/messages/delta?$select=id,subject,from,importance,receivedDateTime,isRead&$top=50'
  }

  const newEmails: DeltaEmail[] = []

  try {
    const response = await client.api(url).get()
    const messages: DeltaEmail[] = response.value || []

    // Only include genuinely new/changed messages
    for (const msg of messages) {
      if (msg.id && msg.subject) {
        newEmails.push(msg)
      }
    }

    // Save the delta link for next poll
    if (response['@odata.deltaLink']) {
      saveDeltaLink(response['@odata.deltaLink'])
    } else if (response['@odata.nextLink']) {
      // More pages available — save nextLink and indicate hasMore
      saveDeltaLink(response['@odata.nextLink'])
      return { newEmails, hasMore: true }
    }
  } catch (error) {
    // If delta link is invalid (e.g., expired), reset and do a full sync next time
    console.error('Delta query failed, resetting delta link:', error)
    const db = getDb()
    db.prepare("DELETE FROM settings WHERE key = 'email_delta_link'").run()
  }

  return { newEmails, hasMore: false }
}
