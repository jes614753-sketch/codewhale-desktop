# CodeWhale Desktop

A beautiful desktop GUI client for [CodeWhale](https://github.com/Hmbown/CodeWhale) — the terminal-native AI coding agent powered by DeepSeek V4.

![Electron](https://img.shields.io/badge/Electron-28-blue) ![React](https://img.shields.io/badge/React-19-61dafb) ![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6) ![Vite](https://img.shields.io/badge/Vite-6-646cff)

[English](#features) | [中文](#features-1)

---

## Features

### 🐋 Chat Interface
- **Streaming AI responses** — Real-time token-by-token rendering via SSE
- **Markdown rendering** — Full GFM support with syntax-highlighted code blocks
- **Multi-thread management** — Create, rename, delete, and switch between conversations
- **Copy with one click** — Copy any AI response to clipboard instantly
- **Message history** — Automatically loads conversation history when switching threads

### 🧠 Thinking Panel
- **Reasoning chain visualization** — Watch the AI's thought process in real-time
- **Collapsible panel** — Toggle via the brain icon in the title bar
- **Per-thread isolation** — Each conversation has its own thinking log

### 💻 Terminal Panel
- **Tool execution logs** — View all shell commands, file changes, and tool calls
- **Auto-approval** — Shell commands are automatically approved
- **Collapsible panel** — Toggle via the terminal icon in the title bar
- **Per-thread isolation** — Each conversation has its own terminal log

### ⚙️ Settings
- **Dark / Light mode** — Toggle between themes, persisted to localStorage
- **Custom user avatar** — Upload and crop your own avatar with a circular preview
- **API Key configuration** — Set your DeepSeek API key

### 🚀 Auto-Start
- **Built-in CodeWhale management** — Automatically starts `codewhale serve --http` on launch
- **Health monitoring** — Connection status indicator in the title bar and status bar
- **Graceful shutdown** — Stops the CodeWhale server when the app closes (if we started it)

### 📊 Usage Dashboard
- **Token consumption** — View input/output/reasoning token counts
- **Cost tracking** — See estimated cost in USD
- **Turn count** — Track total conversation turns

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Electron 28 |
| Frontend | React 19 + TypeScript |
| Styling | Tailwind CSS |
| State | Zustand |
| Terminal | xterm.js + node-pty |
| Build | Vite + electron-builder |
| Markdown | marked + highlight.js |
| Icons | Lucide React |

---

## Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [CodeWhale](https://github.com/Hmbown/CodeWhale) installed globally

```bash
npm install -g codewhale
```

---

## Installation

### From Source

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/codewhale-desktop.git
cd codewhale-desktop

# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Package for Windows
npm run package:win
```

### Quick Start (Windows)

Double-click `start.bat` to launch the app directly.

---

## Project Structure

```
codewhale-desktop/
├── electron/
│   ├── main.ts           # Electron main process
│   └── preload.ts        # Secure IPC bridge
├── src/
│   ├── App.tsx            # Root component
│   ├── main.tsx           # React entry point
│   ├── components/
│   │   ├── ChatPanel.tsx      # Chat message area
│   │   ├── MessageBubble.tsx  # Individual message rendering
│   │   ├── InputBox.tsx       # Message input with auto-resize
│   │   ├── ThreadList.tsx     # Conversation sidebar
│   │   ├── TitleBar.tsx       # Custom title bar
│   │   ├── Terminal.tsx       # Tool execution log panel
│   │   ├── ThinkingPanel.tsx  # AI reasoning chain panel
│   │   ├── UsagePanel.tsx     # Token usage dashboard
│   │   ├── Settings.tsx       # Settings modal
│   │   ├── ContextMenu.tsx    # Right-click context menu
│   │   └── ImageCropper.tsx   # Avatar crop tool
│   ├── stores/
│   │   ├── chat.ts            # Chat state management
│   │   └── settings.ts        # Settings persistence
│   ├── lib/
│   │   └── api.ts             # CodeWhale API client
│   └── styles/
│       └── globals.css        # Global styles + theme variables
├── resources/
│   ├── icon.png               # App icon (PNG)
│   └── icon.ico               # App icon (ICO)
├── scripts/
│   ├── gen-icon.js            # Generate icon PNG
│   ├── gen-ico.js             # Generate icon ICO
│   └── create-shortcut.ps1    # Create Windows shortcut
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
└── electron-builder.yml
```

---

## Architecture

```
┌─────────────────────────────────────────┐
│           Electron Main Process         │
│  ┌───────────────────────────────────┐  │
│  │  CodeWhale Process Manager        │  │
│  │  - Auto-start codewhale serve     │  │
│  │  - Health check polling           │  │
│  │  - Graceful shutdown              │  │
│  └───────────────────────────────────┘  │
│  ┌───────────────────────────────────┐  │
│  │  HTTP/SSE Proxy                   │  │
│  │  - Proxy API calls to CodeWhale   │  │
│  │  - SSE event streaming to render  │  │
│  │  - Auto-approve shell commands    │  │
│  └───────────────────────────────────┘  │
│  ┌───────────────────────────────────┐  │
│  │  PTY Manager (node-pty)           │  │
│  │  - Real terminal emulation        │  │
│  │  - stdin/stdout piping            │  │
│  └───────────────────────────────────┘  │
└───────────────────┬─────────────────────┘
                    │ IPC
┌───────────────────┴─────────────────────┐
│         React Renderer Process          │
│  ┌─────────┐ ┌─────────┐ ┌──────────┐  │
│  │ Chat    │ │Thinking │ │ Terminal │  │
│  │ Panel   │ │ Panel   │ │  Panel   │  │
│  └─────────┘ └─────────┘ └──────────┘  │
│  ┌─────────┐ ┌─────────┐ ┌──────────┐  │
│  │ Thread  │ │Settings │ │  Usage   │  │
│  │  List   │ │ Modal   │ │ Dashboard│  │
│  └─────────┘ └─────────┘ └──────────┘  │
│         Zustand State Management        │
└─────────────────────────────────────────┘
```

---

## CodeWhale API Integration

The app communicates with CodeWhale's HTTP/SSE Runtime API:

| Endpoint | Usage |
|----------|-------|
| `GET /health` | Connection health check |
| `GET /v1/threads` | List conversations |
| `POST /v1/threads` | Create new conversation |
| `PATCH /v1/threads/:id` | Rename/update conversation |
| `DELETE /v1/threads/:id` | Delete conversation |
| `POST /v1/threads/:id/turns` | Send message |
| `GET /v1/threads/:id/events` | SSE event stream |
| `POST /v1/approvals/:id` | Approve/deny tool calls |
| `GET /v1/usage` | Token usage statistics |

---

## Screenshots

> Coming soon

---

## License

MIT

---

## Acknowledgments

- [CodeWhale](https://github.com/Hmbown/CodeWhale) — The amazing terminal coding agent
- [DeepSeek](https://deepseek.com/) — The AI model powering CodeWhale
- [Electron](https://electronjs.org/) — Cross-platform desktop framework
- [React](https://react.dev/) — UI framework
- [Tailwind CSS](https://tailwindcss.com/) — Utility-first CSS framework
