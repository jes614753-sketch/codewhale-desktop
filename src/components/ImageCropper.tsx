import { useState, useRef, useEffect, useCallback } from 'react'

interface Props {
  src: string
  onCrop: (dataUrl: string) => void
  onCancel: () => void
}

export default function ImageCropper({ src, onCrop, onCancel }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [img, setImg] = useState<HTMLImageElement | null>(null)

  const PREVIEW_SIZE = 200
  const OUTPUT_SIZE = 128

  // Load image
  useEffect(() => {
    const image = new Image()
    image.onload = () => {
      setImg(image)
      // Center and fit
      const maxDim = Math.max(image.width, image.height)
      const fitZoom = PREVIEW_SIZE / maxDim
      setZoom(fitZoom)
      setOffset({
        x: (PREVIEW_SIZE - image.width * fitZoom) / 2,
        y: (PREVIEW_SIZE - image.height * fitZoom) / 2,
      })
    }
    image.src = src
  }, [src])

  // Draw preview
  useEffect(() => {
    if (!img || !canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, PREVIEW_SIZE, PREVIEW_SIZE)
    ctx.save()
    // Clip to circle
    ctx.beginPath()
    ctx.arc(PREVIEW_SIZE / 2, PREVIEW_SIZE / 2, PREVIEW_SIZE / 2, 0, Math.PI * 2)
    ctx.clip()
    // Draw image
    ctx.drawImage(img, offset.x, offset.y, img.width * zoom, img.height * zoom)
    ctx.restore()
    // Circle border
    ctx.strokeStyle = '#4fc3f7'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(PREVIEW_SIZE / 2, PREVIEW_SIZE / 2, PREVIEW_SIZE / 2 - 1, 0, Math.PI * 2)
    ctx.stroke()
  }, [img, zoom, offset])

  const handleMouseDown = (e: React.MouseEvent) => {
    setDragging(true)
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y })
  }

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!dragging) return
      setOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      })
    },
    [dragging, dragStart]
  )

  const handleMouseUp = useCallback(() => {
    setDragging(false)
  }, [])

  useEffect(() => {
    if (dragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [dragging, handleMouseMove, handleMouseUp])

  const handleCrop = () => {
    if (!img) return
    const canvas = document.createElement('canvas')
    canvas.width = OUTPUT_SIZE
    canvas.height = OUTPUT_SIZE
    const ctx = canvas.getContext('2d')!

    // Map preview center to image coordinates
    const centerX = (PREVIEW_SIZE / 2 - offset.x) / zoom
    const centerY = (PREVIEW_SIZE / 2 - offset.y) / zoom
    const halfSize = (PREVIEW_SIZE / 2) / zoom

    const sx = centerX - halfSize
    const sy = centerY - halfSize
    const sw = halfSize * 2
    const sh = halfSize * 2

    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE)
    onCrop(canvas.toDataURL('image/png'))
  }

  const handleZoomChange = (newZoom: number) => {
    if (!img) return
    // Zoom toward center
    const oldZoom = zoom
    const centerX = PREVIEW_SIZE / 2
    const centerY = PREVIEW_SIZE / 2
    const imgCenterX = (centerX - offset.x) / oldZoom
    const imgCenterY = (centerY - offset.y) / oldZoom
    setOffset({
      x: centerX - imgCenterX * newZoom,
      y: centerY - imgCenterY * newZoom,
    })
    setZoom(newZoom)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70">
      <div className="bg-bg-secondary border border-gray-700 rounded-lg p-4 shadow-xl">
        <div className="text-sm text-gray-300 mb-3">拖动图片调整位置，滑动缩放大小</div>

        {/* Preview canvas */}
        <div
          className="mx-auto cursor-move"
          style={{ width: PREVIEW_SIZE, height: PREVIEW_SIZE }}
          onMouseDown={handleMouseDown}
        >
          <canvas
            ref={canvasRef}
            width={PREVIEW_SIZE}
            height={PREVIEW_SIZE}
            className="rounded-full"
          />
        </div>

        {/* Zoom slider */}
        <div className="flex items-center gap-3 mt-3 px-2">
          <span className="text-xs text-gray-500">小</span>
          <input
            type="range"
            min="0.1"
            max="5"
            step="0.01"
            value={zoom}
            onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
            className="flex-1 accent-accent"
          />
          <span className="text-xs text-gray-500">大</span>
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onCancel}
            className="px-4 py-1.5 text-sm text-gray-400 hover:text-white transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleCrop}
            className="px-4 py-1.5 text-sm bg-accent text-bg-primary rounded-md hover:bg-blue-300 transition-colors"
          >
            确认
          </button>
        </div>
      </div>
    </div>
  )
}
