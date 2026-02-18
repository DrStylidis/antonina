import { useState, useEffect } from 'react'
import { useStaggeredEntrance } from '@/hooks/use-staggered-entrance'
import { TaskCard } from './task-card'
import { TasksSkeleton } from '@/components/shared/loading-skeleton'
import { AlertTriangle, CheckSquare, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Task } from '@/types'

export function TasksView() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function fetchTasks() {
    setLoading(true)
    setError(null)
    const result = await window.api.tasks.today()
    if (result.error) setError(result.error)
    setTasks(result.tasks ?? [])
    setLoading(false)
  }

  useEffect(() => {
    fetchTasks()
  }, [])

  const today = new Date().toISOString().split('T')[0]
  const overdue = tasks.filter((t) => t.isOverdue)
  const dueToday = tasks.filter((t) => !t.isOverdue && t.dueDate === today)
  const upcoming = tasks.filter((t) => !t.isOverdue && t.dueDate !== today)

  const totalTasks = overdue.length + dueToday.length + upcoming.length
  const visibleCount = useStaggeredEntrance(totalTasks)

  async function handleComplete(taskId: string) {
    const result = await window.api.tasks.complete(taskId)
    if (result.error) {
      setError(result.error)
    } else {
      // Optimistically mark as completed, then refresh
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, completed: true } : t))
      fetchTasks()
    }
  }

  if (loading) return <TasksSkeleton />

  let offset = 0

  return (
    <div className="max-w-3xl space-y-6">
      {error && (
        <div className="flex items-center gap-2 text-amber-400 text-[13px] bg-amber-500/10 rounded-lg px-3 py-2">
          <AlertTriangle className="w-4 h-4" />
          {error}
          <Button
            size="sm"
            variant="ghost"
            onClick={fetchTasks}
            className="ml-auto text-zinc-400 h-6"
          >
            <RefreshCw className="w-3 h-3" />
          </Button>
        </div>
      )}

      {tasks.length === 0 && !error ? (
        <div className="text-center py-12">
          <CheckSquare className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
          <p className="text-[14px] text-zinc-500">No tasks for today</p>
          <p className="text-[12px] text-zinc-600 mt-1">Make sure Things 3 is running</p>
        </div>
      ) : (
        <>
          {/* Overdue */}
          {overdue.length > 0 && (
            <div>
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-red-400 mb-3">
                Overdue ({overdue.length})
              </h3>
              <div className="space-y-3">
                {overdue.map((task, i) => {
                  const idx = offset + i
                  return (
                    <TaskCard key={task.id} task={task} index={idx} visibleCount={visibleCount} onComplete={handleComplete} />
                  )
                })}
              </div>
              {(() => {
                offset += overdue.length
                return null
              })()}
            </div>
          )}

          {/* Due Today */}
          {dueToday.length > 0 && (
            <div>
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-amber-500 mb-3">
                Due Today ({dueToday.length})
              </h3>
              <div className="space-y-3">
                {dueToday.map((task, i) => {
                  const idx = offset + i
                  return (
                    <TaskCard key={task.id} task={task} index={idx} visibleCount={visibleCount} onComplete={handleComplete} />
                  )
                })}
              </div>
              {(() => {
                offset += dueToday.length
                return null
              })()}
            </div>
          )}

          {/* Upcoming */}
          {upcoming.length > 0 && (
            <div>
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-blue-400 mb-3">
                Upcoming ({upcoming.length})
              </h3>
              <div className="space-y-3">
                {upcoming.map((task, i) => {
                  const idx = offset + i
                  return (
                    <TaskCard key={task.id} task={task} index={idx} visibleCount={visibleCount} onComplete={handleComplete} />
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
