import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Circle, CheckCircle2, Calendar } from 'lucide-react'
import type { Task } from '@/types'

interface TaskCardProps {
  task: Task
  index: number
  visibleCount: number
  onComplete?: (taskId: string) => void
}

export function TaskCard({ task, index, visibleCount, onComplete }: TaskCardProps) {
  return (
    <div
      className={cn(
        'rounded-xl bg-card border border-border/50 p-4 hover:bg-zinc-800 hover:border-border hover:shadow-lg hover:shadow-black/20 transition-all duration-200',
        task.isOverdue && 'border-l-2 border-l-red-500',
        index < visibleCount ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'
      )}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <button
          className="mt-0.5 shrink-0"
          onClick={() => !task.completed && onComplete?.(task.id)}
        >
          {task.completed ? (
            <CheckCircle2 className="w-5 h-5 text-green-500" />
          ) : (
            <Circle className="w-5 h-5 text-zinc-600 hover:text-zinc-400 transition-colors" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <p className={cn(
            'text-[15px] font-semibold',
            task.completed && 'line-through text-zinc-600'
          )}>
            {task.name}
          </p>

          {task.notes && (
            <p className="text-[13px] text-zinc-500 mt-1 truncate">{task.notes}</p>
          )}

          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {task.project && (
              <Badge variant="outline" className="text-[11px] h-5">
                {task.project}
              </Badge>
            )}
            {task.dueDate && (
              <div className={cn(
                'flex items-center gap-1 text-[11px]',
                task.isOverdue ? 'text-red-400' : 'text-zinc-500'
              )}>
                <Calendar className="w-3 h-3" />
                {new Date(task.dueDate).toLocaleDateString('en-SE', { month: 'short', day: 'numeric' })}
              </div>
            )}
            {task.isOverdue && (
              <Badge className="bg-red-500/10 text-red-400 border-red-500/20 text-[10px] h-4">
                Overdue
              </Badge>
            )}
            {task.tags.map(tag => (
              <Badge key={tag} variant="secondary" className="text-[10px] h-4 px-1.5">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
