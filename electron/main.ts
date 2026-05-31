import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import http from 'http'
import { ChildProcess, spawn, execSync } from 'child_process'
import * as pty from 'node-pty'

// ── Config ──────────────────────────────────────────
const CW_HOST = '127.0.0.1'
const CW_PORT = 7878

let mainWindow: BrowserWindow | null = null
let ptyProcess: pty.IPty | null = null
let cwProcess: ChildProcess | null = null
let cwWasStartedByUs = false

// ── CodeWhale auto-start ────────────────────────────
function healthCheck(): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.get(
      { hostname: CW_HOST, port: CW_PORT, path: '/health', timeout: 2000 },
      (res) => {
        let data = ''
        res.on('data', (c) => (data += c))
        res.on('end', () => resolve(res.statusCode === 200))
      }
    )
    req.on('error', () => resolve(false))
    req.on('timeout', () => {
      req.destroy()
      resolve(false)
    })
  })
}

function findCodewhaleBinary(): string | null {
  try {
    // Try `where codewhale` on Windows, `which codewhale` on Unix
    const cmd = process.platform === 'win32' ? 'where codewhale' : 'which codewhale'
    const result = execSync(cmd, { encoding: 'utf-8', timeout: 5000 }).trim()
    // `where` may return multiple lines; take the first
    return result.split(/\r?\n/)[0].trim()
  } catch {
    return null
  }
}

async function ensureCodeWhaleRunning(): Promise<boolean> {
  // 1. Check if already running
  const healthy = await healthCheck()
  if (healthy) {
    console.log('[CW] CodeWhale HTTP server already running')
    return true
  }

  // 2. Find binary
  const binary = findCodewhaleBinary()
  if (!binary) {
    console.error('[CW] codewhale binary not found in PATH')
    return false
  }
  console.log('[CW] Starting codewhale serve --http from:', binary)

  // 3. Spawn codewhale serve --http
  //    On Windows, `codewhale` might be a .cmd shim, so we use shell: true
  cwProcess = spawn(binary, ['serve', '--http', '--insecure'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true,
    windowsHide: true,
    env: { ...process.env },
  })

  cwProcess.stdout?.on('data', (data: Buffer) => {
    const text = data.toString()
    console.log('[CW]', text.trim())
    // Forward to renderer for status display
    mainWindow?.webContents.send('cw:log', text)
  })

  cwProcess.stderr?.on('data', (data: Buffer) => {
    const text = data.toString()
    console.error('[CW:err]', text.trim())
    mainWindow?.webContents.send('cw:log', text)
  })

  cwProcess.on('exit', (code) => {
    console.log('[CW] Process exited with code:', code)
    cwProcess = null
    mainWindow?.webContents.send('cw:status', 'stopped')
  })

  cwWasStartedByUs = true

  // 4. Wait for health check to pass (up to 30s)
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 500))
    if (await healthCheck()) {
      console.log('[CW] Server ready!')
      mainWindow?.webContents.send('cw:status', 'ready')
      return true
    }
  }

  console.error('[CW] Timed out waiting for server')
  return false
}

// ── Restart CodeWhale ───────────────────────────────
ipcMain.handle('cw:restart', async () => {
  // Kill existing process
  if (cwProcess) {
    console.log('[CW] Stopping existing server...')
    cwProcess.kill()
    cwProcess = null
  }
  // Wait a bit for port to release
  await new Promise((r) => setTimeout(r, 1000))
  // Restart
  mainWindow?.webContents.send('cw:status', 'starting')
  const ok = await ensureCodeWhaleRunning()
  return ok
})

// ── Window ──────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    backgroundColor: '#1a1a2e',
    icon: join(__dirname, '../resources/icon.ico'),
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// ── Window controls ─────────────────────────────────
ipcMain.on('window:minimize', () => mainWindow?.minimize())
ipcMain.on('window:maximize', () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize()
  else mainWindow?.maximize()
})
ipcMain.on('window:close', () => mainWindow?.close())

// ── CodeWhale HTTP Proxy ────────────────────────────
function proxyRequest(
  method: string,
  urlPath: string,
  body: string | null,
  token: string | null
): Promise<{ status: number; data: string }> {
  return new Promise((resolve, reject) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const req = http.request(
      {
        hostname: CW_HOST,
        port: CW_PORT,
        path: urlPath,
        method,
        headers,
      },
      (res) => {
        let data = ''
        res.on('data', (chunk) => (data += chunk))
        res.on('end', () =>
          resolve({ status: res.statusCode ?? 500, data })
        )
      }
    )

    req.on('error', (err) => reject(err))
    req.setTimeout(30_000, () => {
      req.destroy()
      reject(new Error('Request timeout'))
    })

    if (body) req.write(body)
    req.end()
  })
}

ipcMain.handle(
  'cw:api',
  async (
    _event: any,
    args: { method: string; path: string; body?: string; token?: string }
  ) => {
    try {
      const res = await proxyRequest(
        args.method,
        args.path,
        args.body ?? null,
        args.token ?? null
      )
      return res
    } catch (err: any) {
      return { status: 0, data: JSON.stringify({ error: err.message }) }
    }
  }
)

// ── Fetch SSE events with timeout (for loading history) ──
ipcMain.handle(
  'cw:fetchEvents',
  async (_event: any, args: { threadId: string }) => {
    return new Promise((resolve) => {
      const headers: Record<string, string> = {}
      const req = http.get(
        {
          hostname: CW_HOST,
          port: CW_PORT,
          path: `/v1/threads/${args.threadId}/events?since_seq=0`,
          headers,
        },
        (res) => {
          let buffer = ''
          let eventCount = 0
          let timer: ReturnType<typeof setTimeout> | null = null

          const finish = () => {
            res.destroy()
            resolve(buffer)
          }

          res.on('data', (chunk: Buffer) => {
            buffer += chunk.toString()
            // Count complete events (double newline separated)
            const parts = buffer.split('\n\n')
            eventCount += parts.length - 1

            // Reset timer - if no new data for 3s, assume done
            if (timer) clearTimeout(timer)
            timer = setTimeout(finish, 3000)
          })

          res.on('end', () => {
            if (timer) clearTimeout(timer)
            resolve(buffer)
          })

          res.on('error', () => {
            if (timer) clearTimeout(timer)
            resolve(buffer)
          })

          // Safety timeout: max 15s
          setTimeout(() => {
            if (timer) clearTimeout(timer)
            finish()
          }, 15000)
        }
      )

      req.on('error', () => resolve(''))
      req.setTimeout(10000, () => {
        req.destroy()
        resolve('')
      })
    })
  }
)

// ── SSE Streaming ───────────────────────────────────
const sseConnections = new Map<string, http.IncomingMessage>()

ipcMain.on(
  'cw:sse:start',
  (_event: any, args: { threadId: string; sinceSeq?: number; token?: string }) => {
    const id = args.threadId
    sseConnections.get(id)?.destroy()

    const params = args.sinceSeq !== undefined ? `?since_seq=${args.sinceSeq}` : ''
    const headers: Record<string, string> = {}
    if (args.token) headers['Authorization'] = `Bearer ${args.token}`

    const req = http.get(
      {
        hostname: CW_HOST,
        port: CW_PORT,
        path: `/v1/threads/${id}/events${params}`,
        headers,
      },
      (res) => {
        sseConnections.set(id, res)
        let buffer = ''

        res.on('data', (chunk: Buffer) => {
          buffer += chunk.toString()
          const parts = buffer.split('\n\n')
          buffer = parts.pop() ?? ''

          for (const part of parts) {
            if (!part.trim()) continue
            const lines = part.split('\n')
            let eventType = ''
            let data = ''
            for (const line of lines) {
              if (line.startsWith('event: ')) eventType = line.slice(7)
              else if (line.startsWith('data: ')) data = line.slice(6)
            }
            if (eventType && data) {
              try {
                const parsed = JSON.parse(data)
                mainWindow?.webContents.send('cw:sse:event', {
                  threadId: id,
                  event: eventType,
                  data: parsed,
                })
              } catch {
                mainWindow?.webContents.send('cw:sse:event', {
                  threadId: id,
                  event: eventType,
                  data,
                })
              }
            }
          }
        })

        res.on('end', () => {
          sseConnections.delete(id)
          mainWindow?.webContents.send('cw:sse:closed', { threadId: id })
        })

        res.on('error', () => {
          sseConnections.delete(id)
          mainWindow?.webContents.send('cw:sse:closed', { threadId: id })
        })
      }
    )

    req.on('error', () => {
      sseConnections.delete(id)
      mainWindow?.webContents.send('cw:sse:closed', { threadId: id })
    })
  }
)

ipcMain.on('cw:sse:stop', (_event: any, args: { threadId: string }) => {
  sseConnections.get(args.threadId)?.destroy()
  sseConnections.delete(args.threadId)
})

// ── Terminal (node-pty) ─────────────────────────────
ipcMain.on('term:start', () => {
  if (ptyProcess) return

  const shellPath =
    process.platform === 'win32'
      ? process.env.COMSPEC || 'cmd.exe'
      : process.env.SHELL || '/bin/bash'

  ptyProcess = pty.spawn(shellPath, [], {
    name: 'xterm-256color',
    cols: 120,
    rows: 30,
    cwd: process.env.HOME || process.env.USERPROFILE || process.cwd(),
    env: { ...process.env } as Record<string, string>,
  })

  ptyProcess.onData((data: string) => {
    mainWindow?.webContents.send('term:data', data)
  })

  ptyProcess.onExit(({ exitCode }) => {
    console.log('[Term] Process exited with code:', exitCode)
    ptyProcess = null
    mainWindow?.webContents.send('term:exit')
  })
})

ipcMain.on('term:data', (_event: any, data: string) => {
  ptyProcess?.write(data)
})

ipcMain.on('term:resize', (_event: any, cols: number, rows: number) => {
  if (ptyProcess && cols > 0 && rows > 0) {
    ptyProcess.resize(cols, rows)
  }
})

ipcMain.on('term:kill', () => {
  if (ptyProcess) {
    ptyProcess.kill()
    ptyProcess = null
  }
})

// ── App lifecycle ───────────────────────────────────
app.whenReady().then(async () => {
  createWindow()
  // Auto-start CodeWhale HTTP server
  await ensureCodeWhaleRunning()
})

app.on('window-all-closed', () => {
  ptyProcess?.kill()
  sseConnections.forEach((conn) => conn.destroy())
  // Kill CodeWhale only if we started it
  if (cwWasStartedByUs && cwProcess) {
    console.log('[CW] Shutting down CodeWhale server...')
    cwProcess.kill()
    cwProcess = null
  }
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
