import { useState, useEffect, useRef } from 'react'
import { ChatMessage } from '../chat/chat-message'
import { ChatInput } from '../chat/chat-input'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import type { ChatMessage as ChatMessageType, ChatToolCall } from '@/types'

interface CalendarChatProps {
  onEventsChanged: () => void
}

export function CalendarChat({ onEventsChanged }: CalendarChatProps) {
  const [messages, setMessages] = useState<ChatMessageType[]>([])
  const [streamingText, setStreamingText] = useState('')
  const [toolCalls, setToolCalls] = useState<ChatToolCall[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Load last few messages on mount
  useEffect(() => {
    window.api.chat.history().then(({ messages: msgs }) => {
      if (msgs) {
        const filtered = msgs.filter(m => m.role !== 'tool_result')
        setMessages(filtered.slice(-6))
      }
    })
  }, [])

  // Subscribe to streaming events
  useEffect(() => {
    const unsubChunk = window.api.chat.onChunk((chunk) => {
      setStreamingText(prev => prev + chunk)
    })
    const unsubTool = window.api.chat.onToolCall((data) => {
      const tc = data as ChatToolCall
      setToolCalls(prev => {
        const existing = prev.findIndex(t => t.toolName === tc.toolName && t.status === 'start')
        if (tc.status !== 'start' && existing >= 0) {
          const updated = [...prev]
          updated[existing] = tc
          return updated
        }
        return [...prev, tc]
      })
    })
    const unsubDone = window.api.chat.onDone(() => {
      setIsLoading(false)
      setStreamingText('')
      setToolCalls([])
      // Refresh messages and events
      window.api.chat.history().then(({ messages: msgs }) => {
        if (msgs) {
          const filtered = msgs.filter(m => m.role !== 'tool_result')
          setMessages(filtered.slice(-6))
        }
      })
      onEventsChanged()
    })

    return () => {
      unsubChunk()
      unsubTool()
      unsubDone()
    }
  }, [onEventsChanged])

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, streamingText, toolCalls])

  async function handleSend(message: string) {
    setIsLoading(true)
    setStreamingText('')
    setToolCalls([])

    const tempMsg: ChatMessageType = {
      id: 'temp-' + Date.now(),
      session_id: '',
      role: 'user',
      content: message,
      tool_calls_json: null,
      created_at: new Date().toISOString()
    }
    setMessages(prev => [...prev.slice(-5), tempMsg])

    try {
      await window.api.chat.send(message)
    } catch (error) {
      setIsLoading(false)
      const errMsg = error instanceof Error ? error.message : 'Something went wrong'
      setMessages(prev => [...prev, {
        id: 'error-' + Date.now(),
        session_id: '',
        role: 'assistant',
        content: `Error: ${errMsg}`,
        tool_calls_json: null,
        created_at: new Date().toISOString()
      }])
    }
  }

  async function handleClear() {
    await window.api.chat.clear()
    setMessages([])
    setStreamingText('')
    setToolCalls([])
  }

  return (
    <div className="flex flex-col border-t border-border/50 h-[280px]">
      {/* Header with clear button */}
      {messages.length > 0 && (
        <div className="flex items-center justify-end px-4 pt-2">
          <Button
            size="sm"
            variant="ghost"
            className="text-[11px] h-6 text-zinc-500 hover:text-zinc-300"
            onClick={handleClear}
            disabled={isLoading}
          >
            <Trash2 className="w-3 h-3 mr-1" />
            Clear chat
          </Button>
        </div>
      )}
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && !isLoading && (
          <div className="flex items-center justify-center h-full">
            <p className="text-[13px] text-zinc-600">
              Ask Antonina to create, reschedule, or check your calendar
            </p>
          </div>
        )}

        {messages.map(msg => (
          <ChatMessage key={msg.id} message={msg} />
        ))}

        {isLoading && (
          <div className="space-y-2">
            {toolCalls.map((tc, i) => (
              <div key={i} className="flex items-center gap-2 text-[12px] text-zinc-500">
                <div className={`w-2 h-2 rounded-full ${tc.status === 'start' ? 'bg-amber-500 animate-pulse' : tc.status === 'done' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                <span className="font-mono">{tc.toolName}</span>
                {tc.status === 'start' && <span className="text-zinc-600">running...</span>}
              </div>
            ))}
            {streamingText && (
              <ChatMessage
                message={{
                  id: 'streaming',
                  session_id: '',
                  role: 'assistant',
                  content: streamingText,
                  tool_calls_json: null,
                  created_at: new Date().toISOString()
                }}
              />
            )}
            {!streamingText && toolCalls.length === 0 && (
              <div className="flex items-center gap-2 text-[13px] text-zinc-500">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                Thinking...
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="px-4 py-2">
        <ChatInput
          onSend={handleSend}
          disabled={isLoading}
          placeholder="Book a meeting, reschedule, or ask about your schedule... (Cmd+Enter)"
        />
      </div>
    </div>
  )
}
