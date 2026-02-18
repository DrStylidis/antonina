import { runAppleScript, parseDelimitedOutput, FIELD_SEP, RECORD_SEP } from './runner'

export interface RawCalendarEvent {
  id: string
  title: string
  startTime: string
  endTime: string
  location: string
  isAllDay: boolean
  attendees: string[]
}

export async function fetchTodayAndTomorrowEvents(
  accountEmail?: string
): Promise<RawCalendarEvent[]> {
  const calendarSource = accountEmail
    ? `
      -- Find calendar for specific account
      set targetCal to missing value
      set allCals to calendars
      repeat with c in allCals
        try
          set acct to account of c
          set acctAddr to email address of acct
          if acctAddr is "${accountEmail}" then
            set targetCal to c
            exit repeat
          end if
        end try
      end repeat
      if targetCal is missing value then
        -- Fallback: get all calendar events
        set allEvents to calendar events whose start time >= todayStart and start time < tomorrowEnd
      else
        set allEvents to calendar events of targetCal whose start time >= todayStart and start time < tomorrowEnd
      end if
    `
    : `
      set allEvents to calendar events whose start time >= todayStart and start time < tomorrowEnd
    `

  const script = `
    set fieldSep to "${FIELD_SEP}"
    set recordSep to "${RECORD_SEP}"
    set output to ""

    set todayStart to current date
    set time of todayStart to 0

    set tomorrowEnd to todayStart + (2 * days)

    tell application "Microsoft Outlook"
      ${calendarSource}

      repeat with evt in allEvents
        try
          set evtId to id of evt as text

          set evtTitle to ""
          try
            set evtTitle to subject of evt
          end try
          set evtTitle to my sanitize(evtTitle)

          set evtStart to start time of evt as text
          set evtEnd to end time of evt as text

          set evtLocation to ""
          try
            set evtLocation to location of evt
          end try
          set evtLocation to my sanitize(evtLocation)

          set isAllDayFlag to "false"
          try
            if |is all day event| of evt then set isAllDayFlag to "true"
          end try

          set attendeeNames to ""
          try
            set attList to attendees of evt
            repeat with att in attList
              try
                if attendeeNames is not "" then set attendeeNames to attendeeNames & ","
                set attendeeNames to attendeeNames & (name of att)
              end try
            end repeat
          end try
          set attendeeNames to my sanitize(attendeeNames)

          set output to output & evtId & fieldSep & evtTitle & fieldSep & evtStart & fieldSep & evtEnd & fieldSep & evtLocation & fieldSep & isAllDayFlag & fieldSep & attendeeNames & recordSep
        on error errMsg
          -- Skip problematic events
        end try
      end repeat
    end tell

    return output

    on sanitize(txt)
      set cleanTxt to ""
      repeat with c in (characters of txt)
        set c to c as text
        if c is not in {"\\r", "\\n"} then
          set cleanTxt to cleanTxt & c
        else
          set cleanTxt to cleanTxt & " "
        end if
      end repeat
      return cleanTxt
    end sanitize
  `

  const raw = await runAppleScript(script, 30000)

  return parseDelimitedOutput<RawCalendarEvent>(
    raw,
    ['id', 'title', 'startTime', 'endTime', 'location', 'isAllDay', 'attendees'],
    (record) => ({
      id: record.id,
      title: record.title,
      startTime: record.startTime,
      endTime: record.endTime,
      location: record.location,
      isAllDay: record.isAllDay === 'true',
      attendees: record.attendees ? record.attendees.split(',').map((s) => s.trim()).filter(Boolean) : []
    })
  )
}
