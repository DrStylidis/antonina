import Anthropic from '@anthropic-ai/sdk'

let client: Anthropic | null = null

export function getAIClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey || apiKey === 'your-api-key-here') {
      throw new Error('ANTHROPIC_API_KEY not configured. Set it in .env or Settings.')
    }
    client = new Anthropic({ apiKey })
  }
  return client
}

export function resetClient(): void {
  client = null
}

export function isApiKeyConfigured(): boolean {
  const key = process.env.ANTHROPIC_API_KEY
  return !!key && key !== 'your-api-key-here'
}
