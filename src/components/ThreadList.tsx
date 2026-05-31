import { useState, useCallback } from 'react'
import { Plus, MessageSquare, Trash2, Settings as SettingsIcon, Edit3 } from 'lucide-react'
import { useChatStore } from '../stores/chat'
import Settings from './Settings'
import ContextMenu from './ContextMenu'

interface CtxMenu {
  x: number
  y: number
  threadId: string
}

export default function ThreadList() {
  const threads = useChatStore((s) => s.threads)
  const activeThreadId = useChatStore((s) => s.activeThreadId)
  const selectThread = useChatStore((s) => s.selectThread)
  const createThread = useChatStore((s) => s.createThread)
  const deleteThread = useChatStore((s) => s.deleteThread)
  const renameThread = useChatStore((s) => s.renameThread)
  const [showSettings, setShowSettings] = useState(false)
  const [ctxMenu, setCtxMenu] = useState<CtxMenu | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  const formatTime = (iso: string) => {
    const d = new Date(iso)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    if (diffMin < 1) return 'now'
    if (diffMin < 60) return `${diffMin}m`
    const diffH = Math.floor(diffMin / 60)
    if (diffH < 24) return `${diffH}h`
    return `${Math.floor(diffH / 24)}d`
  }

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, threadId: string) => {
      e.preventDefault()
      e.stopPropagation()
      setCtxMenu({ x: e.clientX, y: e.clientY, threadId })
    },
    []
  )

  const handleRename = (threadId: string) => {
    const thread = threads.find((t) => t.id === threadId)
    setRenameValue(thread?.title || '')
    setRenamingId(threadId)
  }

  const confirmRename = () => {
    if (renamingId && renameValue.trim()) {
      renameThread(renamingId, renameValue.trim())
    }
    setRenamingId(null)
    setRenameValue('')
  }

  return (
    <div className="w-56 bg-bg-secondary border-r border-gray-800 flex flex-col shrink-0 relative">
      {/* New thread button */}
      <button
        onClick={() => createThread()}
        className="m-2 px-3 py-2 bg-bg-tertiary hover:bg-blue-900 text-gray-300 hover:text-white rounded-md flex items-center gap-2 text-sm transition-colors"
      >
        <Plus size={14} />
        新建对话
      </button>

      {/* Thread list */}
      <div className="flex-1 overflow-y-auto">
        {threads.map((thread) => (
          <div
            key={thread.id}
            onClick={() => selectThread(thread.id)}
            onContextMenu={(e) => handleContextMenu(e, thread.id)}
            className={`group flex items-center gap-2 px-3 py-2.5 cursor-pointer transition-colors border-l-2 ${
              activeThreadId === thread.id
                ? 'bg-bg-tertiary border-accent text-white'
                : 'border-transparent hover:bg-gray-800 text-gray-400'
            }`}
          >
            <MessageSquare size={14} className="shrink-0 opacity-60" />
            <div className="flex-1 min-w-0">
              {renamingId === thread.id ? (
                <input
                  autoFocus
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={confirmRename}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') confirmRename()
                    if (e.key === 'Escape') {
                      setRenamingId(null)
                      setRenameValue('')
                    }
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full bg-bg-primary text-sm text-gray-200 px-1 py-0.5 rounded border border-accent outline-none"
                />
              ) : (
                <div className="text-sm truncate">
                  {thread.title || 'New conversation'}
                </div>
              )}
              <div className="text-xs text-gray-600 mt-0.5">
                {formatTime(thread.updated_at)}
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation()
                deleteThread(thread.id)
              }}
              className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-all"
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}

        {threads.length === 0 && (
          <div className="text-center text-gray-600 text-sm mt-8 px-4">
            No conversations yet.
            <br />
            Click "新建对话" to start.
          </div>
        )}
      </div>

      {/* Settings button */}
      <button
        onClick={() => setShowSettings(true)}
        className="m-2 px-3 py-2 hover:bg-gray-800 text-gray-500 hover:text-gray-300 rounded-md flex items-center gap-2 text-sm transition-colors"
      >
        <SettingsIcon size={14} />
        Settings
      </button>

      {/* Context menu */}
      {ctxMenu && (
        <ContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          items={[
            {
              label: '重命名',
              icon: <Edit3 size={14} />,
              onClick: () => handleRename(ctxMenu.threadId),
            },
            {
              label: '删除',
              icon: <Trash2 size={14} />,
              onClick: () => deleteThread(ctxMenu.threadId),
              danger: true,
            },
          ]}
          onClose={() => setCtxMenu(null)}
        />
      )}

      {/* Settings modal */}
      {showSettings && <Settings onClose={() => setShowSettings(false)} />}
    </div>
  )
}
