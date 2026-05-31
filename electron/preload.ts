import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close'),

  // CodeWhale API proxy
  api: (args: { method: string; path: string; body?: string; token?: string }) =>
    ipcRenderer.invoke('cw:api', args),

  // SSE streaming
  sseStart: (args: { threadId: string; sinceSeq?: number; token?: string }) =>
    ipcRenderer.send('cw:sse:start', args),
  sseStop: (threadId: string) =>
    ipcRenderer.send('cw:sse:stop', { threadId }),
  onSseEvent: (callback: (data: any) => void) => {
    const handler = (_event: any, data: any) => callback(data)
    ipcRenderer.on('cw:sse:event', handler)
    return () => ipcRenderer.removeListener('cw:sse:event', handler)
  },
  onSseClosed: (callback: (data: any) => void) => {
    const handler = (_event: any, data: any) => callback(data)
    ipcRenderer.on('cw:sse:closed', handler)
    return () => ipcRenderer.removeListener('cw:sse:closed', handler)
  },

  // Fetch SSE events (for loading history)
  fetchEvents: (threadId: string) =>
    ipcRenderer.invoke('cw:fetchEvents', { threadId }),

  // Restart CodeWhale server
  restartCw: () => ipcRenderer.invoke('cw:restart'),

  // CodeWhale status
  onCwStatus: (callback: (status: string) => void) => {
    const handler = (_event: any, status: string) => callback(status)
    ipcRenderer.on('cw:status', handler)
    return () => ipcRenderer.removeListener('cw:status', handler)
  },
  onCwLog: (callback: (log: string) => void) => {
    const handler = (_event: any, log: string) => callback(log)
    ipcRenderer.on('cw:log', handler)
    return () => ipcRenderer.removeListener('cw:log', handler)
  },

  // Terminal
  termStart: () => ipcRenderer.send('term:start'),
  termWrite: (data: string) => ipcRenderer.send('term:data', data),
  termResize: (cols: number, rows: number) =>
    ipcRenderer.send('term:resize', cols, rows),
  termKill: () => ipcRenderer.send('term:kill'),
  onTermData: (callback: (data: string) => void) => {
    const handler = (_event: any, data: string) => callback(data)
    ipcRenderer.on('term:data', handler)
    return () => ipcRenderer.removeListener('term:data', handler)
  },
  onTermExit: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on('term:exit', handler)
    return () => ipcRenderer.removeListener('term:exit', handler)
  },
})
