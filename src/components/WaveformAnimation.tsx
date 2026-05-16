import { useRef, useEffect } from 'react'

interface WaveformAnimationProps {
  isActive: boolean
  isUserSpeaking: boolean
  isAiSpeaking: boolean
  levels: number[]
  decibels: number
}

const WIDTH = 280
const HEIGHT = 48
const PADDING = 4

export function WaveformAnimation({
  isActive,
  isUserSpeaking,
  isAiSpeaking,
  levels,
  decibels,
}: WaveformAnimationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = WIDTH * dpr
    canvas.height = HEIGHT * dpr
    ctx.scale(dpr, dpr)

    ctx.clearRect(0, 0, WIDTH, HEIGHT)

    if (!isActive || levels.length === 0) {
      drawIdleLine(ctx)
      return
    }

    const barCount = levels.length
    const barWidth = (WIDTH - PADDING * 2) / barCount
    const maxBarHeight = HEIGHT - PADDING * 2
    const centerY = HEIGHT / 2

    const barColor = isUserSpeaking
      ? getComputedStyle(canvas).getPropertyValue('--primary').trim() || '#6366F1'
      : isAiSpeaking
        ? '#22C55E'
        : getComputedStyle(canvas).getPropertyValue('--text-secondary').trim() || '#94A3B8'

    ctx.fillStyle = barColor

    for (let i = 0; i < barCount; i++) {
      const level = levels[i] ?? 0
      const barHeight = Math.max(1, level * maxBarHeight)
      const x = PADDING + i * barWidth
      const y = centerY - barHeight / 2

      const radius = Math.min(barWidth / 2, 2)
      ctx.beginPath()
      ctx.moveTo(x + radius, y)
      ctx.lineTo(x + barWidth - radius, y)
      ctx.arcTo(x + barWidth, y, x + barWidth, y + radius, radius)
      ctx.lineTo(x + barWidth, y + barHeight - radius)
      ctx.arcTo(x + barWidth, y + barHeight, x + barWidth - radius, y + barHeight, radius)
      ctx.lineTo(x + radius, y + barHeight)
      ctx.arcTo(x, y + barHeight, x, y + barHeight - radius, radius)
      ctx.lineTo(x, y + radius)
      ctx.arcTo(x, y, x + radius, y, radius)
      ctx.closePath()
      ctx.fill()
    }
  }, [levels, decibels, isActive, isUserSpeaking, isAiSpeaking])

  return (
    <div
      className={`waveform-container ${isActive ? 'active' : ''} ${isUserSpeaking ? 'user-speaking' : ''} ${isAiSpeaking ? 'ai-speaking' : ''}`}
    >
      <canvas
        ref={canvasRef}
        className="waveform-canvas"
        style={{ width: WIDTH, height: HEIGHT }}
      />
      {isUserSpeaking && <span className="waveform-label">你在说话...</span>}
      {isAiSpeaking && <span className="waveform-label ai-label">AI 正在回复...</span>}
      {!isUserSpeaking && !isAiSpeaking && isActive && (
        <span className="waveform-label listening-label">正在聆听...</span>
      )}
    </div>
  )
}

function drawIdleLine(ctx: CanvasRenderingContext2D) {
  const y = HEIGHT / 2
  ctx.strokeStyle = ctx.canvas.style.getPropertyValue('--text-light') || '#CBD5E1'
  ctx.lineWidth = 1
  ctx.setLineDash([4, 4])
  ctx.beginPath()
  ctx.moveTo(PADDING, y)
  ctx.lineTo(WIDTH - PADDING, y)
  ctx.stroke()
  ctx.setLineDash([])
}