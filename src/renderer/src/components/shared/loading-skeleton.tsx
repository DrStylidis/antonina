import { Skeleton } from '@/components/ui/skeleton'

export { BriefingLoadingSkeleton as BriefingSkeleton }
export function BriefingLoadingSkeleton() {
  return (
    <div className="space-y-6 max-w-4xl animate-in fade-in duration-300">
      {/* Headline skeleton */}
      <div className="rounded-xl bg-card border border-border/50 p-5">
        <div className="flex items-start gap-3">
          <Skeleton className="w-5 h-5 rounded" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      </div>

      {/* Stats skeleton */}
      <div className="grid grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl bg-card border border-border/50 p-4 space-y-2">
            <Skeleton className="w-4 h-4 rounded" />
            <Skeleton className="h-8 w-12" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>

      {/* Cards skeleton */}
      <div className="space-y-3">
        <Skeleton className="h-3 w-16" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl bg-card border border-border/50 p-4 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-4/5" />
          </div>
        ))}
      </div>
    </div>
  )
}

export { EmailListLoadingSkeleton as EmailListSkeleton }
export function EmailListLoadingSkeleton() {
  return (
    <div className="space-y-0">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="px-3 py-3 border-b border-border/30 flex items-start gap-2.5">
          <Skeleton className="w-2 h-2 rounded-full mt-1.5" />
          <div className="flex-1 space-y-1.5">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-3 w-10" />
            </div>
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-2.5 w-full" />
          </div>
        </div>
      ))}
    </div>
  )
}

export { ScheduleLoadingSkeleton as ScheduleSkeleton }
export function ScheduleLoadingSkeleton() {
  return (
    <div className="max-w-3xl space-y-3">
      <div className="flex items-center gap-3 mb-6">
        <Skeleton className="w-5 h-5 rounded" />
        <Skeleton className="h-6 w-52" />
      </div>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-xl bg-card border border-border/50 p-4 space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-40" />
          <div className="flex gap-1 mt-2">
            {Array.from({ length: 3 }).map((_, j) => (
              <Skeleton key={j} className="w-7 h-7 rounded-full" />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export { TasksLoadingSkeleton as TasksSkeleton }
export function TasksLoadingSkeleton() {
  return (
    <div className="max-w-3xl space-y-6">
      {['Overdue', 'Due Today', 'Upcoming'].map(section => (
        <div key={section} className="space-y-3">
          <Skeleton className="h-3 w-20" />
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="rounded-xl bg-card border border-border/50 p-4 flex items-start gap-3">
              <Skeleton className="w-5 h-5 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-5 w-12 rounded-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
