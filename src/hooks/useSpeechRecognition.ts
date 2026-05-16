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

interface UseSpeechRecognitionReturn {
  isListening: boolean
  isSupported: boolean
  startListening: () => void
  stopListening: () => void
  transcript: string
  setTranscript: (text: string) => void
  error: string | null
}

export function useSpeechRecognition(
  onResult: (text: string) => void,
  onSpeechStart?: () => void,
  onSpeechEnd?: () => void
): UseSpeechRecognitionReturn {
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)
  const isSupported = typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

  const transcriptRef = useRef('')
  const finalTextRef = useRef('')
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onResultRef = useRef(onResult)
  const onSpeechStartRef = useRef(onSpeechStart)
  const onSpeechEndRef = useRef(onSpeechEnd)

  onResultRef.current = onResult
  onSpeechStartRef.current = onSpeechStart
  onSpeechEndRef.current = onSpeechEnd

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current)
      silenceTimerRef.current = null
    }
  }, [])

  const submitAndStop = useCallback(() => {
    clearSilenceTimer()
    if (recognitionRef.current) {
      recognitionRef.current.abort()
      recognitionRef.current = null
    }
    setIsListening(false)
    const text = finalTextRef.current.trim() || transcriptRef.current.trim()
    if (text) {
      onResultRef.current(text)
    }
    transcriptRef.current = ''
    finalTextRef.current = ''
    setTranscript('')
    onSpeechEndRef.current?.()
  }, [clearSilenceTimer])

  const startListening = useCallback(() => {
    if (!isSupported) {
      setError('您的浏览器不支持语音识别，请使用 Chrome 浏览器')
      return
    }

    clearSilenceTimer()

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
      transcriptRef.current = ''
      finalTextRef.current = ''
      setTranscript('')
      onSpeechStartRef.current?.()
    }

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      clearSilenceTimer()

      let interimText = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          finalTextRef.current += result[0].transcript
        } else {
          interimText += result[0].transcript
        }
      }

      const displayText = finalTextRef.current + interimText
      transcriptRef.current = displayText
      setTranscript(displayText)

      silenceTimerRef.current = setTimeout(() => {
        submitAndStop()
      }, 2000)
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
      clearSilenceTimer()
      setIsListening(false)

      const text = finalTextRef.current.trim() || transcriptRef.current.trim()
      if (text) {
        onResultRef.current(text)
      }
      transcriptRef.current = ''
      finalTextRef.current = ''
      setTranscript('')

      onSpeechEndRef.current?.()
    }

    recognitionRef.current = recognition
    recognition.start()
  }, [isSupported, clearSilenceTimer, submitAndStop])

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.abort()
      recognitionRef.current = null
    }
    setIsListening(false)
  }, [])

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