import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import type Anthropic from '@anthropic-ai/sdk'
import { loadConfig } from '../config'

interface MCPServerConfig {
  name: string
  command: string
  args: string[]
  env?: Record<string, string>
}

interface MCPServerState {
  config: MCPServerConfig
  client: Client | null
  transport: StdioClientTransport | null
  tools: Anthropic.Tool[] | null
}

function getMCPServers(): MCPServerConfig[] {
  const config = loadConfig()
  return (config.mcp_servers || []).map(s => ({
    name: s.name,
    command: s.command,
    args: s.args,
    env: s.env
  }))
}

const servers: Map<string, MCPServerState> = new Map()

let serversInitialized = false

function ensureServersInitialized(): void {
  if (serversInitialized) return
  serversInitialized = true
  const configs = getMCPServers()
  for (const cfg of configs) {
    servers.set(cfg.name, { config: cfg, client: null, transport: null, tools: null })
  }
}

async function ensureConnected(serverName: string): Promise<MCPServerState> {
  ensureServersInitialized()
  const state = servers.get(serverName)
  if (!state) throw new Error(`Unknown MCP server: ${serverName}`)

  if (state.client) return state

  const env: Record<string, string> = { ...process.env as Record<string, string> }
  if (state.config.env) {
    Object.assign(env, state.config.env)
  }

  const transport = new StdioClientTransport({
    command: state.config.command,
    args: state.config.args,
    env,
    stderr: 'pipe'
  })

  const client = new Client({ name: 'antonina', version: '2.0.0' })

  try {
    await client.connect(transport)
  } catch (err) {
    // Clean up on failure
    state.client = null
    state.transport = null
    state.tools = null
    throw new Error(`Failed to connect to MCP server ${serverName}: ${err instanceof Error ? err.message : String(err)}`)
  }

  state.client = client
  state.transport = transport

  // Listen for transport close to clean up state
  transport.onclose = () => {
    state.client = null
    state.transport = null
    state.tools = null
  }

  return state
}

async function getServerTools(serverName: string): Promise<Anthropic.Tool[]> {
  const state = await ensureConnected(serverName)

  if (state.tools) return state.tools

  const result = await state.client!.listTools()

  state.tools = result.tools.map((tool) => ({
    name: `${serverName}__${tool.name}`,
    description: tool.description || `Tool from ${serverName} MCP server`,
    input_schema: tool.inputSchema as Anthropic.Tool['input_schema']
  }))

  return state.tools
}

export async function getAvailableTools(): Promise<Anthropic.Tool[]> {
  ensureServersInitialized()
  const allTools: Anthropic.Tool[] = []

  for (const [serverName] of servers) {
    try {
      const tools = await getServerTools(serverName)
      allTools.push(...tools)
    } catch (err) {
      console.error(`Failed to get tools from MCP server ${serverName}:`, err)
    }
  }

  return allTools
}

export async function callTool(
  serverName: string,
  toolName: string,
  args: Record<string, unknown>
): Promise<string> {
  const state = await ensureConnected(serverName)

  const result = await state.client!.callTool({ name: toolName, arguments: args })

  // Extract text content from the result
  if ('content' in result && Array.isArray(result.content)) {
    const textParts = result.content
      .filter((c): c is { type: 'text'; text: string } => c.type === 'text')
      .map((c) => c.text)
    return textParts.join('\n') || JSON.stringify(result)
  }

  return JSON.stringify(result)
}

export function parseMCPToolName(fullName: string): { serverName: string; toolName: string } | null {
  const idx = fullName.indexOf('__')
  if (idx === -1) return null
  return {
    serverName: fullName.substring(0, idx),
    toolName: fullName.substring(idx + 2)
  }
}

export async function shutdown(): Promise<void> {
  ensureServersInitialized()
  for (const [, state] of servers) {
    if (state.client) {
      try {
        await state.client.close()
      } catch {
        // Ignore shutdown errors
      }
      state.client = null
      state.transport = null
      state.tools = null
    }
  }
}
