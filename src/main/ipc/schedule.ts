import { ipcMain } from 'electron'
import { fetchTodayAndTomorrowEvents, createCalendarEvent } from '../services/graph/calendar'
import type { CalendarEventInput } from '../services/graph/calendar'
import { isGraphConfigured, hasTokens } from '../services/graph/auth'

export function registerScheduleHandlers(): void {
  ipcMain.handle('schedule:today', async () => {
    try {
      if (!isGraphConfigured() || !hasTokens()) {
        return { error: 'Microsoft account not connected. Sign in via Settings.', events: [] }
      }

      const rawEvents = await fetchTodayAndTomorrowEvents()

      const events = rawEvents.map((evt) => ({
        id: evt.id,
        title: evt.title,
        startTime: evt.startTime,
        endTime: evt.endTime,
        location: evt.location || undefined,
        isOnline:
          (evt.location || '').toLowerCase().includes('teams') ||
          (evt.location || '').toLowerCase().includes('zoom') ||
          (evt.location || '').toLowerCase().includes('meet'),
        isAllDay: evt.isAllDay,
        attendees: evt.attendees
      }))

      return { events }
    } catch (error) {
      console.error('Schedule fetch error:', error)
      return {
        error: error instanceof Error ? error.message : 'Failed to fetch calendar',
        events: []
      }
    }
  })

  ipcMain.handle('schedule:create-event', async (_event, input: CalendarEventInput) => {
    try {
      if (!isGraphConfigured() || !hasTokens()) {
        return { error: 'Microsoft account not connected. Sign in via Settings.' }
      }

      const result = await createCalendarEvent(input)
      return { success: true, eventId: result.id }
    } catch (error) {
      console.error('Create event error:', error)
      return { error: error instanceof Error ? error.message : 'Failed to create event' }
    }
  })
}
