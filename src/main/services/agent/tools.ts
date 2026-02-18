import type Anthropic from '@anthropic-ai/sdk'
import { fetchEmails, fetchSentEmails } from '../graph/mail'
import { sendMail } from '../graph/mail'
import { fetchTodayAndTomorrowEvents, createCalendarEvent } from '../graph/calendar'
import { fetchTodayTasks } from '../applescript/things'
import { generateBriefing } from '../ai/briefing'
import { classifyEmails } from '../ai/classify'
import { generateDrafts } from '../ai/drafts'
import { showNotification } from '../notifications'
import { saveBriefing } from '../db/briefings'
import { createApproval, ensureSessionExists } from '../db/agent'
import { loadConfig } from '../config'
import { getAvailableTools, callTool, parseMCPToolName } from './mcp-client'
import { randomUUID } from 'crypto'

function requireString(args: Record<string, unknown>, key: string): string {
  const val = args[key]
  if (typeof val !== 'string' || val.length === 0) {
    throw new Error(`Missing or invalid required argument: ${key}`)
  }
  return val
}

function optionalString(args: Record<string, unknown>, key: string): string | undefined {
  const val = args[key]
  if (val === undefined || val === null) return undefined
  if (typeof val !== 'string') throw new Error(`Argument ${key} must be a string`)
  return val
}

function getBuiltinTools(): Anthropic.Tool[] {
  const config = loadConfig()
  return [
    {
      name: 'fetch_emails',
      description:
        'Fetch recent emails from Outlook inbox. Returns classified emails with sender, subject, body preview, and classification (important/normal/noise).',
      input_schema: {
        type: 'object' as const,
        properties: {
          limit: {
            type: 'number',
            description: 'Maximum number of emails to fetch (default 50)'
          }
        },
        required: []
      }
    },
    {
      name: 'fetch_sent_emails',
      description:
        `Fetch recent sent emails from Outlook. Use this to check conversation context — whether ${config.founder.name} already replied to an email, or to see what was recently sent.`,
      input_schema: {
        type: 'object' as const,
        properties: {
          limit: {
            type: 'number',
            description: 'Maximum number of sent emails to fetch (default 20)'
          }
        },
        required: []
      }
    },
    {
      name: 'send_email',
      description:
        'Send an email via Outlook. Requires human approval before execution.',
      input_schema: {
        type: 'object' as const,
        properties: {
          to_address: { type: 'string', description: "Recipient's email address" },
          to_name: { type: 'string', description: "Recipient's display name" },
          subject: { type: 'string', description: 'Email subject line' },
          body: { type: 'string', description: 'Email body text' }
        },
        required: ['to_address', 'to_name', 'subject', 'body']
      }
    },
    {
      name: 'fetch_calendar',
      description:
        'Fetch today and tomorrow calendar events from Outlook. Returns event title, time, location, attendees.',
      input_schema: {
        type: 'object' as const,
        properties: {},
        required: []
      }
    },
    {
      name: 'create_calendar_event',
      description:
        'Create a new calendar event in Outlook. Requires human approval before execution. Provide subject, start/end times (ISO 8601 format), and optionally body, location, attendees, and online meeting flag.',
      input_schema: {
        type: 'object' as const,
        properties: {
          subject: { type: 'string', description: 'Event title/subject' },
          startDateTime: { type: 'string', description: 'Start time in ISO 8601 format (e.g., 2026-02-18T14:00:00)' },
          endDateTime: { type: 'string', description: 'End time in ISO 8601 format (e.g., 2026-02-18T15:00:00)' },
          body: { type: 'string', description: 'Event description/body text (optional)' },
          location: { type: 'string', description: 'Event location (optional)' },
          attendees: {
            type: 'array',
            description: 'List of attendee email addresses (optional)',
            items: { type: 'string' }
          },
          isOnlineMeeting: { type: 'boolean', description: 'Create as Teams online meeting (optional)' }
        },
        required: ['subject', 'startDateTime', 'endDateTime']
      }
    },
    {
      name: 'read_tasks',
      description:
        'Read today\'s tasks from Things 3. Returns task name, notes, due date, project, tags, completion status.',
      input_schema: {
        type: 'object' as const,
        properties: {},
        required: []
      }
    },
    {
      name: 'generate_briefing',
      description:
        'Generate a structured daily briefing from emails, calendar events, and tasks. Call fetch_emails, fetch_calendar, and read_tasks first to gather data.',
      input_schema: {
        type: 'object' as const,
        properties: {
          emails: {
            type: 'array',
            description: 'Classified email data to include in briefing',
            items: { type: 'object' }
          },
          events: {
            type: 'array',
            description: 'Calendar events to include in briefing',
            items: { type: 'object' }
          },
          tasks: {
            type: 'array',
            description: 'Task data to include in briefing',
            items: { type: 'object' }
          }
        },
        required: ['emails', 'events', 'tasks']
      }
    },
    {
      name: 'save_briefing',
      description: 'Save a generated briefing to the database.',
      input_schema: {
        type: 'object' as const,
        properties: {
          headline: { type: 'string', description: 'Briefing headline' },
          sections: { type: 'array', description: 'Briefing sections', items: { type: 'object' } },
          stats: { type: 'object', description: 'Briefing statistics' }
        },
        required: ['headline', 'sections', 'stats']
      }
    },
    {
      name: 'show_notification',
      description: 'Show a macOS notification to the user. Use for time-sensitive or urgent items.',
      input_schema: {
        type: 'object' as const,
        properties: {
          title: { type: 'string', description: 'Notification title' },
          body: { type: 'string', description: 'Notification body text' }
        },
        required: ['title', 'body']
      }
    },
    {
      name: 'request_human_review',
      description:
        'Queue an action for human review and approval. Use this when you want to send an email, modify the calendar, or are unsure about an action.',
      input_schema: {
        type: 'object' as const,
        properties: {
          action_type: { type: 'string', description: 'Type of action (e.g., send_email, create_event)' },
          title: { type: 'string', description: 'Short title describing the action' },
          description: { type: 'string', description: 'Detailed description of what you want to do and why' },
          data: { type: 'object', description: 'The data/arguments for the action' }
        },
        required: ['action_type', 'title', 'description', 'data']
      }
    },
    {
      name: 'draft_reply',
      description: 'Generate a draft email reply for an important email. The draft will be queued for human review before sending.',
      input_schema: {
        type: 'object' as const,
        properties: {
          email_id: { type: 'string', description: 'ID of the email to reply to' },
          from_name: { type: 'string', description: 'Sender name' },
          from_address: { type: 'string', description: 'Sender email address' },
          subject: { type: 'string', description: 'Email subject' },
          body: { type: 'string', description: 'Email body to reply to' },
          classification: { type: 'string', description: 'Email classification (important/normal)' }
        },
        required: ['email_id', 'from_name', 'from_address', 'subject', 'body']
      }
    },
    {
      name: 'delete_task',
      description: 'Delete (trash) a task in Things 3. Requires human approval.',
      input_schema: {
        type: 'object' as const,
        properties: {
          task_id: { type: 'string', description: 'Things 3 task ID to delete' },
          task_name: { type: 'string', description: 'Task name (for confirmation display)' }
        },
        required: ['task_id']
      }
    },
    {
      name: 'update_task',
      description: 'Update a task in Things 3 (name, notes, or mark complete).',
      input_schema: {
        type: 'object' as const,
        properties: {
          task_id: { type: 'string', description: 'Things 3 task ID' },
          name: { type: 'string', description: 'New task name (optional)' },
          notes: { type: 'string', description: 'New task notes (optional)' },
          complete: { type: 'boolean', description: 'Mark as completed (optional)' }
        },
        required: ['task_id']
      }
    },
    {
      name: 'read_memory',
      description: 'Read from your persistent memory. Use categories like contact, thread, journal, pending, preference.',
      input_schema: {
        type: 'object' as const,
        properties: {
          category: { type: 'string', description: 'Memory category (contact, thread, journal, pending, preference)' },
          key: { type: 'string', description: 'Specific key to read (optional — omit to list recent entries in category)' }
        },
        required: []
      }
    },
    {
      name: 'update_memory',
      description: 'Store or update a memory entry. Use for contact notes, thread summaries, pending items, learned preferences.',
      input_schema: {
        type: 'object' as const,
        properties: {
          category: { type: 'string', description: 'Memory category' },
          key: { type: 'string', description: 'Memory key' },
          value: { type: 'string', description: 'Content to store' }
        },
        required: ['category', 'key', 'value']
      }
    },
    {
      name: 'list_goals',
      description: 'List all active goals and their current status.',
      input_schema: {
        type: 'object' as const,
        properties: {},
        required: []
      }
    },
    {
      name: 'update_goal_status',
      description: 'Update the status of a goal after checking it.',
      input_schema: {
        type: 'object' as const,
        properties: {
          goal_id: { type: 'string', description: 'Goal ID' },
          status: { type: 'string', description: 'Current status description' }
        },
        required: ['goal_id', 'status']
      }
    }
  ]
}

async function executeBuiltinTool(
  toolName: string,
  args: Record<string, unknown>,
  sessionId: string
): Promise<string> {
  switch (toolName) {
    case 'fetch_emails': {
      const limit = (args.limit as number) || 50
      const config = loadConfig()
      const rawEmails = await fetchEmails(limit)
      const importanceMap = new Map(rawEmails.map(e => [e.id, e.importance || 'normal']))
      const classified = await classifyEmails(rawEmails, config.email.noise_patterns, importanceMap)
      return JSON.stringify(
        classified.map((e) => ({
          id: e.id,
          from: `${e.fromName} <${e.fromAddress}>`,
          subject: e.subject,
          body: e.body.substring(0, 300),
          classification: e.classification,
          isRead: e.isRead,
          receivedAt: e.receivedAt
        }))
      )
    }

    case 'fetch_sent_emails': {
      const sentLimit = (args.limit as number) || 20
      const sentEmails = await fetchSentEmails(sentLimit)
      return JSON.stringify(
        sentEmails.map((e) => ({
          to: `${e.fromName} <${e.fromAddress}>`,
          subject: e.subject,
          bodySummary: e.body.substring(0, 300),
          sentAt: e.receivedAt
        }))
      )
    }

    case 'send_email': {
      await sendMail(
        requireString(args, 'to_address'),
        requireString(args, 'to_name'),
        requireString(args, 'subject'),
        requireString(args, 'body')
      )
      return 'Email sent successfully.'
    }

    case 'fetch_calendar': {
      const events = await fetchTodayAndTomorrowEvents()
      return JSON.stringify(
        events.map((e) => ({
          id: e.id,
          title: e.title,
          startTime: e.startTime,
          endTime: e.endTime,
          location: e.location,
          isAllDay: e.isAllDay,
          attendees: e.attendees
        }))
      )
    }

    case 'create_calendar_event': {
      const result = await createCalendarEvent({
        subject: args.subject as string,
        startDateTime: args.startDateTime as string,
        endDateTime: args.endDateTime as string,
        body: args.body as string | undefined,
        location: args.location as string | undefined,
        attendees: args.attendees as string[] | undefined,
        isOnlineMeeting: args.isOnlineMeeting as boolean | undefined
      })
      return `Calendar event created successfully (ID: ${result.id}).`
    }

    case 'read_tasks': {
      const tasks = await fetchTodayTasks()
      return JSON.stringify(
        tasks.map((t) => ({
          id: t.id,
          name: t.name,
          notes: t.notes,
          dueDate: t.dueDate,
          project: t.project,
          tags: t.tags,
          completed: t.completed
        }))
      )
    }

    case 'generate_briefing': {
      // The agent passes structured data matching the expected interfaces
      const result = await generateBriefing(
        (args.emails as Parameters<typeof generateBriefing>[0]) || [],
        (args.events as Parameters<typeof generateBriefing>[1]) || [],
        (args.tasks as Parameters<typeof generateBriefing>[2]) || []
      )
      return JSON.stringify(result)
    }

    case 'save_briefing': {
      const stored = saveBriefing({
        headline: args.headline as string,
        sections: (args.sections as unknown[]) || [],
        stats: (args.stats as Record<string, unknown>) || {}
      })
      return JSON.stringify({ id: stored.id, generatedAt: stored.generatedAt })
    }

    case 'show_notification': {
      showNotification(requireString(args, 'title'), requireString(args, 'body'))
      return 'Notification shown.'
    }

    case 'request_human_review': {
      const approvalId = randomUUID()
      ensureSessionExists(sessionId)
      createApproval(
        approvalId,
        sessionId,
        requireString(args, 'action_type'),
        requireString(args, 'title'),
        requireString(args, 'description'),
        JSON.stringify(args.data),
        'medium'
      )
      return `Action queued for human review (approval ID: ${approvalId}). The user will approve or reject it.`
    }

    case 'draft_reply': {
      const draftEmailId = requireString(args, 'email_id')
      const draftFromName = requireString(args, 'from_name')
      const draftFromAddress = requireString(args, 'from_address')
      const draftSubject = requireString(args, 'subject')
      const draftBody = requireString(args, 'body')
      const draftClassification = optionalString(args, 'classification')
      const drafts = await generateDrafts([{
        id: draftEmailId,
        fromName: draftFromName,
        fromAddress: draftFromAddress,
        subject: draftSubject,
        body: draftBody,
        classification: (draftClassification as 'important' | 'normal') || 'important'
      }])
      if (drafts.length > 0) {
        const draft = drafts[0]
        // Queue as approval so user can review before sending
        const approvalId = randomUUID()
        ensureSessionExists(sessionId)
        createApproval(
          approvalId,
          sessionId,
          'send_email',
          `Reply to: ${draftSubject}`,
          `Draft reply to ${draftFromName} <${draftFromAddress}>:\n\n${draft.content}`,
          JSON.stringify({
            to_address: draftFromAddress,
            to_name: draftFromName,
            subject: `Re: ${draftSubject.replace(/^Re:\s*/i, '')}`,
            body: draft.content
          }),
          'medium'
        )
        return `Draft generated (confidence: ${draft.confidence}). Queued for your review and approval before sending.${draft.note ? ` Note: ${draft.note}` : ''}`
      }
      return 'Could not generate a draft for this email.'
    }

    case 'delete_task': {
      const { deleteTask } = await import('../applescript/things-write')
      const deleteTaskId = requireString(args, 'task_id')
      const deleteTaskName = optionalString(args, 'task_name')
      await deleteTask(deleteTaskId)
      return `Task deleted: ${deleteTaskName || deleteTaskId}`
    }

    case 'update_task': {
      const { updateTaskName, updateTaskNotes, completeTask } = await import('../applescript/things-write')
      const updateTaskId = requireString(args, 'task_id')
      const updateName = optionalString(args, 'name')
      const updateNotes = optionalString(args, 'notes')
      const results: string[] = []
      if (updateName) {
        await updateTaskName(updateTaskId, updateName)
        results.push(`renamed to "${updateName}"`)
      }
      if (updateNotes !== undefined) {
        await updateTaskNotes(updateTaskId, updateNotes)
        results.push('notes updated')
      }
      if (args.complete) {
        await completeTask(updateTaskId)
        results.push('marked complete')
      }
      return `Task updated: ${results.join(', ')}`
    }

    case 'read_memory': {
      const { getMemory, searchMemory } = await import('../db/memory')
      if (args.key) {
        const entry = getMemory(args.category as string, args.key as string)
        return entry ? JSON.stringify(entry) : 'No memory found for this key.'
      }
      const entries = searchMemory(args.category as string | undefined)
      return JSON.stringify(entries)
    }

    case 'update_memory': {
      const { setMemory } = await import('../db/memory')
      const memCategory = requireString(args, 'category')
      const memKey = requireString(args, 'key')
      const memValue = requireString(args, 'value')
      setMemory(memCategory, memKey, memValue)
      return `Memory updated: ${memCategory}/${memKey}`
    }

    case 'list_goals': {
      const { getGoals } = await import('../db/goals')
      const goals = getGoals()
      return JSON.stringify(goals)
    }

    case 'update_goal_status': {
      const { updateGoalStatus } = await import('../db/goals')
      const goalId = requireString(args, 'goal_id')
      const goalStatus = requireString(args, 'status')
      updateGoalStatus(goalId, goalStatus)
      return `Goal status updated: ${goalId}`
    }

    default:
      throw new Error(`Unknown built-in tool: ${toolName}`)
  }
}

const builtinNames = new Set([
  'fetch_emails', 'fetch_sent_emails', 'send_email', 'fetch_calendar',
  'create_calendar_event', 'read_tasks', 'generate_briefing', 'save_briefing',
  'show_notification', 'request_human_review', 'draft_reply', 'delete_task',
  'update_task', 'read_memory', 'update_memory', 'list_goals', 'update_goal_status'
])

export async function getToolSchemas(): Promise<Anthropic.Tool[]> {
  const mcpTools = await getAvailableTools()
  return [...getBuiltinTools(), ...mcpTools]
}

export async function executeTool(
  toolName: string,
  args: Record<string, unknown>,
  sessionId: string
): Promise<string> {
  if (builtinNames.has(toolName)) {
    return executeBuiltinTool(toolName, args, sessionId)
  }

  // Check if it's an MCP tool (serverName__toolName)
  const mcpParsed = parseMCPToolName(toolName)
  if (mcpParsed) {
    return callTool(mcpParsed.serverName, mcpParsed.toolName, args)
  }

  throw new Error(`Unknown tool: ${toolName}`)
}
