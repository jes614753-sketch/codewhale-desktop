import { useEffect, useRef } from 'react'

interface MenuItem {
  label: string
  icon?: React.ReactNode
  onClick: () => void
  danger?: boolean
}

interface Props {
  x: number
  y: number
  items: MenuItem[]
  onClose: () => void
}

export default function ContextMenu({ x, y, items, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [onClose])

  // Adjust position if menu would go off screen
  useEffect(() => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect()
      if (rect.right > window.innerWidth) {
        ref.current.style.left = `${x - rect.width}px`
      }
      if (rect.bottom > window.innerHeight) {
        ref.current.style.top = `${y - rect.height}px`
      }
    }
  }, [x, y])

  return (
    <div
      ref={ref}
      className="fixed z-[100] bg-bg-secondary border border-gray-700 rounded-md shadow-lg py-1 min-w-[140px]"
      style={{ left: x, top: y }}
    >
      {items.map((item, i) => (
        <button
          key={i}
          onClick={() => {
            item.onClick()
            onClose()
          }}
          className={`w-full px-3 py-1.5 text-left text-sm flex items-center gap-2 transition-colors ${
            item.danger
              ? 'text-red-400 hover:bg-red-900/30'
              : 'text-gray-300 hover:bg-gray-700'
          }`}
        >
          {item.icon}
          {item.label}
        </button>
      ))}
    </div>
  )
}
