import { useEffect, useRef } from 'react'
import { useChatStore } from '../stores/chat'
import MessageBubble from './MessageBubble'
import InputBox from './InputBox'
import { Loader2 } from 'lucide-react'

export default function ChatPanel() {
  const activeThreadId = useChatStore((s) => s.activeThreadId)
  const messages = useChatStore((s) => s.messages)
  const streamingItems = useChatStore((s) => s.streamingItems)
  const activeTurnId = useChatStore((s) => s.activeTurnId)
  const connected = useChatStore((s) => s.connected)
  const bottomRef = useRef<HTMLDivElement>(null)

  const threadMessages = activeThreadId ? messages[activeThreadId] ?? [] : []

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [threadMessages.length, streamingItems])

  if (!activeThreadId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-gray-600">
        <div className="text-6xl mb-4">🐋</div>
        <div className="text-lg mb-2">Welcome to CodeWhale</div>
        <div className="text-sm">
          {connected
            ? 'Select a conversation or create a new one'
            : 'Connecting to CodeWhale engine...'}
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {threadMessages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {/* Streaming items (not yet finalized) */}
        {Object.entries(streamingItems).map(([itemId, text]) => (
          <MessageBubble
            key={`streaming-${itemId}`}
            message={{
              id: itemId,
              role: 'assistant',
              content: text,
              timestamp: Date.now(),
              status: 'streaming',
            }}
          />
        ))}

        {/* Thinking indicator */}
        {activeTurnId && Object.keys(streamingItems).length === 0 && (
          <div className="flex items-center gap-2 text-gray-500 text-sm py-3 px-4">
            <Loader2 size={14} className="animate-spin" />
            <span>Thinking...</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <InputBox />
    </div>
  )
}
