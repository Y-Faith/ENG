import { useRef, useCallback, useState } from 'react'

interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  maxAlternatives: number
  onstart: (() => void) | null
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
  start: () => void
  abort: () => void
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number
  results: SpeechRecognitionResultList
}

interface SpeechRecognitionResultList {
  length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionResult {
  isFinal: boolean
  length: number
  item(index: number): SpeechRecognitionAlternative
  [index: number]: SpeechRecognitionAlternative
}

interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string
  message: string
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition
    webkitSpeechRecognition: new () => SpeechRecognition
  }
}

interface UseSpeechRecognitionOptions {
  onResult: (text: string) => void
  onSpeechStart?: () => void
  onSpeechEnd?: () => void
  onPause?: (text: string) => void
  listeningMode?: boolean
  getVolume?: () => number
}

interface UseSpeechRecognitionReturn {
  isListening: boolean
  isSupported: boolean
  startListening: () => void
  stopListening: () => void
  transcript: string
  setTranscript: (text: string) => void
  error: string | null
}

const SUBMIT_PAUSE_MS = 2500
const NORMAL_SUBMIT_MS = 1200

export function useSpeechRecognition({
  onResult,
  onSpeechStart,
  onSpeechEnd,
  onPause,
  listeningMode = false,
  getVolume,
}: UseSpeechRecognitionOptions): UseSpeechRecognitionReturn {
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)
  const isSupported = typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

  const transcriptRef = useRef('')
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const submittedRef = useRef(false)
  const onResultRef = useRef(onResult)
  const onSpeechStartRef = useRef(onSpeechStart)
  const onSpeechEndRef = useRef(onSpeechEnd)
  const onPauseRef = useRef(onPause)
  const listeningModeRef = useRef(listeningMode)

  onResultRef.current = onResult
  onSpeechStartRef.current = onSpeechStart
  onSpeechEndRef.current = onSpeechEnd
  onPauseRef.current = onPause
  listeningModeRef.current = listeningMode

  const clearTimers = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current)
      silenceTimerRef.current = null
    }
  }, [])

  const submitAndStop = useCallback(() => {
    clearTimers()
    submittedRef.current = true
    if (recognitionRef.current) {
      recognitionRef.current.abort()
      recognitionRef.current = null
    }
    setIsListening(false)
    const text = transcriptRef.current.trim()
    if (text) {
      if (listeningModeRef.current && onPauseRef.current) {
        onPauseRef.current(text)
      } else {
        onResultRef.current(text)
      }
    }
    transcriptRef.current = ''
    setTranscript('')
    onSpeechEndRef.current?.()
  }, [clearTimers])

  const startListening = useCallback(() => {
    if (!isSupported) {
      setError('您的浏览器不支持语音识别，请使用 Chrome 浏览器')
      return
    }

    clearTimers()

    if (recognitionRef.current) {
      recognitionRef.current.abort()
    }

    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognitionAPI()

    recognition.lang = 'en-US'
    recognition.interimResults = true
    recognition.continuous = true
    recognition.maxAlternatives = 1

    recognition.onstart = () => {
      setIsListening(true)
      setError(null)
      submittedRef.current = false
      transcriptRef.current = ''
      setTranscript('')
      onSpeechStartRef.current?.()
    }

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimText = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        interimText += result[0].transcript
      }

      transcriptRef.current = interimText
      setTranscript(interimText)

      // Check volume: if too quiet, treat as noise and don't reset silence timer
      const db = getVolume?.() ?? 0
      const isQuiet = db < -35 // below -35dB is likely background noise

      if (isQuiet && silenceTimerRef.current) {
        // Keep the existing timer running, don't reset
        return
      }

      clearTimers()

      if (listeningModeRef.current) {
        silenceTimerRef.current = setTimeout(() => {
          submitAndStop()
        }, SUBMIT_PAUSE_MS)
      } else {
        silenceTimerRef.current = setTimeout(() => {
          submitAndStop()
        }, NORMAL_SUBMIT_MS)
      }
    }

    recognition.onerror = (event: Event) => {
      const errorEvent = event as SpeechRecognitionErrorEvent
      if (errorEvent.error === 'no-speech') {
        return
      }
      if (errorEvent.error === 'aborted') {
        return
      }
      setError(`语音识别错误: ${errorEvent.error}`)
    }

    recognition.onend = () => {
      clearTimers()
      setIsListening(false)

      // Skip if already submitted via submitAndStop
      if (submittedRef.current) {
        submittedRef.current = false
        return
      }

      const text = transcriptRef.current.trim()
      if (text) {
        onResultRef.current(text)
      }
      transcriptRef.current = ''
      setTranscript('')

      onSpeechEndRef.current?.()
    }

    recognitionRef.current = recognition
    recognition.start()
  }, [isSupported, clearTimers, submitAndStop])

  const stopListening = useCallback(() => {
    clearTimers()
    submittedRef.current = true
    transcriptRef.current = ''
    setTranscript('')
    if (recognitionRef.current) {
      recognitionRef.current.abort()
      recognitionRef.current = null
    }
    setIsListening(false)
  }, [clearTimers])

  return {
    isListening,
    isSupported,
    startListening,
    stopListening,
    transcript,
    setTranscript,
    error,
  }
}

export type { UseSpeechRecognitionReturn }