# Changelog

## v0.2.0 (2026-06-01)

### New Features

#### File Upload with OCR
- **File upload** — Attach documents via 📎 button in chat input
  - Size limit configurable in Settings (1MB / 5MB / 10MB / 50MB)
  - Files saved to `.uploads/` directory in workspace
  - Image files get automatic OCR hint for CodeWhale
- **OCR engine** — Tesseract + pytesseract for text recognition
  - Supports Chinese + English text recognition
  - Lightweight, no model download needed
  - Command line: `python scripts/ocr.py <image_path>`

#### Settings
- **File size limit selector** — Choose max upload size (1MB/5MB/10MB/50MB)
- **Restart button** — Restart CodeWhale server for reconnection

---

## v0.1.0 (2026-05-31)

Initial release of CodeWhale Desktop.

### Features

#### Chat
- Streaming AI responses with real-time token rendering
- Markdown rendering with syntax-highlighted code blocks
- Multi-thread conversation management (create, rename, delete, switch)
- Copy message to clipboard with one click
- Message history auto-loading when switching threads
- SSE-based event streaming with turn isolation
- Auto-approval for shell commands

#### Thinking Panel
- AI reasoning chain visualization in real-time
- Collapsible panel via title bar brain icon
- Per-thread thinking log isolation
- Accumulated text display (no fragmented deltas)

#### Terminal Panel
- Tool execution logs (shell commands, file changes, tool calls)
- Auto-approval for shell commands
- Collapsible panel via title bar terminal icon
- Per-thread terminal log isolation
- Color-coded entries (command, output, error, info)

#### Settings
- Dark / Light mode toggle with localStorage persistence
- Custom user avatar upload with circular image cropper
- DeepSeek API Key configuration
- **Restart CodeWhale server** button for reconnection

#### Usage Dashboard
- Token consumption tracking (input/output/reasoning)
- Cost estimation in USD
- Turn count display
- Auto-refresh every 30 seconds

#### System
- Auto-start CodeWhale server on app launch
- Health check polling with connection status indicator
- Graceful shutdown (stops CodeWhale if we started it)
- Custom title bar with window controls
- Desktop shortcut support (Windows)
- Right-click context menu for thread rename/delete

### Tech Stack
- Electron 28
- React 19 + TypeScript
- Vite 6
- Tailwind CSS
- Zustand (state management)
- xterm.js + node-pty (terminal)
- marked (markdown rendering)
- Lucide React (icons)
