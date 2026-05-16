import { useRef, useCallback, useState } from 'react'
import type { Accent } from '../types'

const ACCENT_VOICES: Record<Accent, { lang: string; namePattern: string }> = {
  american: { lang: 'en-US', namePattern: 'en-US|en_US|english.*us|samantha|zira|david|mark' },
  british: { lang: 'en-GB', namePattern: 'en-GB|en_GB|english.*uk|daniel|hazel|british' },
  australian: { lang: 'en-AU', namePattern: 'en-AU|en_AU|australian|karen|lee' },
}

interface UseSpeechSynthesisReturn {
  speak: (text: string, accent: Accent, speed: number) => Promise<void>
  stop: () => void
  isSpeaking: boolean
  isSupported: boolean
}

export function useSpeechSynthesis(): UseSpeechSynthesisReturn {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window

  const findVoice = useCallback((accent: Accent): SpeechSynthesisVoice | null => {
    const voices = window.speechSynthesis.getVoices()
    if (voices.length === 0) return null

    const { lang, namePattern } = ACCENT_VOICES[accent]
    const regex = new RegExp(namePattern, 'i')

    const matched = voices.filter(v => regex.test(v.name) || v.lang === lang)
    if (matched.length > 0) return matched[0]

    const langMatch = voices.find(v => v.lang.startsWith(lang.split('-')[0]))
    if (langMatch) return langMatch

    return voices[0]
  }, [])

  const speak = useCallback((text: string, accent: Accent, speed: number): Promise<void> => {
    return new Promise((resolve) => {
      if (!isSupported) {
        resolve()
        return
      }

      window.speechSynthesis.cancel()

      const utterance = new SpeechSynthesisUtterance(text)
      utteranceRef.current = utterance

      const voice = findVoice(accent)
      if (voice) {
        utterance.voice = voice
        utterance.lang = voice.lang
      } else {
        const langMap: Record<Accent, string> = {
          american: 'en-US',
          british: 'en-GB',
          australian: 'en-AU',
        }
        utterance.lang = langMap[accent]
      }

      utterance.rate = speed
      utterance.pitch = 1.0
      utterance.volume = 1.0

      utterance.onstart = () => setIsSpeaking(true)

      utterance.onend = () => {
        setIsSpeaking(false)
        utteranceRef.current = null
        resolve()
      }

      utterance.onerror = () => {
        setIsSpeaking(false)
        utteranceRef.current = null
        resolve()
      }

      window.speechSynthesis.speak(utterance)
    })
  }, [isSupported, findVoice])

  const stop = useCallback(() => {
    if (isSupported) {
      window.speechSynthesis.cancel()
    }
    setIsSpeaking(false)
    utteranceRef.current = null
  }, [isSupported])

  return { speak, stop, isSpeaking, isSupported }
}