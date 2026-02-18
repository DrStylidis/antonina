import { Sparkles } from 'lucide-react'

interface HeadlineBarProps {
  headline: string
  generatedAt: string
}

export function HeadlineBar({ headline, generatedAt }: HeadlineBarProps) {
  const time = new Date(generatedAt).toLocaleTimeString('en-SE', {
    hour: '2-digit',
    minute: '2-digit'
  })

  return (
    <div className="rounded-xl bg-card border border-border/50 border-l-2 border-l-amber-500 p-5">
      <div className="flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
        <div>
          <p className="text-[20px] font-semibold leading-tight">{headline}</p>
          <p className="text-[12px] text-zinc-500 mt-2">Generated at {time}</p>
        </div>
      </div>
    </div>
  )
}
