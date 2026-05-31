import { useEffect, useRef } from 'react'
import { useChatStore } from '../stores/chat'
import { ChevronDown, ChevronUp, X, Trash2, Terminal as TermIcon } from 'lucide-react'

export default function Terminal() {
  const activeThreadId = useChatStore((s) => s.activeThreadId)
  const terminalLogs = useChatStore((s) => s.terminalLogs)
  const clearTerminalLogs = useChatStore((s) => s.clearTerminalLogs)
  const toggleTerminal = useChatStore((s) => s.toggleTerminal)
  const [collapsed, setCollapsed] = [false, () => {}] // Always expanded when visible
  const bottomRef = useRef<HTMLDivElement>(null)

  const logs = activeThreadId ? terminalLogs[activeThreadId] ?? [] : []

  // Auto scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs.length])

  const formatTime = (ts: number) => {
    const d = new Date(ts)
    return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }

  return (
    <div className="border-t border-theme bg-theme-secondary flex flex-col" style={{ height: 200 }}>
      {/* Header */}
      <div className="h-8 bg-theme-secondary flex items-center px-3 text-xs text-theme-muted border-b border-theme shrink-0">
        <TermIcon size={12} className="mr-1.5" />
        <span className="font-medium">Terminal</span>
        <span className="ml-2 text-theme-muted">
          {logs.length > 0 ? `${logs.length} entries` : 'No output'}
        </span>
        <div className="ml-auto flex items-center gap-1">
          {logs.length > 0 && (
            <button
              onClick={() => activeThreadId && clearTerminalLogs(activeThreadId)}
              className="p-1 hover:text-theme-secondary transition-colors"
              title="Clear logs"
            >
              <Trash2 size={11} />
            </button>
          )}
          <button
            onClick={toggleTerminal}
            className="p-1 hover:text-red-400 transition-colors"
            title="Close terminal"
          >
            <X size={12} />
          </button>
        </div>
      </div>

      {/* Log content */}
      <div className="flex-1 overflow-y-auto font-mono text-xs px-3 py-2 bg-theme">
        {logs.length === 0 ? (
          <div className="text-theme-muted text-center mt-8">
            CodeWhale 命令执行日志会在这里显示
          </div>
        ) : (
          logs.map((entry) => (
            <div key={entry.id} className="py-0.5 flex gap-2">
              <span className="text-theme-muted shrink-0 w-16 text-right">
                {formatTime(entry.timestamp)}
              </span>
              <span
                className={`shrink-0 w-14 ${
                  entry.type === 'command'
                    ? 'text-accent'
                    : entry.type === 'error'
                    ? 'text-red-400'
                    : entry.type === 'info'
                    ? 'text-green-400'
                    : 'text-theme-secondary'
                }`}
              >
                {entry.type === 'command'
                  ? '$'
                  : entry.type === 'error'
                  ? '!'
                  : entry.type === 'info'
                  ? '✓'
                  : '│'}
              </span>
              <span className="text-theme whitespace-pre-wrap break-all">
                {entry.content}
              </span>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
