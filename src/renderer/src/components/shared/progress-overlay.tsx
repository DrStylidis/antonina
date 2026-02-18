import { Loader2 } from 'lucide-react'

interface ProgressOverlayProps {
  isVisible?: boolean
  step: string
}

export function ProgressOverlay({ isVisible = true, step }: ProgressOverlayProps) {
  if (!isVisible) return null

  return (
    <div className="flex flex-col items-center justify-center h-[60vh]">
      <div className="rounded-2xl bg-card border border-border/50 p-8 w-[360px] shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <Loader2 className="w-5 h-5 text-primary animate-spin" />
          <h3 className="text-[15px] font-semibold">Generating Briefing</h3>
        </div>
        <p className="text-[13px] text-zinc-400">{step}</p>
      </div>
    </div>
  )
}
