import { useRef, useState, useCallback, useEffect } from 'react'

export type VizState = 'idle' | 'listening' | 'user-speaking' | 'ai-speaking'

interface UseAudioVisualizerReturn {
  levels: number[]
  decibels: number
  isActive: boolean
  start: () => void
  stop: () => void
  setState: (state: VizState) => void
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function calculateRMS(samples: Uint8Array): number {
  let sum = 0
  for (let i = 0; i < samples.length; i++) {
    const normalized = (samples[i] - 128) / 128
    sum += normalized * normalized
  }
  return Math.sqrt(sum / samples.length)
}

function rmsToDecibels(rms: number): number {
  if (rms < 0.0001) return -60
  const db = 20 * Math.log10(rms)
  return Math.max(-60, Math.min(0, db))
}

export function useAudioVisualizer(barCount: number = 40): UseAudioVisualizerReturn {
  const [levels, setLevels] = useState<number[]>(new Array(barCount).fill(0))
  const [decibels, setDecibels] = useState(-60)
  const [isActive, setIsActive] = useState(false)
  const animFrameRef = useRef<number>(0)
  const stateRef = useRef<VizState>('idle')
  const prevLevelsRef = useRef<number[]>(new Array(barCount).fill(0))
  const runningRef = useRef(false)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const timeDataRef = useRef<Uint8Array | null>(null)

  const cleanupAudio = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {})
      audioContextRef.current = null
    }
    analyserRef.current = null
    timeDataRef.current = null
  }, [])

  const stop = useCallback(() => {
    runningRef.current = false
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current)
      animFrameRef.current = 0
    }
    cleanupAudio()
    setIsActive(false)
    setLevels(new Array(barCount).fill(0))
    setDecibels(-60)
    prevLevelsRef.current = new Array(barCount).fill(0)
  }, [barCount, cleanupAudio])

  const setState = useCallback((state: VizState) => {
    stateRef.current = state
  }, [])

  const start = useCallback(async () => {
    if (runningRef.current) return

    cleanupAudio()

    let useRealMic = false

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      })
      streamRef.current = stream

      const audioCtx = new AudioContext()
      audioContextRef.current = audioCtx

      if (audioCtx.state === 'suspended') {
        await audioCtx.resume()
      }

      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 2048
      analyser.smoothingTimeConstant = 0.5
      analyserRef.current = analyser

      const source = audioCtx.createMediaStreamSource(stream)
      source.connect(analyser)

      timeDataRef.current = new Uint8Array(analyser.fftSize)
      useRealMic = true
    } catch {
      cleanupAudio()
    }

    runningRef.current = true
    setIsActive(true)
    prevLevelsRef.current = new Array(barCount).fill(0)
    const phaseRefLocal = { value: 0 }

    const updateLevels = () => {
      if (!runningRef.current) return

      const analyser = analyserRef.current
      const timeData = timeDataRef.current as unknown as Uint8Array
      const prev = prevLevelsRef.current
      const newLevels: number[] = []

      if (useRealMic && analyser && timeData) {
        analyser.getByteTimeDomainData(timeData as unknown as Uint8Array<ArrayBuffer>)

        const rms = calculateRMS(timeData as unknown as Uint8Array)
        const db = rmsToDecibels(rms)
        const volumeNorm = Math.min(1, Math.max(0, (db + 48) / 42))

        const step = timeData.length / barCount

        for (let i = 0; i < barCount; i++) {
          const idx = Math.floor(i * step)
          const sample = (timeData[idx] - 128) / 128
          const raw = Math.abs(sample) * volumeNorm * 5.0
          const clamped = Math.min(1, raw)
          const smoothed = lerp(prev[i] ?? 0, clamped, 0.4)
          newLevels.push(smoothed)
        }

        setDecibels((prevDb) => lerp(prevDb, db, 0.3))
      } else {
        phaseRefLocal.value += 0.1
        const t = phaseRefLocal.value

        const state = stateRef.current
        let baseAmplitude: number

        switch (state) {
          case 'idle':
            baseAmplitude = 0
            break
          case 'listening':
            baseAmplitude = 0.06
            break
          case 'user-speaking':
            baseAmplitude = 0.7
            break
          case 'ai-speaking':
            baseAmplitude = 0.4
            break
          default:
            baseAmplitude = 0
        }

        for (let i = 0; i < barCount; i++) {
          const phase = t * 2 + (i / barCount) * Math.PI * 3
          const wave = Math.sin(phase) * 0.5 + 0.5
          const envelope = 1 - Math.abs((i / barCount - 0.5) * 2) * 0.3
          const target = wave * baseAmplitude * envelope
          const smoothed = lerp(prev[i] ?? 0, target, 0.3)
          newLevels.push(smoothed)
        }

        const simDb = baseAmplitude > 0.01 ? -30 + baseAmplitude * 30 : -60
        setDecibels((prevDb) => lerp(prevDb, simDb, 0.3))
      }

      prevLevelsRef.current = newLevels
      setLevels(newLevels)
      animFrameRef.current = requestAnimationFrame(updateLevels)
    }

    updateLevels()
  }, [barCount, cleanupAudio])

  useEffect(() => {
    return () => {
      runningRef.current = false
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current)
      }
      cleanupAudio()
    }
  }, [cleanupAudio])

  return { levels, decibels, isActive, start, stop, setState }
}