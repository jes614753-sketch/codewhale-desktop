import { useState, useRef, useEffect } from 'react'
import { useChatStore } from '../stores/chat'
import { Send, Square } from 'lucide-react'

export default function InputBox() {
  const [input, setInput] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const sendMessage = useChatStore((s) => s.sendMessage)
  const activeThreadId = useChatStore((s) => s.activeThreadId)
  const activeTurnId = useChatStore((s) => s.activeTurnId)
  const interrupt = useChatStore((s) => s.interrupt)
  const connected = useChatStore((s) => s.connected)
  const createThread = useChatStore((s) => s.createThread)

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current
    if (ta) {
      ta.style.height = 'auto'
      ta.style.height = Math.min(ta.scrollHeight, 150) + 'px'
    }
  }, [input])

  const handleSend = async () => {
    const text = input.trim()
    if (!text) return

    // Create thread if none active
    if (!activeThreadId) {
      const id = await createThread()
      if (!id) return
    }

    setInput('')
    await sendMessage(text)

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const isStreaming = !!activeTurnId

  return (
    <div className="border-t border-gray-800 px-4 py-3">
      <div className="flex items-end gap-2 bg-bg-secondary rounded-lg border border-gray-700 focus-within:border-accent transition-colors">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            connected
              ? '输入消息... (Shift+Enter 换行)'
              : '等待 CodeWhale 连接...'
          }
          disabled={!connected}
          rows={1}
          className="flex-1 bg-transparent px-3 py-2.5 text-sm text-gray-200 placeholder-gray-600 resize-none outline-none max-h-[150px]"
        />

        {isStreaming ? (
          <button
            onClick={interrupt}
            className="p-2.5 text-red-400 hover:text-red-300 transition-colors"
            title="Stop generation"
          >
            <Square size={16} />
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={!input.trim() || !connected}
            className="p-2.5 text-accent hover:text-blue-300 disabled:text-gray-700 transition-colors"
            title="Send message"
          >
            <Send size={16} />
          </button>
        )}
      </div>
    </div>
  )
}
