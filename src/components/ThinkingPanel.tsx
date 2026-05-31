import { useEffect, useRef, useMemo } from 'react'
import { useChatStore, LogEntry } from '../stores/chat'
import { Brain, Trash2, X } from 'lucide-react'

export default function ThinkingPanel() {
  const activeThreadId = useChatStore((s) => s.activeThreadId)
  const thinkingLogs = useChatStore((s) => s.thinkingLogs)
  const clearThinkingLogs = useChatStore((s) => s.clearThinkingLogs)
  const toggleThinking = useChatStore((s) => s.toggleThinking)
  const bottomRef = useRef<HTMLDivElement>(null)

  const logs = activeThreadId ? thinkingLogs[activeThreadId] ?? [] : []

  // Merge consecutive output entries into blocks
  const blocks = useMemo(() => {
    const result: { type: 'info' | 'thinking'; content: string; timestamp: number }[] = []
    let currentThinking = ''

    for (const entry of logs) {
      if (entry.type === 'info') {
        // Flush any accumulated thinking
        if (currentThinking) {
          result.push({ type: 'thinking', content: currentThinking.trim(), timestamp: entry.timestamp })
          currentThinking = ''
        }
        result.push({ type: 'info', content: entry.content, timestamp: entry.timestamp })
      } else {
        // Accumulate output text
        currentThinking += entry.content
      }
    }
    // Flush remaining
    if (currentThinking) {
      result.push({ type: 'thinking', content: currentThinking.trim(), timestamp: Date.now() })
    }
    return result
  }, [logs])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [blocks.length, logs.length])

  const formatTime = (ts: number) => {
    const d = new Date(ts)
    return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }

  return (
    <div className="bg-theme-secondary flex flex-col border-b border-theme" style={{ height: 200 }}>
      {/* Header */}
      <div className="h-8 bg-theme-secondary flex items-center px-3 text-xs text-theme-muted border-b border-theme shrink-0">
        <Brain size={12} className="mr-1.5 text-purple-400" />
        <span className="font-medium">Thinking</span>
        <span className="ml-2 text-theme-muted">
          {blocks.length > 0 ? `${blocks.filter(b => b.type === 'thinking').length} rounds` : 'No reasoning'}
        </span>
        <div className="ml-auto flex items-center gap-1">
          {logs.length > 0 && (
            <button
              onClick={() => activeThreadId && clearThinkingLogs(activeThreadId)}
              className="p-1 hover:text-theme-secondary transition-colors"
              title="Clear"
            >
              <Trash2 size={11} />
            </button>
          )}
          <button
            onClick={toggleThinking}
            className="p-1 hover:text-red-400 transition-colors"
            title="Close"
          >
            <X size={12} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto text-xs px-3 py-2 bg-theme">
        {blocks.length === 0 ? (
          <div className="text-theme-muted text-center mt-8">
            AI 思维链过程会在这里显示
          </div>
        ) : (
          blocks.map((block, i) => (
            <div key={i} className="mb-3">
              {block.type === 'info' ? (
                <div className="flex items-center gap-2 text-purple-400 mb-1">
                  <span className="text-theme-muted w-16 text-right shrink-0 font-mono">
                    {formatTime(block.timestamp)}
                  </span>
                  <span>◆</span>
                  <span>{block.content}</span>
                </div>
              ) : (
                <div className="ml-16 pl-3 border-l-2 border-purple-800 text-theme-secondary leading-relaxed whitespace-pre-wrap">
                  {block.content}
                </div>
              )}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
