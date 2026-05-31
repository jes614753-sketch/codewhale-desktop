import { useState } from 'react'
import { marked } from 'marked'
import { Message } from '../stores/chat'
import { useSettingsStore } from '../stores/settings'
import { User, Wrench, Copy, Check } from 'lucide-react'

marked.setOptions({ breaks: true, gfm: true })

interface Props {
  message: Message
}

export default function MessageBubble({ message }: Props) {
  const { role, content, status } = message
  const userAvatar = useSettingsStore((s) => s.userAvatar)
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const renderContent = () => {
    if (role === 'assistant') {
      const html = marked.parse(content) as string
      return (
        <div
          className="prose prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      )
    }
    return <div className="whitespace-pre-wrap">{content}</div>
  }

  const userIcon = userAvatar ? (
    <img src={userAvatar} alt="me" className="w-full h-full rounded-full object-cover" />
  ) : (
    <User size={16} />
  )

  const botIcon =
    role === 'tool' ? (
      <Wrench size={16} />
    ) : (
      <img src="./icon.png" alt="🐋" className="w-4 h-4" />
    )

  const bgColor =
    role === 'user'
      ? 'bg-bubble-user'
      : role === 'tool'
      ? 'bg-gray-800 border border-gray-700'
      : role === 'system'
      ? 'bg-yellow-900/30 border border-yellow-800/50'
      : 'bg-bubble-ai'

  return (
    <div className={`flex gap-3 py-2 ${role === 'user' ? 'justify-end' : ''}`}>
      {role !== 'user' && (
        <div className="w-7 h-7 rounded-full bg-bg-tertiary flex items-center justify-center text-accent shrink-0 mt-1 overflow-hidden">
          {botIcon}
        </div>
      )}

      <div className={`max-w-[80%] ${role === 'user' ? '' : ''}`}>
        <div
          className={`rounded-lg px-3.5 py-2.5 text-sm selectable ${bgColor}`}
        >
          {renderContent()}
          {status === 'streaming' && (
            <span className="inline-block w-1.5 h-4 bg-accent animate-pulse ml-0.5" />
          )}
        </div>

        {/* Copy button for assistant messages */}
        {role === 'assistant' && status !== 'streaming' && (
          <div className="flex justify-start mt-1">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-xs text-theme-muted hover:text-theme-secondary hover:bg-gray-800 transition-colors"
              title="Copy message"
            >
              {copied ? (
                <>
                  <Check size={12} className="text-green-400" />
                  <span className="text-green-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy size={12} />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {role === 'user' && (
        <div className="w-7 h-7 rounded-full bg-bg-tertiary flex items-center justify-center text-gray-400 shrink-0 mt-1 overflow-hidden">
          {userIcon}
        </div>
      )}
    </div>
  )
}
