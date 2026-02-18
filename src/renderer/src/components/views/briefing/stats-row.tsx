import { Mail, AlertCircle, Calendar, CheckSquare } from 'lucide-react'
import { useCountUp } from '@/hooks/use-count-up'
import type { BriefingStats } from '@/types'

interface StatCardProps {
  icon: React.ReactNode
  value: number
  label: string
  color: string
}

function StatCard({ icon, value, label, color }: StatCardProps) {
  const count = useCountUp(value)

  return (
    <div className="rounded-xl bg-card border border-border/50 p-4 transition-all duration-200 hover:border-border hover:shadow-lg hover:shadow-black/20">
      <div className="flex items-center gap-2 mb-2">
        <div className={color}>{icon}</div>
      </div>
      <p className={`text-[28px] font-bold tabular-nums ${color}`}>{count}</p>
      <p className="text-[12px] text-zinc-500 mt-0.5">{label}</p>
    </div>
  )
}

interface StatsRowProps {
  stats: BriefingStats
}

export function StatsRow({ stats }: StatsRowProps) {
  return (
    <div className="grid grid-cols-4 gap-3">
      <StatCard
        icon={<Mail className="w-4 h-4" />}
        value={stats.emailsProcessed}
        label="Emails processed"
        color="text-blue-500"
      />
      <StatCard
        icon={<AlertCircle className="w-4 h-4" />}
        value={stats.emailsNeedAttention}
        label="Need attention"
        color="text-amber-500"
      />
      <StatCard
        icon={<Calendar className="w-4 h-4" />}
        value={stats.meetingsToday}
        label="Meetings today"
        color="text-indigo-400"
      />
      <StatCard
        icon={<CheckSquare className="w-4 h-4" />}
        value={stats.tasksDue}
        label="Tasks due"
        color="text-emerald-500"
      />
    </div>
  )
}
