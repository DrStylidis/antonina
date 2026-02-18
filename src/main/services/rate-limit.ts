const lastCall = new Map<string, number>()

/**
 * Simple rate limiter. Returns true if the operation can proceed.
 */
export function rateLimitCheck(key: string, cooldownMs: number): boolean {
  const now = Date.now()
  const last = lastCall.get(key) || 0
  if (now - last < cooldownMs) return false
  lastCall.set(key, now)
  return true
}
