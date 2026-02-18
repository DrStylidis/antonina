import { cn } from '@/lib/utils'
import type { ChatMessage as ChatMessageType } from '@/types'

interface ChatMessageProps {
  message: ChatMessageType
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user'

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[80%] rounded-2xl px-4 py-2.5',
          isUser
            ? 'bg-primary text-primary-foreground rounded-br-md'
            : 'bg-zinc-800/70 text-zinc-200 rounded-bl-md'
        )}
      >
        <div className="text-[14px] leading-relaxed whitespace-pre-wrap">
          {message.content}
        </div>
        <div className={cn(
          'text-[10px] mt-1',
          isUser ? 'text-primary-foreground/50' : 'text-zinc-600'
        )}>
          {new Date(message.created_at).toLocaleTimeString('en-SE', {
            hour: '2-digit',
            minute: '2-digit'
          })}
        </div>
      </div>
    </div>
  )
}
