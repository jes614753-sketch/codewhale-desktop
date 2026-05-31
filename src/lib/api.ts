declare global {
  interface Window {
    electronAPI: {
      minimize: () => void
      maximize: () => void
      close: () => void
      api: (args: {
        method: string
        path: string
        body?: string
        token?: string
      }) => Promise<{ status: number; data: string }>
      sseStart: (args: {
        threadId: string
        sinceSeq?: number
        token?: string
      }) => void
      sseStop: (threadId: string) => void
      onSseEvent: (
        callback: (data: {
          threadId: string
          event: string
          data: any
        }) => void
      ) => () => void
      onSseClosed: (
        callback: (data: { threadId: string }) => void
      ) => () => void
      fetchEvents: (threadId: string) => Promise<string>
      restartCw: () => Promise<boolean>
      onCwStatus: (callback: (status: string) => void) => () => void
      onCwLog: (callback: (log: string) => void) => () => void
      termStart: () => void
      termWrite: (data: string) => void
      termResize: (cols: number, rows: number) => void
      termKill: () => void
      onTermData: (callback: (data: string) => void) => () => void
      onTermExit: (callback: () => void) => () => void
    }
  }
}

const api = window.electronAPI

export interface Thread {
  id: string
  title: string
  model: string
  mode: string
  archived: boolean
  created_at: string
  updated_at: string
}

export interface TurnRecord {
  id: string
  thread_id: string
  status: string
}

export interface TurnItem {
  id: string
  turn_id: string
  kind: string
  status: string
  metadata?: any
}

// ── Thread CRUD ─────────────────────────────────────
export async function listThreads(): Promise<Thread[]> {
  const res = await api.api({ method: 'GET', path: '/v1/threads' })
  if (res.status === 200) {
    const parsed = JSON.parse(res.data)
    return parsed.threads ?? parsed ?? []
  }
  return []
}

export async function createThread(): Promise<Thread | null> {
  const res = await api.api({
    method: 'POST',
    path: '/v1/threads',
    body: JSON.stringify({
      allow_shell: true,
      auto_approve: true,
    }),
  })
  if (res.status === 200 || res.status === 201) {
    return JSON.parse(res.data)
  }
  return null
}

export async function getThread(id: string): Promise<Thread | null> {
  const res = await api.api({ method: 'GET', path: `/v1/threads/${id}` })
  if (res.status === 200) return JSON.parse(res.data)
  return null
}

export async function deleteThread(id: string): Promise<boolean> {
  const res = await api.api({ method: 'DELETE', path: `/v1/threads/${id}` })
  return res.status === 200 || res.status === 204
}

export async function renameThread(id: string, title: string): Promise<boolean> {
  const res = await api.api({
    method: 'PATCH',
    path: `/v1/threads/${id}`,
    body: JSON.stringify({ title }),
  })
  return res.status === 200
}

// ── Load messages from thread events ────────────────
export interface LoadedMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  kind: string
}

export async function loadThreadMessages(threadId: string): Promise<LoadedMessage[]> {
  // Use the dedicated fetchEvents IPC which handles SSE streaming with timeout
  const text = await api.fetchEvents(threadId)
  if (!text) return []

  // Parse SSE-style text
  const messages: LoadedMessage[] = []
  const blocks = text.split('\n\n')

  for (const block of blocks) {
    if (!block.trim()) continue
    const lines = block.split('\n')
    let eventType = ''
    let dataStr = ''
    for (const line of lines) {
      if (line.startsWith('event: ')) eventType = line.slice(7).trim()
      else if (line.startsWith('data: ')) dataStr = line.slice(6)
    }

    if (eventType === 'item.completed' && dataStr) {
      try {
        const data = JSON.parse(dataStr)
        const item = data.payload?.item
        if (item && (item.kind === 'user_message' || item.kind === 'agent_message')) {
          messages.push({
            id: item.id,
            role: item.kind === 'user_message' ? 'user' : 'assistant',
            content: item.detail || item.summary || '',
            kind: item.kind,
          })
        }
      } catch { /* skip malformed */ }
    }
  }

  return messages
}

// ── Turns ───────────────────────────────────────────
export async function sendTurn(
  threadId: string,
  message: string
): Promise<TurnRecord | null> {
  const res = await api.api({
    method: 'POST',
    path: `/v1/threads/${threadId}/turns`,
    body: JSON.stringify({ prompt: message }),
  })
  if (res.status === 200 || res.status === 201) return JSON.parse(res.data)
  return null
}

export async function interruptTurn(
  threadId: string,
  turnId: string
): Promise<void> {
  await api.api({
    method: 'POST',
    path: `/v1/threads/${threadId}/turns/${turnId}/interrupt`,
  })
}

// ── Approvals ───────────────────────────────────────
export async function resolveApproval(
  approvalId: string,
  decision: 'allow' | 'deny'
): Promise<void> {
  await api.api({
    method: 'POST',
    path: `/v1/approvals/${approvalId}`,
    body: JSON.stringify({ decision, remember: false }),
  })
}

// ── Usage ───────────────────────────────────────────
export interface UsageTotals {
  input_tokens: number
  output_tokens: number
  cached_tokens: number
  reasoning_tokens: number
  cost_usd: number
  turns: number
}

export interface UsageBucket {
  key: string
  input_tokens: number
  output_tokens: number
  cached_tokens: number
  reasoning_tokens: number
  cost_usd: number
  turns: number
}

export interface UsageData {
  since: string
  until: string
  group_by: string
  totals: UsageTotals
  buckets: UsageBucket[]
}

export async function getUsage(since?: string, until?: string): Promise<UsageData | null> {
  let path = '/v1/usage'
  const params: string[] = []
  if (since) params.push(`since=${since}`)
  if (until) params.push(`until=${until}`)
  if (params.length > 0) path += '?' + params.join('&')
  const res = await api.api({ method: 'GET', path })
  if (res.status === 200) return JSON.parse(res.data)
  return null
}

// ── Health check ────────────────────────────────────
export async function checkHealth(): Promise<boolean> {
  try {
    const res = await api.api({ method: 'GET', path: '/health' })
    return res.status === 200
  } catch {
    return false
  }
}

// ── SSE helpers ─────────────────────────────────────
export function startSse(threadId: string, sinceSeq?: number) {
  api.sseStart({ threadId, sinceSeq })
}

export function stopSse(threadId: string) {
  api.sseStop(threadId)
}

export function onSseEvent(
  cb: (data: { threadId: string; event: string; data: any }) => void
) {
  return api.onSseEvent(cb)
}

export function onSseClosed(cb: (data: { threadId: string }) => void) {
  return api.onSseClosed(cb)
}

// ── Terminal helpers ────────────────────────────────
export const term = {
  start: () => api.termStart(),
  write: (data: string) => api.termWrite(data),
  resize: (cols: number, rows: number) => api.termResize(cols, rows),
  kill: () => api.termKill(),
  onData: (cb: (data: string) => void) => api.onTermData(cb),
  onExit: (cb: () => void) => api.onTermExit(cb),
}
