import { getAIClient } from '../ai/client'
import { loadConfig } from '../config'
import { getToolSchemas, executeTool } from './tools'
import { checkActionSafety } from './safety'
import { createApproval, logAction, ensureSessionExists } from '../db/agent'
import { createChatMessage, getChatHistory } from '../db/chat'
import { loadAgentContext } from './context'
import { getRecentJournals, getPendingItems } from '../db/memory'
import { BrowserWindow } from 'electron'
import { randomUUID } from 'crypto'

function emitChatChunk(chunk: string): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send('chat:chunk', chunk)
  }
}

function emitChatToolCall(toolName: string, status: 'start' | 'done' | 'error', result?: string): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send('chat:tool-call', { toolName, status, result })
  }
}

function emitChatDone(): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send('chat:done')
  }
}

export async function sendChatMessage(
  sessionId: string,
  userMessage: string
): Promise<string> {
  const config = loadConfig()
  const client = getAIClient()
  const tools = await getToolSchemas()

  // Save user message to DB
  createChatMessage(sessionId, 'user', userMessage)

  // Build context-aware system prompt
  const agentContext = loadAgentContext()

  // Inject recent memory
  let memoryContext = ''
  try {
    const journals = getRecentJournals(2)
    const pending = getPendingItems()
    if (journals.length > 0) {
      memoryContext += '\n\n## Recent Session Journals\n'
      journals.forEach(j => {
        memoryContext += `- ${j.key}: ${j.value}\n`
      })
    }
    if (pending.length > 0) {
      memoryContext += '\n\n## Pending Items Being Tracked\n'
      pending.forEach(p => {
        memoryContext += `- ${p.key}: ${p.value}\n`
      })
    }
  } catch {
    // Memory table might not exist yet
  }

  const systemPrompt = `${agentContext}${memoryContext}

You are chatting with ${config.founder.name} in real-time. Be concise and helpful. Use your tools to fetch real data when asked. You can check emails, calendar, tasks, draft replies, manage memory, and more.`

  // Build messages from chat history
  const history = getChatHistory(sessionId)
  const messages: Array<{ role: string; content: unknown }> = []
  for (const msg of history) {
    if (msg.role === 'tool_result' && msg.tool_calls_json) {
      // tool_result records store: content = tool results JSON, tool_calls_json = assistant response with tool_use blocks
      // Split into assistant message (tool_use blocks) + user message (tool results)
      messages.push({ role: 'assistant', content: JSON.parse(msg.tool_calls_json) })
      messages.push({ role: 'user', content: JSON.parse(msg.content) })
    } else {
      messages.push({
        role: msg.role === 'tool_result' ? 'user' : msg.role,
        content: msg.content
      })
    }
  }

  let fullResponse = ''
  let iterations = 0
  const maxIterations = config.agent.max_tool_calls_per_session

  try {
    while (iterations < maxIterations) {
      iterations++

      const response = await client.messages.create({
        model: config.api.agent_model === 'claude-opus-4-6' ? 'claude-sonnet-4-5-20250929' : config.api.agent_model,
        max_tokens: 4096,
        system: systemPrompt,
        tools: tools as Parameters<typeof client.messages.create>[0]['tools'],
        messages: messages as Parameters<typeof client.messages.create>[0]['messages']
      })

      if (response.stop_reason === 'end_turn') {
        const textBlock = response.content.find(b => b.type === 'text')
        const text = textBlock && 'text' in textBlock ? textBlock.text : ''
        fullResponse += text
        emitChatChunk(text)
        emitChatDone()

        // Save assistant response
        createChatMessage(sessionId, 'assistant', fullResponse)
        return fullResponse
      }

      if (response.stop_reason === 'tool_use') {
        // Emit any text content before tool calls
        for (const block of response.content) {
          if (block.type === 'text') {
            fullResponse += block.text
            emitChatChunk(block.text)
          }
        }

        messages.push({ role: 'assistant', content: response.content })

        const toolResults: Array<{
          type: 'tool_result'
          tool_use_id: string
          content: string
          is_error?: boolean
        }> = []

        for (const block of response.content) {
          if (block.type !== 'tool_use') continue

          const toolName = block.name
          const toolArgs = block.input as Record<string, unknown>

          emitChatToolCall(toolName, 'start')

          const safety = checkActionSafety(toolName)

          if (safety.needsApproval) {
            const approvalId = randomUUID()
            ensureSessionExists(sessionId)
            createApproval(
              approvalId,
              sessionId,
              toolName,
              `Chat: ${toolName}`,
              JSON.stringify(toolArgs, null, 2),
              JSON.stringify(toolArgs),
              safety.riskLevel
            )
            emitChatToolCall(toolName, 'done', `Queued for approval (${safety.riskLevel} risk)`)
            toolResults.push({
              type: 'tool_result',
              tool_use_id: block.id,
              content: 'This action requires your approval. It has been queued for review.'
            })
          } else {
            try {
              const result = await executeTool(toolName, toolArgs, sessionId)
              const resultPreview = typeof result === 'string' ? result.substring(0, 200) : 'Done'
              if (safety.notify) {
                emitChatToolCall(toolName, 'done', `Auto-executed (${safety.riskLevel} risk): ${resultPreview}`)
              } else {
                emitChatToolCall(toolName, 'done', resultPreview)
              }
              toolResults.push({
                type: 'tool_result',
                tool_use_id: block.id,
                content: typeof result === 'string' ? result : JSON.stringify(result)
              })
            } catch (err) {
              const errMsg = err instanceof Error ? err.message : String(err)
              emitChatToolCall(toolName, 'error', errMsg)
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
        // Save tool results to DB
        createChatMessage(sessionId, 'tool_result', JSON.stringify(toolResults), JSON.stringify(response.content))
      }
    }

    emitChatDone()
    createChatMessage(sessionId, 'assistant', fullResponse || 'Max iterations reached.')
    return fullResponse || 'Max iterations reached.'
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error)
    emitChatChunk(`\n\nError: ${errMsg}`)
    createChatMessage(sessionId, 'assistant', `Error: ${errMsg}`)
    emitChatDone()
    return `Error: ${errMsg}`
  }
}
