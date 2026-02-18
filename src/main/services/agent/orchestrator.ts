import { getAIClient } from '../ai/client'
import { loadConfig } from '../config'
import { getToolSchemas, executeTool } from './tools'
import { checkActionSafety, canStartSession, checkRateLimit } from './safety'
import { createSession, updateSession, logAction, createApproval } from '../db/agent'
import { logApiCost } from '../db/costs'
import { loadAgentContext } from './context'
import { getRecentJournals, getPendingItems, setMemory } from '../db/memory'
import { updateTrayState } from '../tray'
import { BrowserWindow } from 'electron'
import { randomUUID } from 'crypto'

function emitActivity(activity: object): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send('agent:activity', activity)
  }
}

export async function runAgentSession(
  trigger: 'morning_sweep' | 'evening_sweep' | 'vip_check' | 'meeting_prep' | 'manual',
  userMessage: string
): Promise<{ sessionId: string; summary: string }> {
  // 1. Check rate limits + cost limits
  const rateCheck = checkRateLimit()
  if (!rateCheck.allowed) throw new Error(rateCheck.reason)
  const costCheck = canStartSession()
  if (!costCheck.allowed) throw new Error(costCheck.reason)

  // 2. Create session
  const sessionId = randomUUID()
  createSession(sessionId, trigger)
  emitActivity({
    sessionId,
    type: 'session_start',
    timestamp: new Date().toISOString(),
    summary: `Agent session started: ${trigger}`
  })

  // 3. Build tools
  const tools = await getToolSchemas()
  const config = loadConfig()
  const client = getAIClient()

  // Update tray state
  try { updateTrayState('working') } catch { /* tray might not exist yet */ }

  // 4. Build dynamic system prompt
  const agentContext = loadAgentContext()

  let memoryContext = ''
  try {
    const journals = getRecentJournals(2)
    const pendingItems = getPendingItems()
    if (journals.length > 0) {
      memoryContext += '\n\n## Recent Session Journals\n'
      journals.forEach(j => { memoryContext += `- ${j.key}: ${j.value}\n` })
    }
    if (pendingItems.length > 0) {
      memoryContext += '\n\n## Pending Items\n'
      pendingItems.forEach(p => { memoryContext += `- ${p.key}: ${p.value}\n` })
    }
  } catch {
    // Memory table might not exist yet
  }

  const planningInstructions = `

## Approach
Before taking action:
1. Assess what information you need
2. Plan your sequence of actions
3. Consider risks and what could go wrong
Then execute step by step.`

  const systemPrompt = `${agentContext}${memoryContext}${planningInstructions}

Current time: ${new Date().toLocaleString('en-SE', { timeZone: 'Europe/Stockholm' })}
Trigger: ${trigger}`

  // 5. Agent loop
  const messages: Array<{ role: string; content: unknown }> = [
    { role: 'user', content: userMessage }
  ]
  let toolCallCount = 0
  let totalCost = 0
  const maxIterations = config.agent.max_tool_calls_per_session

  try {
    while (toolCallCount < maxIterations) {
      const response = await client.messages.create({
        model: config.api.agent_model,
        max_tokens: 4096,
        system: systemPrompt,
        tools: tools as Parameters<typeof client.messages.create>[0]['tools'],
        messages: messages as Parameters<typeof client.messages.create>[0]['messages']
      })

      // Log API cost
      const inputTokens = response.usage?.input_tokens || 0
      const outputTokens = response.usage?.output_tokens || 0
      logApiCost(config.api.agent_model, inputTokens, outputTokens, `agent:${trigger}`)
      totalCost += (inputTokens * 15 + outputTokens * 75) / 1_000_000

      if (response.stop_reason === 'end_turn') {
        const textBlock = response.content.find((b) => b.type === 'text')
        const summary = textBlock && 'text' in textBlock ? textBlock.text : 'Session completed'
        updateSession(sessionId, {
          status: 'completed',
          completedAt: new Date().toISOString(),
          summary,
          tool_calls: toolCallCount,
          total_cost_usd: totalCost
        })
        emitActivity({
          sessionId,
          type: 'session_end',
          timestamp: new Date().toISOString(),
          summary
        })
        // Post-session journal entry
        try {
          const dateKey = new Date().toISOString().split('T')[0]
          setMemory('journal', dateKey, summary.substring(0, 500))
        } catch {
          // Memory might not be available
        }

        // Post-session reflection
        try {
          const reflectionResponse = await client.messages.create({
            model: config.api.triage_model, // Use cheaper model for reflection
            max_tokens: 300,
            system: 'You are reflecting on an agent session. Be very concise (2-3 sentences).',
            messages: [{
              role: 'user',
              content: `Session trigger: ${trigger}\nActions taken: ${toolCallCount} tool calls\nSummary: ${summary}\n\nWhat should be remembered for future sessions? Any patterns about user preferences?`
            }]
          })
          const reflectionText = reflectionResponse.content.find(b => b.type === 'text')
          if (reflectionText && 'text' in reflectionText) {
            const dateKey = `${new Date().toISOString().split('T')[0]}_${trigger}`
            setMemory('reflection', dateKey, reflectionText.text)
          }
        } catch {
          // Reflection is best-effort, don't fail the session
        }

        try { updateTrayState('idle') } catch { /* tray might not exist */ }
        return { sessionId, summary }
      }

      if (response.stop_reason === 'tool_use') {
        messages.push({ role: 'assistant', content: response.content })

        const toolResults: Array<{
          type: 'tool_result'
          tool_use_id: string
          content: string
          is_error?: boolean
        }> = []

        for (const block of response.content) {
          if (block.type !== 'tool_use') continue

          toolCallCount++
          const toolName = block.name
          const toolArgs = block.input as Record<string, unknown>

          emitActivity({
            sessionId,
            type: 'tool_call',
            timestamp: new Date().toISOString(),
            tool: toolName,
            summary: `Calling ${toolName}...`
          })

          const safety = checkActionSafety(toolName)

          if (safety.needsApproval) {
            // Queue for human approval
            const approvalId = randomUUID()
            const actionId = randomUUID()
            logAction(actionId, sessionId, toolName, JSON.stringify(toolArgs), null, 'pending_approval')
            createApproval(
              approvalId,
              sessionId,
              toolName,
              `Agent wants to: ${toolName}`,
              JSON.stringify(toolArgs, null, 2),
              JSON.stringify(toolArgs),
              safety.riskLevel
            )

            emitActivity({
              sessionId,
              type: 'approval_needed',
              timestamp: new Date().toISOString(),
              tool: toolName,
              riskLevel: safety.riskLevel,
              summary: `Queued ${toolName} for human approval (${safety.riskLevel} risk)`
            })

            toolResults.push({
              type: 'tool_result',
              tool_use_id: block.id,
              content: 'This action requires human approval. It has been queued for review. The user will approve or reject it.'
            })
          } else {
            // Auto-execute
            try {
              const result = await executeTool(toolName, toolArgs, sessionId)
              const actionId = randomUUID()
              logAction(
                actionId,
                sessionId,
                toolName,
                JSON.stringify(toolArgs),
                typeof result === 'string' ? result : JSON.stringify(result),
                'executed'
              )

              if (safety.notify) {
                emitActivity({
                  sessionId,
                  type: 'auto_executed',
                  timestamp: new Date().toISOString(),
                  tool: toolName,
                  riskLevel: safety.riskLevel,
                  summary: `Auto-executed ${toolName} (${safety.riskLevel} risk)`
                })
              } else {
                emitActivity({
                  sessionId,
                  type: 'tool_result',
                  timestamp: new Date().toISOString(),
                  tool: toolName,
                  summary: `${toolName} completed`
                })
              }

              toolResults.push({
                type: 'tool_result',
                tool_use_id: block.id,
                content: typeof result === 'string' ? result : JSON.stringify(result)
              })
            } catch (err) {
              const errMsg = err instanceof Error ? err.message : String(err)
              logAction(randomUUID(), sessionId, toolName, JSON.stringify(toolArgs), errMsg, 'error')
              toolResults.push({
                type: 'tool_result',
                tool_use_id: block.id,
                content: `Error: ${errMsg}`,
                is_error: true
              })
            }
          }
        }

        messages.push({ role: 'user', content: toolResults })
      }
    }

    // Max iterations reached
    updateSession(sessionId, {
      status: 'completed',
      completedAt: new Date().toISOString(),
      summary: 'Max tool calls reached',
      tool_calls: toolCallCount,
      total_cost_usd: totalCost
    })
    emitActivity({
      sessionId,
      type: 'session_end',
      timestamp: new Date().toISOString(),
      summary: 'Max tool calls reached'
    })
    try { updateTrayState('idle') } catch { /* tray might not exist */ }
    return { sessionId, summary: 'Max tool calls reached' }
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error)
    updateSession(sessionId, {
      status: 'failed',
      completedAt: new Date().toISOString(),
      errors: JSON.stringify([errMsg]),
      tool_calls: toolCallCount,
      total_cost_usd: totalCost
    })
    emitActivity({
      sessionId,
      type: 'session_end',
      timestamp: new Date().toISOString(),
      summary: `Session failed: ${errMsg}`
    })
    try { updateTrayState('idle') } catch { /* tray might not exist */ }
    throw error
  }
}
