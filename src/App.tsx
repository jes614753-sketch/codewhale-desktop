import { useEffect, useState } from 'react'
import { useChatStore } from './stores/chat'
import { checkHealth, onSseEvent, onSseClosed, resolveApproval } from './lib/api'
import TitleBar from './components/TitleBar'
import ThreadList from './components/ThreadList'
import ChatPanel from './components/ChatPanel'
import Terminal from './components/Terminal'
import ThinkingPanel from './components/ThinkingPanel'
import UsagePanel from './components/UsagePanel'

export default function App() {
  const connected = useChatStore((s) => s.connected)
  const setConnected = useChatStore((s) => s.setConnected)
  const loadThreads = useChatStore((s) => s.loadThreads)
  const showTerminal = useChatStore((s) => s.showTerminal)
  const showThinking = useChatStore((s) => s.showThinking)
  const appendDelta = useChatStore((s) => s.appendDelta)
  const finalizeItem = useChatStore((s) => s.finalizeItem)
  const setActiveTurnId = useChatStore((s) => s.setActiveTurnId)
  const addMessage = useChatStore((s) => s.addMessage)
  const addTerminalLog = useChatStore((s) => s.addTerminalLog)
  const addThinkingLog = useChatStore((s) => s.addThinkingLog)
  const setLastSeq = useChatStore((s) => s.setLastSeq)
  const [ready, setReady] = useState(false)
  const [cwStatus, setCwStatus] = useState<'starting' | 'ready' | 'stopped'>('starting')

  // Listen for CodeWhale status from main process
  useEffect(() => {
    const unsub = window.electronAPI.onCwStatus((status) => {
      if (status === 'ready') setCwStatus('ready')
      else if (status === 'stopped') setCwStatus('stopped')
    })
    return unsub
  }, [])

  // Health check polling
  useEffect(() => {
    const poll = async () => {
      const ok = await checkHealth()
      setConnected(ok)
      if (ok && !ready) {
        await loadThreads()
        setReady(true)
        setCwStatus('ready')
      }
    }
    poll()
    const interval = setInterval(poll, 3000)
    return () => clearInterval(interval)
  }, [ready])

  // SSE event handler
  useEffect(() => {
    const activeTurnId = useChatStore.getState().activeTurnId

    const unsubscribe = onSseEvent(({ threadId, event, data }) => {
      // Track seq to avoid replaying old events
      if (data?.seq) setLastSeq(data.seq)

      // Get current activeTurnId dynamically
      const currentTurnId = useChatStore.getState().activeTurnId
      const eventTurnId = data?.turn_id

      // For delta/completion/started events, only process if turn matches
      const isProcessable = event === 'item.delta' || event === 'item.completed' || event === 'item.started'
      if (isProcessable && currentTurnId && eventTurnId && eventTurnId !== currentTurnId) {
        return // Skip events from old turns
      }

      if (event === 'item.started' && data?.payload) {
        const item = data.payload.item ?? data.payload
        // Log all non-message items to terminal
        if (item.kind !== 'user_message' && item.kind !== 'agent_message' && item.kind !== 'agent_reasoning') {
          addTerminalLog(threadId, {
            id: `${data.item_id}-start`,
            type: item.kind === 'command_execution' ? 'command' : 'info',
            content: `[${item.kind}] ${item.summary || item.detail || 'Processing...'}`,
            timestamp: Date.now(),
            turnId: data.turn_id,
          })
        }
        // Log reasoning start to thinking panel
        if (item.kind === 'agent_reasoning') {
          addThinkingLog(threadId, {
            id: `${data.item_id}-start`,
            type: 'info',
            content: '💭 Thinking...',
            timestamp: Date.now(),
            turnId: data.turn_id,
          })
        }
      } else if (event === 'item.delta' && data?.payload) {
        const itemId = data.item_id
        const { delta, kind } = data.payload
        if (kind === 'agent_message' && delta) {
          appendDelta(threadId, itemId, delta)
        }
        // Stream reasoning to thinking panel
        if (kind === 'agent_reasoning' && delta) {
          addThinkingLog(threadId, {
            id: `${itemId}-think-${Date.now()}`,
            type: 'output',
            content: delta,
            timestamp: Date.now(),
            turnId: data.turn_id,
          })
        }
        // Stream tool/command output to terminal
        if (kind !== 'agent_message' && kind !== 'agent_reasoning' && delta) {
          addTerminalLog(threadId, {
            id: `${itemId}-delta-${Date.now()}`,
            type: 'output',
            content: delta,
            timestamp: Date.now(),
            turnId: data.turn_id,
          })
        }
      } else if (event === 'item.completed' && data?.payload) {
        const itemId = data.item_id
        const item = data.payload.item ?? data.payload
        finalizeItem(threadId, itemId, item.kind, item.detail || item.summary)
        // Log reasoning completion to thinking panel
        if (item.kind === 'agent_reasoning') {
          addThinkingLog(threadId, {
            id: `${itemId}-done`,
            type: 'info',
            content: '💭 Done',
            timestamp: Date.now(),
            turnId: data.turn_id,
          })
        }
        // Log completion to terminal
        if (item.kind !== 'user_message' && item.kind !== 'agent_message' && item.kind !== 'agent_reasoning') {
          addTerminalLog(threadId, {
            id: `${itemId}-done`,
            type: item.status === 'failed' ? 'error' : 'info',
            content: item.status === 'failed'
              ? `❌ Failed: ${item.detail || ''}`
              : `✅ ${item.kind} completed`,
            timestamp: Date.now(),
            turnId: data.turn_id,
          })
        }
      } else if (event === 'turn.started' && data?.payload) {
        // Clear stale streaming items when new turn starts
        useChatStore.setState({ streamingItems: {} })
        addTerminalLog(threadId, {
          id: `turn-${data.turn_id}-start`,
          type: 'info',
          content: `━━━ Turn started ━━━`,
          timestamp: Date.now(),
          turnId: data.turn_id,
        })
      } else if (event === 'turn.completed') {
        // Clear streaming items on turn complete
        useChatStore.setState({ streamingItems: {} })
        setActiveTurnId(null)
        addTerminalLog(threadId, {
          id: `turn-${data.turn_id}-end`,
          type: 'info',
          content: `━━━ Turn completed ━━━`,
          timestamp: Date.now(),
          turnId: data.turn_id,
        })
      } else if (event === 'approval.required' && data?.payload) {
        // Auto-approve shell commands
        const approvalId = data.payload.approval_id
        if (approvalId) {
          api.resolveApproval(approvalId, 'allow')
        }
        addTerminalLog(threadId, {
          id: `approval-${approvalId}`,
          type: 'info',
          content: `⚡ Auto-approved: ${data.payload.tool_name || 'shell'}`,
          timestamp: Date.now(),
          turnId: data.turn_id,
        })
        addMessage(threadId, {
          id: approvalId,
          role: 'system',
          content: `⚠️ Approval required: ${data.payload.tool_name ?? 'unknown tool'}`,
          timestamp: Date.now(),
          kind: 'approval',
        })
      }
    })
    return unsubscribe
  }, [appendDelta, finalizeItem, setActiveTurnId, addMessage, setLastSeq])

  const setSseConnected = useChatStore((s) => s.setSseConnected)

  // SSE closed handler
  useEffect(() => {
    const unsubscribe = onSseClosed(() => {
      setSseConnected(false)
    })
    return unsubscribe
  }, [setSseConnected])

  // Status text for the bar
  const statusText = connected
    ? 'Connected'
    : cwStatus === 'starting'
    ? 'Starting CodeWhale...'
    : 'Disconnected'

  return (
    <div className="h-screen flex flex-col bg-bg-primary">
      <TitleBar />
      <div className="flex flex-1 min-h-0">
        <ThreadList />
        <div className="flex-1 flex flex-col min-w-0">
          {showThinking && <ThinkingPanel />}
          <ChatPanel />
          {showTerminal && <Terminal />}
          <UsagePanel />
        </div>
      </div>
      {/* Status bar */}
      <div className="h-6 bg-bg-secondary flex items-center px-3 text-xs text-gray-500 border-t border-gray-800">
        <span className="flex items-center gap-1.5">
          <span
            className={`w-2 h-2 rounded-full ${
              connected
                ? 'bg-green-500'
                : cwStatus === 'starting'
                ? 'bg-yellow-500 animate-pulse'
                : 'bg-red-500'
            }`}
          />
          {statusText}
        </span>
        <span className="ml-auto">CodeWhale Desktop v0.1.0</span>
      </div>
    </div>
  )
}
