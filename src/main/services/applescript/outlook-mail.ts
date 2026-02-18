import { runAppleScript, parseDelimitedOutput, FIELD_SEP, RECORD_SEP } from './runner'

export interface RawEmail {
  id: string
  fromName: string
  fromAddress: string
  subject: string
  body: string
  receivedAt: string
  hasAttachments: boolean
  isRead: boolean
}

export async function fetchEmails(limit = 50, accountEmail?: string): Promise<RawEmail[]> {
  const inboxSource = accountEmail
    ? `
      -- Find inbox folder for specific account
      set inboxFolder to missing value
      set allFolders to mail folders
      repeat with f in allFolders
        try
          set fName to name of f
          if fName is "Inbox" or fName is "INBOX" then
            set acct to account of f
            set acctAddr to email address of acct
            if acctAddr is "${accountEmail}" then
              set inboxFolder to f
              exit repeat
            end if
          end if
        end try
      end repeat
      if inboxFolder is missing value then
        set inboxFolder to inbox
      end if
    `
    : `
      set inboxFolder to inbox
    `

  const script = `
    set fieldSep to "${FIELD_SEP}"
    set recordSep to "${RECORD_SEP}"
    set output to ""

    tell application "Microsoft Outlook"
      ${inboxSource}
      set msgList to messages of inboxFolder
      set msgCount to count of msgList
      if msgCount > ${limit} then set msgCount to ${limit}

      repeat with i from 1 to msgCount
        set msg to item i of msgList
        try
          set msgId to id of msg as text

          set senderObj to sender of msg
          set senderName to ""
          set senderAddr to ""
          try
            set senderName to name of senderObj
          end try
          try
            set senderAddr to address of senderObj
          end try

          set msgSubject to ""
          try
            set msgSubject to subject of msg
          end try

          set msgBody to ""
          try
            set msgBody to plain text content of msg
            if (length of msgBody) > 500 then
              set msgBody to text 1 thru 500 of msgBody
            end if
          end try

          -- Sanitize fields: replace delimiters and problematic chars
          set msgSubject to my sanitize(msgSubject)
          set msgBody to my sanitize(msgBody)
          set senderName to my sanitize(senderName)

          set msgDate to time received of msg as text

          set hasAttach to "false"
          try
            if (count of attachments of msg) > 0 then set hasAttach to "true"
          end try

          set isReadFlag to "false"
          try
            if |is read| of msg then set isReadFlag to "true"
          end try

          set output to output & msgId & fieldSep & senderName & fieldSep & senderAddr & fieldSep & msgSubject & fieldSep & msgBody & fieldSep & msgDate & fieldSep & hasAttach & fieldSep & isReadFlag & recordSep
        on error errMsg
          -- Skip problematic messages
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

  const raw = await runAppleScript(script, 60000)

  return parseDelimitedOutput<RawEmail>(
    raw,
    ['id', 'fromName', 'fromAddress', 'subject', 'body', 'receivedAt', 'hasAttachments', 'isRead'],
    (record) => ({
      id: record.id,
      fromName: record.fromName,
      fromAddress: record.fromAddress,
      subject: record.subject,
      body: record.body,
      receivedAt: record.receivedAt,
      hasAttachments: record.hasAttachments === 'true',
      isRead: record.isRead === 'true'
    })
  )
}

export async function sendReply(
  toAddress: string,
  toName: string,
  subject: string,
  body: string
): Promise<void> {
  // Escape double quotes and backslashes for AppleScript string safety
  const safeBody = body.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
  const safeSubject = subject.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
  const safeName = toName.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
  const safeAddress = toAddress.replace(/\\/g, '\\\\').replace(/"/g, '\\"')

  const script = `
    tell application "Microsoft Outlook"
      set newMsg to make new outgoing message with properties {subject:"${safeSubject}", plain text content:"${safeBody}"}
      make new to recipient at newMsg with properties {email address:{name:"${safeName}", address:"${safeAddress}"}}
      send newMsg
    end tell
  `

  await runAppleScript(script, 30000)
}

export async function isOutlookRunning(): Promise<boolean> {
  try {
    const result = await runAppleScript(
      'tell application "System Events" to return (name of processes) contains "Microsoft Outlook"',
      5000
    )
    return result === 'true'
  } catch {
    return false
  }
}
