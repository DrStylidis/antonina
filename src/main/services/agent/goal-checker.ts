import { getActiveGoals, updateGoalStatus } from '../db/goals'
import { runAgentSession } from './orchestrator'

let isChecking = false

function isGoalDue(schedule: string, lastCheckedAt: string | null): boolean {
  if (!lastCheckedAt) return true

  const last = new Date(lastCheckedAt).getTime()
  const now = Date.now()
  const elapsed = now - last

  switch (schedule) {
    case 'every_15min': return elapsed > 15 * 60 * 1000
    case 'hourly': return elapsed > 60 * 60 * 1000
    case 'on_sweep': return false // Only triggered by morning/evening sweeps
    default: return elapsed > 60 * 60 * 1000
  }
}

export async function checkGoals(): Promise<void> {
  if (isChecking) {
    console.log('Goal check already in progress, skipping')
    return
  }
  isChecking = true
  try {
    const goals = getActiveGoals()

    for (const goal of goals) {
      if (!isGoalDue(goal.schedule, goal.last_checked_at)) continue

      try {
        updateGoalStatus(goal.id, 'checking')

        // Trigger a focused agent session for this goal
        await runAgentSession(
          'manual',
          `Goal check: "${goal.title}" — ${goal.description}. Check expression: ${goal.check_expression}. Assess the current state and take appropriate action if needed. Then update the goal status with your findings using the update_goal_status tool.`
        )

        updateGoalStatus(goal.id, 'checked')
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error)
        updateGoalStatus(goal.id, `error: ${errMsg.substring(0, 100)}`)
        console.error(`Goal check failed for ${goal.id}:`, error)
      }
    }
  } finally {
    isChecking = false
  }
}

export function checkSweepGoals(): void {
  // Check goals that only run during sweeps
  const goals = getActiveGoals().filter(g => g.schedule === 'on_sweep')
  for (const goal of goals) {
    updateGoalStatus(goal.id, 'pending_sweep')
  }
}
