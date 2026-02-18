import { getGraphClient } from './auth'

export interface RawCalendarEvent {
  id: string
  title: string
  startTime: string
  endTime: string
  location: string
  isAllDay: boolean
  attendees: string[]
}

interface GraphEvent {
  id: string
  subject: string
  start: { dateTime: string; timeZone: string }
  end: { dateTime: string; timeZone: string }
  location?: { displayName: string }
  isAllDay: boolean
  attendees?: Array<{
    emailAddress: { name: string; address: string }
  }>
}

export interface CalendarEventInput {
  subject: string
  startDateTime: string
  endDateTime: string
  body?: string
  location?: string
  attendees?: string[]
  isOnlineMeeting?: boolean
}

export async function createCalendarEvent(input: CalendarEventInput): Promise<{ id: string }> {
  const client = await getGraphClient()

  const event: Record<string, unknown> = {
    subject: input.subject,
    start: { dateTime: input.startDateTime, timeZone: 'Europe/Stockholm' },
    end: { dateTime: input.endDateTime, timeZone: 'Europe/Stockholm' }
  }

  if (input.body) {
    event.body = { contentType: 'Text', content: input.body }
  }
  if (input.location) {
    event.location = { displayName: input.location }
  }
  if (input.attendees?.length) {
    event.attendees = input.attendees.map((email) => ({
      emailAddress: { address: email },
      type: 'required'
    }))
  }
  if (input.isOnlineMeeting) {
    event.isOnlineMeeting = true
    event.onlineMeetingProvider = 'teamsForBusiness'
  }

  const result = await client
    .api('/me/events')
    .header('Prefer', 'outlook.timezone="Europe/Stockholm"')
    .post(event)

  return { id: result.id }
}

export async function fetchTodayAndTomorrowEvents(): Promise<RawCalendarEvent[]> {
  const client = await getGraphClient()

  const now = new Date()
  const startOfDay = new Date(now)
  startOfDay.setHours(0, 0, 0, 0)

  const endOfTomorrow = new Date(startOfDay)
  endOfTomorrow.setDate(endOfTomorrow.getDate() + 2)

  const response = await client
    .api('/me/calendarview')
    .header('Prefer', 'outlook.timezone="Europe/Stockholm"')
    .query({
      startDateTime: startOfDay.toISOString(),
      endDateTime: endOfTomorrow.toISOString(),
      $top: 50,
      $orderby: 'start/dateTime'
    })
    .select('id,subject,start,end,location,isAllDay,attendees')
    .get()

  const events: GraphEvent[] = response.value || []

  return events.map((evt) => ({
    id: evt.id,
    title: evt.subject || '',
    startTime: evt.start.dateTime,
    endTime: evt.end.dateTime,
    location: evt.location?.displayName || '',
    isAllDay: evt.isAllDay || false,
    attendees: (evt.attendees || []).map((a) => a.emailAddress.name || a.emailAddress.address)
  }))
}
