import { useState, useEffect, useRef } from 'react'
import { ChatMessage } from './chat-message'
import { ChatInput } from './chat-input'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import type { ChatMessage as ChatMessageType, ChatToolCall } from '@/types'

export function ChatView() {
  const [messages, setMessages] = useState<ChatMessageType[]>([])
  const [streamingText, setStreamingText] = useState('')
  const [toolCalls, setToolCalls] = useState<ChatToolCall[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Load chat history on mount
  useEffect(() => {
    window.api.chat.history().then(({ messages: msgs }) => {
      if (msgs) setMessages(msgs.filter(m => m.role !== 'tool_result'))
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
      // Refresh history to get the saved messages
      window.api.chat.history().then(({ messages: msgs }) => {
        if (msgs) setMessages(msgs.filter(m => m.role !== 'tool_result'))
      })
    })

    return () => {
      unsubChunk()
      unsubTool()
      unsubDone()
    }
  }, [])

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

    // Optimistically add user message
    const tempMsg: ChatMessageType = {
      id: 'temp-' + Date.now(),
      session_id: '',
      role: 'user',
      content: message,
      tool_calls_json: null,
      created_at: new Date().toISOString()
    }
    setMessages(prev => [...prev, tempMsg])

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
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 && !isLoading && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-2">
              <p className="text-[16px] font-medium text-zinc-400">Chat with Antonina</p>
              <p className="text-[13px] text-zinc-600">
                Ask about emails, calendar, tasks, or anything else
              </p>
            </div>
          </div>
        )}

        {messages.map(msg => (
          <ChatMessage key={msg.id} message={msg} />
        ))}

        {/* Streaming response */}
        {isLoading && (
          <div className="space-y-2">
            {toolCalls.map((tc, i) => (
              <div key={i} className="flex items-center gap-2 text-[12px] text-zinc-500">
                <div className={`w-2 h-2 rounded-full ${tc.status === 'start' ? 'bg-amber-500 animate-pulse' : tc.status === 'done' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                <span className="font-mono">{tc.toolName}</span>
                {tc.status === 'start' && <span className="text-zinc-600">running...</span>}
                {tc.result && <span className="text-zinc-600 truncate max-w-[300px]">{tc.result}</span>}
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

      {/* Input area */}
      <div className="border-t border-border/50 px-6 py-3">
        <div className="flex items-end gap-2">
          <ChatInput onSend={handleSend} disabled={isLoading} />
          {messages.length > 0 && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleClear}
              className="h-9 w-9 p-0 text-zinc-500 hover:text-zinc-300 shrink-0"
              title="Clear chat"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
