import { useState, useRef } from 'react'
import { useSettingsStore } from '../stores/settings'
import { X, Sun, Moon, Key, Save, User, Upload, RefreshCw } from 'lucide-react'
import ImageCropper from './ImageCropper'

interface Props {
  onClose: () => void
}

export default function Settings({ onClose }: Props) {
  const theme = useSettingsStore((s) => s.theme)
  const toggleTheme = useSettingsStore((s) => s.toggleTheme)
  const apiKey = useSettingsStore((s) => s.apiKey)
  const setApiKey = useSettingsStore((s) => s.setApiKey)
  const userAvatar = useSettingsStore((s) => s.userAvatar)
  const setUserAvatar = useSettingsStore((s) => s.setUserAvatar)
  const [keyInput, setKeyInput] = useState(apiKey)
  const [saved, setSaved] = useState(false)
  const [restarting, setRestarting] = useState(false)
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleSaveKey = () => {
    setApiKey(keyInput.trim())
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleRestart = async () => {
    setRestarting(true)
    try {
      await window.electronAPI.restartCw()
    } catch (err) {
      console.error('Restart failed:', err)
    }
    setRestarting(false)
  }

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      alert('图片太大，请选择 5MB 以内的图片')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setCropSrc(reader.result as string)
    }
    reader.readAsDataURL(file)
    // Reset input so same file can be re-selected
    e.target.value = ''
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-bg-secondary border border-gray-700 rounded-lg w-[400px] shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <span className="text-sm font-medium text-gray-200">Settings</span>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-5">
          {/* User Avatar */}
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wider mb-2 block">
              用户头像
            </label>
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-full bg-bg-tertiary border border-gray-700 flex items-center justify-center overflow-hidden cursor-pointer hover:border-accent transition-colors"
                onClick={() => fileRef.current?.click()}
              >
                {userAvatar ? (
                  <img
                    src={userAvatar}
                    alt="avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User size={20} className="text-gray-500" />
                )}
              </div>
              <div className="flex-1">
                <button
                  onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-2 px-3 py-2 bg-bg-primary rounded-md border border-gray-700 hover:border-accent text-sm text-gray-300 hover:text-white transition-colors w-full"
                >
                  <Upload size={14} />
                  {userAvatar ? '更换头像' : '上传头像'}
                </button>
                {userAvatar && (
                  <button
                    onClick={() => setUserAvatar('')}
                    className="text-xs text-gray-600 hover:text-red-400 mt-1 transition-colors"
                  >
                    恢复默认
                  </button>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>
          </div>

          {/* Theme */}
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wider mb-2 block">
              Appearance
            </label>
            <button
              onClick={toggleTheme}
              className="w-full flex items-center gap-3 px-3 py-2.5 bg-bg-primary rounded-md border border-gray-700 hover:border-gray-600 transition-colors"
            >
              {theme === 'dark' ? (
                <Moon size={16} className="text-accent" />
              ) : (
                <Sun size={16} className="text-yellow-400" />
              )}
              <span className="text-sm text-gray-300">
                {theme === 'dark' ? '夜间模式' : '日间模式'}
              </span>
              <span className="ml-auto text-xs text-gray-500">点击切换</span>
            </button>
          </div>

          {/* API Key */}
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wider mb-2 block">
              DeepSeek API Key
            </label>
            <div className="flex gap-2">
              <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-bg-primary rounded-md border border-gray-700 focus-within:border-accent transition-colors">
                <Key size={14} className="text-gray-500 shrink-0" />
                <input
                  type="password"
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  placeholder="sk-..."
                  className="flex-1 bg-transparent text-sm text-gray-200 outline-none placeholder-gray-600"
                />
              </div>
              <button
                onClick={handleSaveKey}
                className="px-3 py-2 bg-accent text-bg-primary rounded-md hover:bg-blue-300 transition-colors flex items-center gap-1.5 text-sm font-medium"
              >
                <Save size={14} />
                {saved ? '已保存' : '保存'}
              </button>
            </div>
            <p className="text-xs text-gray-600 mt-1.5">
              重启 CodeWhale 后生效。留空则使用默认配置。
            </p>
          </div>

          {/* Restart */}
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wider mb-2 block">
              Connection
            </label>
            <button
              onClick={handleRestart}
              disabled={restarting}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-bg-primary rounded-md border border-gray-700 hover:border-accent text-sm text-gray-300 hover:text-white transition-colors disabled:opacity-50"
            >
              <RefreshCw size={14} className={restarting ? 'animate-spin' : ''} />
              {restarting ? '重启中...' : '重启 CodeWhale 服务'}
            </button>
            <p className="text-xs text-gray-600 mt-1.5">
              断开连接时点击此按钮重新启动 CodeWhale 服务。
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-700 text-xs text-gray-600">
          CodeWhale Desktop v0.1.0
        </div>
      </div>

      {/* Image Cropper */}
      {cropSrc && (
        <ImageCropper
          src={cropSrc}
          onCrop={(dataUrl) => {
            setUserAvatar(dataUrl)
            setCropSrc(null)
          }}
          onCancel={() => setCropSrc(null)}
        />
      )}
    </div>
  )
}
