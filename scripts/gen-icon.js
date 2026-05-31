const { createCanvas } = require('canvas')
const fs = require('fs')
const path = require('path')

const size = 256
const canvas = createCanvas(size, size)
const ctx = canvas.getContext('2d')

// Background circle
ctx.fillStyle = '#1a1a2e'
ctx.beginPath()
ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
ctx.fill()

// Whale body
const cx = size / 2
const cy = size / 2 + 10

ctx.fillStyle = '#4fc3f7'

// Main body (ellipse)
ctx.beginPath()
ctx.ellipse(cx, cy, 80, 50, 0, 0, Math.PI * 2)
ctx.fill()

// Tail
ctx.beginPath()
ctx.moveTo(cx + 60, cy - 10)
ctx.quadraticCurveTo(cx + 110, cy - 50, cx + 100, cy - 70)
ctx.quadraticCurveTo(cx + 85, cy - 40, cx + 70, cy - 20)
ctx.fill()

ctx.beginPath()
ctx.moveTo(cx + 60, cy + 10)
ctx.quadraticCurveTo(cx + 110, cy + 50, cx + 100, cy + 70)
ctx.quadraticCurveTo(cx + 85, cy + 40, cx + 70, cy + 20)
ctx.fill()

// Belly (lighter)
ctx.fillStyle = '#b3e5fc'
ctx.beginPath()
ctx.ellipse(cx, cy + 15, 60, 25, 0, 0, Math.PI)
ctx.fill()

// Eye
ctx.fillStyle = '#ffffff'
ctx.beginPath()
ctx.arc(cx - 40, cy - 15, 10, 0, Math.PI * 2)
ctx.fill()

ctx.fillStyle = '#1a1a2e'
ctx.beginPath()
ctx.arc(cx - 38, cy - 15, 5, 0, Math.PI * 2)
ctx.fill()

// Mouth (smile)
ctx.strokeStyle = '#0277bd'
ctx.lineWidth = 2.5
ctx.beginPath()
ctx.arc(cx - 45, cy + 5, 15, 0.1 * Math.PI, 0.9 * Math.PI)
ctx.stroke()

// Water spout
ctx.strokeStyle = '#81d4fa'
ctx.lineWidth = 3
ctx.lineCap = 'round'

// Left spout
ctx.beginPath()
ctx.moveTo(cx - 20, cy - 55)
ctx.quadraticCurveTo(cx - 30, cy - 85, cx - 40, cy - 95)
ctx.stroke()

// Right spout
ctx.beginPath()
ctx.moveTo(cx - 10, cy - 55)
ctx.quadraticCurveTo(cx, cy - 85, cx + 10, cy - 95)
ctx.stroke()

// Spout drops
ctx.fillStyle = '#81d4fa'
ctx.beginPath()
ctx.arc(cx - 42, cy - 97, 4, 0, Math.PI * 2)
ctx.fill()
ctx.beginPath()
ctx.arc(cx + 12, cy - 97, 4, 0, Math.PI * 2)
ctx.fill()
ctx.beginPath()
ctx.arc(cx - 15, cy - 92, 3, 0, Math.PI * 2)
ctx.fill()

// Save PNG
const outDir = path.join(__dirname, '..', 'resources')
fs.mkdirSync(outDir, { recursive: true })
const buffer = canvas.toBuffer('image/png')
fs.writeFileSync(path.join(outDir, 'icon.png'), buffer)
console.log('Icon saved to resources/icon.png')
