import { useState, useEffect } from 'react'
import { useStaggeredEntrance } from '@/hooks/use-staggered-entrance'
import { HeadlineBar } from './headline-bar'
import { StatsRow } from './stats-row'
import { PrioritySection } from './priority-section'
import { ScheduleSection } from './schedule-section'
import { TasksSection } from './tasks-section'
import { LowPrioritySection } from './low-priority-section'
import { BriefingSkeleton } from '@/components/shared/loading-skeleton'
import { ProgressOverlay } from '@/components/shared/progress-overlay'
import { Button } from '@/components/ui/button'
import { Zap, AlertTriangle } from 'lucide-react'
import type { Briefing } from '@/types'

export function BriefingView() {
  const [briefing, setBriefing] = useState<Briefing | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [progressStep, setProgressStep] = useState('')

  useEffect(() => {
    window.api.briefing.latest().then((result) => {
      if (result.briefing) setBriefing(result.briefing)
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    const cleanup = window.api.briefing.onProgress((step) => {
      setProgressStep(step)
    })
    return cleanup
  }, [])

  async function handleGenerate() {
    setGenerating(true)
    setError(null)
    setProgressStep('Starting...')
    const result = await window.api.briefing.generate()
    setGenerating(false)
    setProgressStep('')
    if (result.error) {
      setError(result.error)
    } else if (result.briefing) {
      setBriefing(result.briefing)
    }
  }

  const priorityItems = briefing?.sections.find((s) => s.type === 'priority')?.items ?? []
  const scheduleItems = briefing?.sections.find((s) => s.type === 'schedule')?.items ?? []
  const taskItems = briefing?.sections.find((s) => s.type === 'tasks')?.items ?? []
  const lowPriorityItems = briefing?.sections.find((s) => s.type === 'low_priority')?.items ?? []
  const tomorrowItems = briefing?.sections.find((s) => s.type === 'tomorrow')?.items ?? []

  const totalCards = priorityItems.length + scheduleItems.length + taskItems.length
  const visibleCount = useStaggeredEntrance(totalCards)

  if (loading) return <BriefingSkeleton />

  if (generating) {
    return <ProgressOverlay step={progressStep} />
  }

  if (!briefing) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <Zap className="w-10 h-10 text-amber-500 mb-4" />
        <h3 className="text-[17px] font-semibold mb-2">No briefing yet</h3>
        <p className="text-[14px] text-zinc-500 mb-6 max-w-sm">
          Generate your first morning briefing. Make sure Outlook and Things 3 are running.
        </p>
        {error && (
          <div className="flex items-center gap-2 text-red-400 text-[13px] mb-4">
            <AlertTriangle className="w-4 h-4" />
            {error}
          </div>
        )}
        <Button onClick={handleGenerate} className="bg-primary hover:bg-primary/90">
          <Zap className="w-4 h-4 mr-2" />
          Generate Briefing Now
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {error && (
        <div className="flex items-center gap-2 text-red-400 text-[13px] bg-red-500/10 rounded-lg px-3 py-2">
          <AlertTriangle className="w-4 h-4" />
          {error}
        </div>
      )}
      <HeadlineBar headline={briefing.headline} generatedAt={briefing.generatedAt} />
      <StatsRow stats={briefing.stats} />
      <PrioritySection items={priorityItems} visibleCount={visibleCount} />
      <ScheduleSection
        items={scheduleItems}
        tomorrowItems={tomorrowItems}
        visibleCount={visibleCount}
        offset={priorityItems.length}
      />
      <TasksSection
        items={taskItems}
        visibleCount={visibleCount}
        offset={priorityItems.length + scheduleItems.length}
      />
      <LowPrioritySection items={lowPriorityItems} />

      <div className="pt-2">
        <Button variant="outline" size="sm" onClick={handleGenerate} className="text-[12px]">
          <Zap className="w-3.5 h-3.5 mr-1.5" />
          Regenerate Briefing
        </Button>
      </div>
    </div>
  )
}
