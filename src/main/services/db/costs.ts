import { getDb } from './index'

// Pricing per million tokens (as of 2025)
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'claude-sonnet-4-5-20250929': { input: 3.0, output: 15.0 },
  'claude-haiku-4-5-20251001': { input: 1.0, output: 5.0 },
  'claude-opus-4-6': { input: 15.0, output: 75.0 }
}

function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = MODEL_PRICING[model] || { input: 3.0, output: 15.0 }
  return (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000
}

export function logApiCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
  operation: string
): void {
  const db = getDb()
  const cost = calculateCost(model, inputTokens, outputTokens)

  db.prepare(
    'INSERT INTO api_costs (model, input_tokens, output_tokens, cost_usd, operation) VALUES (?, ?, ?, ?, ?)'
  ).run(model, inputTokens, outputTokens, cost, operation)
}

export function getDailyCost(): number {
  const db = getDb()
  const row = db
    .prepare(
      "SELECT COALESCE(SUM(cost_usd), 0) as total FROM api_costs WHERE created_at >= datetime('now', 'start of day')"
    )
    .get() as { total: number }
  return row.total
}

export function getWeeklyCost(): number {
  const db = getDb()
  const row = db
    .prepare(
      "SELECT COALESCE(SUM(cost_usd), 0) as total FROM api_costs WHERE created_at >= datetime('now', '-7 days')"
    )
    .get() as { total: number }
  return row.total
}

export function getMonthlyCost(): number {
  const db = getDb()
  const row = db
    .prepare(
      "SELECT COALESCE(SUM(cost_usd), 0) as total FROM api_costs WHERE created_at >= datetime('now', '-30 days')"
    )
    .get() as { total: number }
  return row.total
}
