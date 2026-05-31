import { create } from 'zustand'
import * as api from '../lib/api'

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
  timestamp: number
  kind?: string
  toolName?: string
  status?: 'streaming' | 'done' | 'error'
}

export interface LogEntry {
  id: string
  type: 'command' | 'output' | 'error' | 'info'
  content: string
  timestamp: number
  turnId?: string
}

interface ChatState {
  // Connection
  connected: boolean
  setConnected: (v: boolean) => void

  // Threads
  threads: api.Thread[]
  activeThreadId: string | null
  loadThreads: () => Promise<void>
  createThread: () => Promise<string | null>
  selectThread: (id: string) => void
  deleteThread: (id: string) => Promise<void>
  renameThread: (id: string, title: string) => Promise<void>
  loadMessages: (threadId: string) => Promise<void>

  // Messages per thread
  messages: Record<string, Message[]>
  sendMessage: (content: string) => Promise<void>
  appendDelta: (threadId: string, itemId: string, delta: string) => void
  finalizeItem: (threadId: string, itemId: string, kind: string, content?: string) => void
  addMessage: (threadId: string, msg: Message) => void

  // Active turn
  activeTurnId: string | null
  setActiveTurnId: (id: string | null) => void
  interrupt: () => Promise<void>

  // Approval queue
  approvals: Array<{ id: string; toolName: string; detail?: string }>
  resolveApproval: (id: string, decision: 'allow' | 'deny') => Promise<void>

  // Streaming state
  streamingItems: Record<string, string>
  clearStreamingItem: (itemId: string) => void

  // Terminal logs per thread
  terminalLogs: Record<string, LogEntry[]>
  addTerminalLog: (threadId: string, entry: LogEntry) => void
  clearTerminalLogs: (threadId: string) => void

  // Thinking logs per thread
  thinkingLogs: Record<string, LogEntry[]>
  addThinkingLog: (threadId: string, entry: LogEntry) => void
  clearThinkingLogs: (threadId: string) => void

  // Terminal visibility
  showTerminal: boolean
  toggleTerminal: () => void

  // Thinking panel visibility
  showThinking: boolean
  toggleThinking: () => void

  // SSE
  lastSeq: number
  setLastSeq: (seq: number) => void
  sseConnected: boolean
  setSseConnected: (v: boolean) => void
}

export const useChatStore = create<ChatState>((set, get) => ({
  connected: false,
  setConnected: (v) => set({ connected: v }),

  threads: [],
  activeThreadId: null,

  loadThreads: async () => {
    const threads = await api.listThreads()
    set({ threads })
    const { activeThreadId } = get()
    if (!activeThreadId && threads.length > 0) {
      set({ activeThreadId: threads[0].id })
      get().loadMessages(threads[0].id)
    }
  },

  createThread: async () => {
    const thread = await api.createThread()
    if (thread) {
      set((s) => ({
        threads: [thread, ...s.threads],
        activeThreadId: thread.id,
        messages: { ...s.messages, [thread.id]: [] },
      }))
      return thread.id
    }
    return null
  },

  selectThread: (id) => {
    set({ activeThreadId: id })
    const { messages } = get()
    if (!messages[id] || messages[id].length === 0) {
      get().loadMessages(id)
    }
  },

  deleteThread: async (id) => {
    await api.deleteThread(id)
    set((s) => {
      const threads = s.threads.filter((t) => t.id !== id)
      const messages = { ...s.messages }
      delete messages[id]
      const terminalLogs = { ...s.terminalLogs }
      delete terminalLogs[id]
      const activeThreadId =
        s.activeThreadId === id ? threads[0]?.id ?? null : s.activeThreadId
      return { threads, messages, terminalLogs, activeThreadId }
    })
  },

  renameThread: async (id, title) => {
    await api.renameThread(id, title)
    set((s) => ({
      threads: s.threads.map((t) =>
        t.id === id ? { ...t, title, updated_at: new Date().toISOString() } : t
      ),
    }))
  },

  loadMessages: async (threadId) => {
    const loaded = await api.loadThreadMessages(threadId)
    if (loaded.length > 0) {
      const msgs: Message[] = loaded.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: Date.now(),
        kind: m.kind,
        status: 'done' as const,
      }))
      set((s) => ({
        messages: { ...s.messages, [threadId]: msgs },
      }))
    }
  },

  messages: {},

  sendMessage: async (content) => {
    const { activeThreadId } = get()
    if (!activeThreadId) return

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      timestamp: Date.now(),
    }
    set((s) => ({
      messages: {
        ...s.messages,
        [activeThreadId]: [...(s.messages[activeThreadId] ?? []), userMsg],
      },
    }))

    const turn = await api.sendTurn(activeThreadId, content)
    if (turn) {
      set({ activeTurnId: turn.id })
      if (!get().sseConnected) {
        // Start from last known seq to avoid replaying old events
        api.startSse(activeThreadId, get().lastSeq)
        set({ sseConnected: true })
      }
    }
  },

  appendDelta: (threadId, itemId, delta) => {
    set((s) => ({
      streamingItems: {
        ...s.streamingItems,
        [itemId]: (s.streamingItems[itemId] ?? '') + delta,
      },
    }))
  },

  finalizeItem: (threadId, itemId, kind, content) => {
    const { streamingItems, messages } = get()
    const text = content ?? streamingItems[itemId] ?? ''
    const existingMsgs = messages[threadId] ?? []

    // Skip if message already exists (dedup)
    if (existingMsgs.some((m) => m.id === itemId)) {
      set((s) => ({
        streamingItems: (() => {
          const si = { ...s.streamingItems }
          delete si[itemId]
          return si
        })(),
      }))
      return
    }

    if (kind === 'agent_message' && text) {
      const msg: Message = {
        id: itemId,
        role: 'assistant',
        content: text,
        timestamp: Date.now(),
        kind,
        status: 'done',
      }
      set((s) => ({
        messages: {
          ...s.messages,
          [threadId]: [...(s.messages[threadId] ?? []), msg],
        },
        streamingItems: (() => {
          const si = { ...s.streamingItems }
          delete si[itemId]
          return si
        })(),
      }))
    } else {
      // tool_call, file_change, command_execution etc. — only shown in Terminal panel
      set((s) => ({
        streamingItems: (() => {
          const si = { ...s.streamingItems }
          delete si[itemId]
          return si
        })(),
      }))
    }
  },

  addMessage: (threadId, msg) => {
    set((s) => ({
      messages: {
        ...s.messages,
        [threadId]: [...(s.messages[threadId] ?? []), msg],
      },
    }))
  },

  activeTurnId: null,
  setActiveTurnId: (id) => set({ activeTurnId: id }),

  interrupt: async () => {
    const { activeThreadId, activeTurnId } = get()
    if (activeThreadId && activeTurnId) {
      await api.interruptTurn(activeThreadId, activeTurnId)
      set({ activeTurnId: null })
    }
  },

  approvals: [],
  resolveApproval: async (id, decision) => {
    await api.resolveApproval(id, decision)
    set((s) => ({
      approvals: s.approvals.filter((a) => a.id !== id),
    }))
  },

  streamingItems: {},
  clearStreamingItem: (itemId) => {
    set((s) => {
      const si = { ...s.streamingItems }
      delete si[itemId]
      return { streamingItems: si }
    })
  },

  // Terminal logs
  terminalLogs: {},
  addTerminalLog: (threadId, entry) => {
    set((s) => ({
      terminalLogs: {
        ...s.terminalLogs,
        [threadId]: [...(s.terminalLogs[threadId] ?? []), entry],
      },
    }))
  },
  clearTerminalLogs: (threadId) => {
    set((s) => ({
      terminalLogs: { ...s.terminalLogs, [threadId]: [] },
    }))
  },

  // Thinking logs
  thinkingLogs: {},
  addThinkingLog: (threadId, entry) => {
    set((s) => ({
      thinkingLogs: {
        ...s.thinkingLogs,
        [threadId]: [...(s.thinkingLogs[threadId] ?? []), entry],
      },
    }))
  },
  clearThinkingLogs: (threadId) => {
    set((s) => ({
      thinkingLogs: { ...s.thinkingLogs, [threadId]: [] },
    }))
  },

  showTerminal: false,
  toggleTerminal: () => set((s) => ({ showTerminal: !s.showTerminal })),

  showThinking: false,
  toggleThinking: () => set((s) => ({ showThinking: !s.showThinking })),

  lastSeq: 0,
  setLastSeq: (seq) => set({ lastSeq: seq }),
  sseConnected: false,
  setSseConnected: (v) => set({ sseConnected: v }),
}))
