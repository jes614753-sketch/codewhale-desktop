import { create } from 'zustand'

interface SettingsState {
  theme: 'dark' | 'light'
  apiKey: string
  userAvatar: string // base64 data URL
  setTheme: (theme: 'dark' | 'light') => void
  setApiKey: (key: string) => void
  setUserAvatar: (avatar: string) => void
  toggleTheme: () => void
}

// Load from localStorage
const saved = (() => {
  try {
    const raw = localStorage.getItem('cw-settings')
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
})()

function persist(state: Partial<SettingsState>) {
  try {
    const existing = JSON.parse(localStorage.getItem('cw-settings') || '{}')
    localStorage.setItem('cw-settings', JSON.stringify({ ...existing, ...state }))
  } catch (err) {
    console.error('Failed to persist settings:', err)
    // If quota exceeded, try saving without avatar
    if (state.userAvatar) {
      try {
        const existing = JSON.parse(localStorage.getItem('cw-settings') || '{}')
        delete existing.userAvatar
        localStorage.setItem('cw-settings', JSON.stringify({ ...existing, ...state, userAvatar: '' }))
      } catch { /* give up */ }
    }
  }
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  theme: saved.theme || 'dark',
  apiKey: saved.apiKey || '',
  userAvatar: saved.userAvatar || '',

  setTheme: (theme) => {
    set({ theme })
    applyTheme(theme)
    persist({ theme })
  },

  setApiKey: (apiKey) => {
    set({ apiKey })
    persist({ apiKey })
  },

  setUserAvatar: (userAvatar) => {
    set({ userAvatar })
    persist({ userAvatar })
  },

  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark'
    get().setTheme(next)
  },
}))

// Apply theme to document
export function applyTheme(theme: 'dark' | 'light') {
  const root = document.documentElement
  if (theme === 'light') {
    root.classList.add('light')
  } else {
    root.classList.remove('light')
  }
}

// Apply saved theme on load
applyTheme(saved.theme || 'dark')
