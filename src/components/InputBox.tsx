import { useState, useRef, useEffect } from 'react'
import { useChatStore } from '../stores/chat'
import { useSettingsStore } from '../stores/settings'
import { Send, Square, Paperclip, X, File } from 'lucide-react'

interface AttachedFile {
  name: string
  size: number
  data: string // base64
}

export default function InputBox() {
  const [input, setInput] = useState('')
  const [attached, setAttached] = useState<AttachedFile | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const sendMessage = useChatStore((s) => s.sendMessage)
  const activeThreadId = useChatStore((s) => s.activeThreadId)
  const activeTurnId = useChatStore((s) => s.activeTurnId)
  const interrupt = useChatStore((s) => s.interrupt)
  const connected = useChatStore((s) => s.connected)
  const createThread = useChatStore((s) => s.createThread)
  const maxFileSize = useSettingsStore((s) => s.maxFileSize)

  useEffect(() => {
    const ta = textareaRef.current
    if (ta) {
      ta.style.height = 'auto'
      ta.style.height = Math.min(ta.scrollHeight, 150) + 'px'
    }
  }, [input])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > maxFileSize) {
      const limitMB = Math.round(maxFileSize / 1024 / 1024)
      alert(`文件太大（${(file.size / 1024 / 1024).toFixed(1)}MB）。限制：${limitMB}MB`)
      e.target.value = ''
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1]
      setAttached({ name: file.name, size: file.size, data: base64 })
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const handleSend = async () => {
    const text = input.trim()
    if (!text && !attached) return

    if (!activeThreadId) {
      const id = await createThread()
      if (!id) return
    }

    let message = text

    // If file attached, upload it first
    if (attached) {
      const result = await window.electronAPI.uploadFile(attached.name, attached.data)
      if (result.success) {
        const isImage = /\.(png|jpg|jpeg|gif|bmp|webp|tiff?)$/i.test(attached.name)
        const ocrHint = isImage
          ? `\n\n[提示] 这是图片文件，可以用 OCR 识别文字：python scripts/ocr.py "${result.path}"`
          : ''
        message = `[上传文件: ${attached.name} (${(attached.size / 1024).toFixed(1)}KB)]\n文件路径: ${result.path}${ocrHint}\n\n${text || '请读取这个文件并告诉我它的内容。'}`
      } else {
        alert(`文件上传失败: ${result.error}`)
        return
      }
    }

    setInput('')
    setAttached(null)
    await sendMessage(message)

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const isStreaming = !!activeTurnId

  return (
    <div className="border-t border-gray-800 px-4 py-3">
      {/* Attached file preview */}
      {attached && (
        <div className="flex items-center gap-2 mb-2 px-3 py-1.5 bg-bg-secondary rounded-md border border-gray-700 text-sm">
          <File size={14} className="text-accent shrink-0" />
          <span className="text-gray-300 truncate flex-1">{attached.name}</span>
          <span className="text-gray-500 text-xs">
            {(attached.size / 1024).toFixed(1)}KB
          </span>
          <button
            onClick={() => setAttached(null)}
            className="text-gray-500 hover:text-red-400 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <div className="flex items-end gap-2 bg-bg-secondary rounded-lg border border-gray-700 focus-within:border-accent transition-colors">
        {/* File upload button */}
        <button
          onClick={() => fileRef.current?.click()}
          disabled={!connected}
          className="p-2.5 text-gray-500 hover:text-accent disabled:text-gray-700 transition-colors"
          title={`上传文件 (限制: ${Math.round(maxFileSize / 1024 / 1024)}MB)`}
        >
          <Paperclip size={16} />
        </button>
        <input
          ref={fileRef}
          type="file"
          onChange={handleFileSelect}
          className="hidden"
        />

        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            connected
              ? attached
                ? '添加说明或直接发送...'
                : '输入消息... (Shift+Enter 换行)'
              : '等待 CodeWhale 连接...'
          }
          disabled={!connected}
          rows={1}
          className="flex-1 bg-transparent px-0 py-2.5 text-sm text-gray-200 placeholder-gray-600 resize-none outline-none max-h-[150px]"
        />

        {isStreaming ? (
          <button
            onClick={interrupt}
            className="p-2.5 text-red-400 hover:text-red-300 transition-colors"
            title="Stop generation"
          >
            <Square size={16} />
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={(!input.trim() && !attached) || !connected}
            className="p-2.5 text-accent hover:text-blue-300 disabled:text-gray-700 transition-colors"
            title="Send message"
          >
            <Send size={16} />
          </button>
        )}
      </div>
    </div>
  )
}
