import { runAppleScript, parseDelimitedOutput, FIELD_SEP, RECORD_SEP } from './runner'

export interface RawTask {
  id: string
  name: string
  notes: string
  dueDate: string
  project: string
  tags: string[]
  completed: boolean
}

export async function fetchTodayTasks(): Promise<RawTask[]> {
  const script = `
    set fieldSep to "${FIELD_SEP}"
    set recordSep to "${RECORD_SEP}"
    set output to ""

    tell application "Things3"
      set todayTodos to to dos of list "Today"

      repeat with td in todayTodos
        try
          set tdId to id of td

          set tdName to name of td
          set tdName to my sanitize(tdName)

          set tdNotes to ""
          try
            set tdNotes to notes of td
            if (length of tdNotes) > 200 then
              set tdNotes to text 1 thru 200 of tdNotes
            end if
          end try
          set tdNotes to my sanitize(tdNotes)

          set tdDue to ""
          try
            set tdDue to due date of td as text
          end try

          set tdProject to ""
          try
            set proj to project of td
            if proj is not missing value then
              set tdProject to name of proj
            end if
          end try
          set tdProject to my sanitize(tdProject)

          set tdTags to ""
          try
            set tagList to tags of td
            repeat with tg in tagList
              if tdTags is not "" then set tdTags to tdTags & ","
              set tdTags to tdTags & (name of tg)
            end repeat
          end try

          set tdStatus to "open"
          try
            if status of td is completed then set tdStatus to "completed"
          end try

          set output to output & tdId & fieldSep & tdName & fieldSep & tdNotes & fieldSep & tdDue & fieldSep & tdProject & fieldSep & tdTags & fieldSep & tdStatus & recordSep
        on error errMsg
          -- Skip problematic tasks
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

  return parseDelimitedOutput<RawTask>(
    raw,
    ['id', 'name', 'notes', 'dueDate', 'project', 'tags', 'status'],
    (record) => ({
      id: record.id,
      name: record.name,
      notes: record.notes,
      dueDate: record.dueDate,
      project: record.project,
      tags: record.tags ? record.tags.split(',').map((s) => s.trim()).filter(Boolean) : [],
      completed: record.status === 'completed'
    })
  )
}

export async function isThings3Running(): Promise<boolean> {
  try {
    const result = await runAppleScript(
      'tell application "System Events" to return (name of processes) contains "Things3"',
      5000
    )
    return result === 'true'
  } catch {
    return false
  }
}
