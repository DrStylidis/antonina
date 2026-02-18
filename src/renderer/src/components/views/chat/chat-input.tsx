import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Send } from 'lucide-react'

interface ChatInputProps {
  onSend: (message: string) => void
  disabled?: boolean
  placeholder?: string
}

export function ChatInput({ onSend, disabled, placeholder }: ChatInputProps) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px'
    }
  }, [value])

  function handleSubmit() {
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setValue('')
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="flex-1 flex items-end gap-2 bg-zinc-800/50 rounded-xl border border-border/50 px-3 py-2">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder ?? "Ask Antonina anything... (Cmd+Enter to send)"}
        disabled={disabled}
        rows={1}
        className="flex-1 bg-transparent text-[14px] text-zinc-200 placeholder:text-zinc-600 resize-none focus:outline-none min-h-[24px] max-h-[120px]"
      />
      <Button
        size="sm"
        variant="ghost"
        onClick={handleSubmit}
        disabled={disabled || !value.trim()}
        className="h-8 w-8 p-0 text-primary hover:text-primary/80 shrink-0"
      >
        <Send className="w-4 h-4" />
      </Button>
    </div>
  )
}
