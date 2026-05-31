import { Minus, Square, X, Terminal, Brain } from 'lucide-react'
import { useChatStore } from '../stores/chat'

export default function TitleBar() {
  const connected = useChatStore((s) => s.connected)
  const toggleTerminal = useChatStore((s) => s.toggleTerminal)
  const showTerminal = useChatStore((s) => s.showTerminal)
  const toggleThinking = useChatStore((s) => s.toggleThinking)
  const showThinking = useChatStore((s) => s.showThinking)

  return (
    <div
      className="h-9 bg-bg-secondary flex items-center justify-between border-b border-gray-800 select-none"
      style={{ WebkitAppRegion: 'drag' } as any}
    >
      {/* Left: Logo + Title */}
      <div className="flex items-center gap-2 pl-3">
        <img src="./icon.png" alt="CodeWhale" className="w-5 h-5" />
        <span className="text-sm font-medium text-gray-300">
          CodeWhale Desktop
        </span>
      </div>

      {/* Center: nothing */}
      <div />

      {/* Right: Controls */}
      <div
        className="flex items-center h-full"
        style={{ WebkitAppRegion: 'no-drag' } as any}
      >
        {/* Connection indicator */}
        <span
          className={`w-2 h-2 rounded-full mr-3 ${
            connected ? 'bg-green-500' : 'bg-red-500'
          }`}
          title={connected ? 'Connected to CodeWhale' : 'Disconnected'}
        />

        {/* Thinking toggle */}
        <button
          onClick={toggleThinking}
          className={`h-full px-3 flex items-center hover:bg-gray-700 transition-colors ${
            showThinking ? 'text-purple-400' : 'text-gray-500'
          }`}
          title="Toggle Thinking"
        >
          <Brain size={14} />
        </button>

        {/* Terminal toggle */}
        <button
          onClick={toggleTerminal}
          className={`h-full px-3 flex items-center hover:bg-gray-700 transition-colors ${
            showTerminal ? 'text-accent' : 'text-gray-500'
          }`}
          title="Toggle Terminal"
        >
          <Terminal size={14} />
        </button>

        {/* Window buttons */}
        <button
          onClick={() => window.electronAPI.minimize()}
          className="h-full px-3 flex items-center hover:bg-gray-700 text-gray-400 transition-colors"
        >
          <Minus size={14} />
        </button>
        <button
          onClick={() => window.electronAPI.maximize()}
          className="h-full px-3 flex items-center hover:bg-gray-700 text-gray-400 transition-colors"
        >
          <Square size={12} />
        </button>
        <button
          onClick={() => window.electronAPI.close()}
          className="h-full px-3 flex items-center hover:bg-red-600 text-gray-400 hover:text-white transition-colors"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
