import { useState, useCallback, useRef, useEffect } from 'react'
import type { CallStatus, SpeakingState, Message, Accent, Difficulty, Scene, UserSettings } from './types'
import { DEFAULT_SETTINGS } from './types'
import { getGreeting, generateAIResponse, getCorrection, generateEncouragement } from './data/scenarios'
import { useSpeechRecognition } from './hooks/useSpeechRecognition'
import { useSpeechSynthesis } from './hooks/useSpeechSynthesis'
import { useCallTimer } from './hooks/useCallTimer'
import { useLocalStorage } from './hooks/useLocalStorage'
import { useAudioVisualizer } from './hooks/useAudioVisualizer'
import { StatusBar } from './components/StatusBar'
import { CallArea } from './components/CallArea'
import { ControlPanel } from './components/ControlPanel'
import { SettingsDrawer } from './components/SettingsDrawer'
import { HistoryPage } from './components/HistoryPage'
import './App.css'

let messageIdCounter = 0
function generateId(): string {
  messageIdCounter++
  return `msg-${Date.now()}-${messageIdCounter}`
}

function App() {
  const [settings, setSettings] = useLocalStorage<UserSettings>('callEnglishSettings', DEFAULT_SETTINGS)
  const [callStatus, setCallStatus] = useState<CallStatus>('idle')
  const [speakingState, setSpeakingState] = useState<SpeakingState>('idle')
  const [messages, setMessages] = useState<Message[]>([])
  const [isMuted, setIsMuted] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [currentView, setCurrentView] = useState<'call' | 'history'>('call')
  const [textInput, setTextInput] = useState('')
  const [usingAI, setUsingAI] = useState(false)
  const [revealedChars, setRevealedChars] = useState(0)

  const handleWordByWordToggle = useCallback(() => {
    setSettings((prev) => ({ ...prev, wordByWordEnabled: !prev.wordByWordEnabled }))
  }, [setSettings])

  const isProcessingRef = useRef(false)
  const messagesRef = useRef<Message[]>([])
  const settingsRef = useRef(settings)
  const isMutedRef = useRef(isMuted)
  const callStatusRef = useRef(callStatus)
  const startRecognitionRef = useRef<() => void>(() => {})

  useEffect(() => {
    settingsRef.current = settings
  }, [settings])

  useEffect(() => {
    isMutedRef.current = isMuted
  }, [isMuted])

  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  useEffect(() => {
    callStatusRef.current = callStatus
  }, [callStatus])

  const timer = useCallTimer()
  const audioViz = useAudioVisualizer(20)

  useEffect(() => {
    audioViz.setState(speakingState)
  }, [speakingState, audioViz])

  const addMessage = useCallback((role: 'user' | 'ai', content: string, correction?: string) => {
    const msg: Message = {
      id: generateId(),
      role,
      content,
      timestamp: Date.now(),
      correction,
    }
    setMessages((prev) => [...prev, msg])
    return msg
  }, [])

  const speechSynth = useSpeechSynthesis({
    onWord: (charIndex: number) => {
      setRevealedChars(charIndex)
    },
  })

  const revealIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const startRevealInterval = useCallback((text: string, startTime: number, speed: number) => {
    if (revealIntervalRef.current) clearInterval(revealIntervalRef.current)
    const charsPerSec = 14 * speed
    revealIntervalRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000
      const target = Math.min(Math.floor(elapsed * charsPerSec), text.length)
      setRevealedChars(target)
    }, 30)
  }, [])

  const stopRevealInterval = useCallback(() => {
    if (revealIntervalRef.current) {
      clearInterval(revealIntervalRef.current)
      revealIntervalRef.current = null
    }
  }, [])

  const processAIResponse = useCallback(
    async (userText: string) => {
      const { difficulty, correctionEnabled, lastScene, apiKey, apiUrl, apiModel } = settingsRef.current
      const history = messagesRef.current

      let correction: string | undefined
      if (correctionEnabled) {
        const c = getCorrection(userText, difficulty)
        if (c) correction = c
      }

      addMessage('user', userText, correction)

      try {
        const { text: response, usedAI } = await generateAIResponse(userText, lastScene, difficulty, history, correctionEnabled, apiKey, apiUrl, apiModel)
        setUsingAI(usedAI)
        addMessage('ai', response)

        setRevealedChars(0)
        const startTime = Date.now()
        startRevealInterval(response, startTime, settingsRef.current.speed)
        await speechSynth.speak(response, settingsRef.current.accent, settingsRef.current.speed).catch(() => {})
        stopRevealInterval()
        setRevealedChars(response.length)
      } catch (err) {
        const fallback = "Sorry, I'm having trouble connecting. Could you say that again?"
        addMessage('ai', fallback)
        setRevealedChars(0)
        const fbStart = Date.now()
        startRevealInterval(fallback, fbStart, settingsRef.current.speed)
        await speechSynth.speak(fallback, settingsRef.current.accent, settingsRef.current.speed).catch(() => {})
        stopRevealInterval()
        setRevealedChars(fallback.length)
      }

      isProcessingRef.current = false
      if (callStatusRef.current === 'connected') {
        setSpeakingState('listening')
        startRecognitionRef.current()
      }
    },
    [addMessage, speechSynth]
  )

  const handleSpeechResult = useCallback(
    (text: string) => {
      if (callStatusRef.current !== 'connected' || isProcessingRef.current || isMutedRef.current) return

      isProcessingRef.current = true
      setSpeakingState('ai-speaking')
      processAIResponse(text)
    },
    [processAIResponse]
  )

  const handleTextSubmit = useCallback(() => {
    const trimmed = textInput.trim()
    if (!trimmed) return
    setTextInput('')
    handleSpeechResult(trimmed)
  }, [textInput, handleSpeechResult])

  const handlePause = useCallback(
    async (partialText: string) => {
      if (callStatusRef.current !== 'connected' || isProcessingRef.current) return

      const { apiKey, apiUrl, apiModel, accent, speed } = settingsRef.current
      const history = messagesRef.current

      setSpeakingState('encouraging')

      try {
        const encouragement = await generateEncouragement(partialText, history, apiKey, apiUrl, apiModel)
        addMessage('ai', encouragement)
        setRevealedChars(0)
        const encStart = Date.now()
        startRevealInterval(encouragement, encStart, speed)
        await speechSynth.speak(encouragement, accent, speed).catch(() => {})
        stopRevealInterval()
        setRevealedChars(encouragement.length)
      } catch {
        // silently fail, encouragement is optional
      }

      if (callStatusRef.current === 'connected') {
        setSpeakingState('listening')
      }
    },
    [addMessage, speechSynth]
  )

  const {
    isSupported: recognitionSupported,
    startListening: startRecognition,
    stopListening: stopRecognition,
    error: recognitionError,
  } = useSpeechRecognition({
    onResult: handleSpeechResult,
    onSpeechStart: () => setSpeakingState('user-speaking'),
    onSpeechEnd: () => {
      if (!isProcessingRef.current) {
        setSpeakingState('listening')
        setTimeout(() => {
          if (callStatusRef.current === 'connected' && !isProcessingRef.current && !isMutedRef.current) {
            startRecognitionRef.current()
          }
        }, 300)
      }
    },
    onPause: handlePause,
    listeningMode: settings.listeningModeEnabled,
  })

  startRecognitionRef.current = startRecognition

  const handleCall = useCallback(() => {
    setCallStatus('dialing')
    setMessages([])
    setRevealedChars(0)
    messageIdCounter = 0
    isProcessingRef.current = false

    const initCall = async () => {
      await new Promise<void>((r) => setTimeout(r, 1500))

      if (callStatusRef.current !== 'dialing') return

      setCallStatus('connected')
      timer.reset()
      timer.start()
      audioViz.start()
      setSpeakingState('ai-speaking')

      const { lastScene, difficulty, correctionEnabled, apiKey, apiUrl, apiModel, accent, speed } = settingsRef.current

      let greeting: string
      let usedAI = false

      if (apiKey) {
        try {
          const result = await generateAIResponse(
            '',
            lastScene,
            difficulty,
            [],
            correctionEnabled,
            apiKey,
            apiUrl,
            apiModel
          )
          greeting = result.text
          usedAI = result.usedAI
        } catch {
          greeting = getGreeting(lastScene)
        }
      } else {
        greeting = getGreeting(lastScene)
      }

      setUsingAI(usedAI)
      addMessage('ai', greeting)

      setRevealedChars(0)
      const greetStart = Date.now()
      startRevealInterval(greeting, greetStart, speed)
      speechSynth.speak(greeting, accent, speed)
        .then(() => {
          stopRevealInterval()
          setRevealedChars(greeting.length)
          setSpeakingState('listening')
          startRecognition()
        })
        .catch(() => {
          stopRevealInterval()
          setRevealedChars(greeting.length)
          setSpeakingState('listening')
          startRecognition()
        })
    }

    initCall()
  }, [timer, addMessage, speechSynth, startRecognition, audioViz])

  const handleHangup = useCallback(() => {
    stopRecognition()
    audioViz.stop()
    speechSynth.stop()
    stopRevealInterval()
    timer.stop()
    setCallStatus('ended')
    setSpeakingState('idle')
    isProcessingRef.current = false

    const currentMessages = messagesRef.current
    if (currentMessages.length > 0) {
      try {
        const history = JSON.parse(localStorage.getItem('callEnglishHistory') || '[]')
        history.push({
          id: generateId(),
          date: new Date().toISOString(),
          scene: settingsRef.current.lastScene,
          duration: timer.elapsed,
          messages: currentMessages,
        })
        if (history.length > 50) {
          history.splice(0, history.length - 50)
        }
        localStorage.setItem('callEnglishHistory', JSON.stringify(history))
      } catch {
        // storage unavailable
      }
    }
  }, [stopRecognition, speechSynth, timer, audioViz, stopRevealInterval])

  const handleToggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev
      if (next) {
        stopRecognition()
      } else {
        startRecognitionRef.current()
      }
      return next
    })
  }, [stopRecognition])

  const handleSpeedChange = useCallback(
    (speed: number) => {
      setSettings((prev) => ({ ...prev, speed }))
    },
    [setSettings]
  )

  const handleSceneChange = useCallback(
    (scene: Scene) => {
      setSettings((prev) => ({ ...prev, lastScene: scene }))
    },
    [setSettings]
  )

  const handleAccentChange = useCallback(
    (accent: Accent) => {
      setSettings((prev) => ({ ...prev, accent }))
    },
    [setSettings]
  )

  const handleDifficultyChange = useCallback(
    (difficulty: Difficulty) => {
      setSettings((prev) => ({ ...prev, difficulty }))
    },
    [setSettings]
  )

  const handleCorrectionToggle = useCallback(() => {
    setSettings((prev) => ({ ...prev, correctionEnabled: !prev.correctionEnabled }))
  }, [setSettings])

  const handleListeningModeToggle = useCallback(() => {
    setSettings((prev) => ({ ...prev, listeningModeEnabled: !prev.listeningModeEnabled }))
  }, [setSettings])

  const handleApiKeyChange = useCallback(
    (apiKey: string) => {
      setSettings((prev) => ({ ...prev, apiKey }))
    },
    [setSettings]
  )

  return (
    <div className="app-container">
      {currentView === 'history' ? (
        <HistoryPage onClose={() => setCurrentView('call')} />
      ) : (
        <div className="phone-frame">
          <StatusBar
            status={callStatus}
            accent={settings.accent}
            formattedTime={timer.formatted}
          />

          <CallArea
            status={callStatus}
            speakingState={speakingState}
            messages={messages}
            levels={audioViz.levels}
            decibels={audioViz.decibels}
            revealedChars={revealedChars}
            onHangup={handleHangup}
            onCall={handleCall}
          />

          {callStatus === 'connected' && !usingAI && (
            <div className="ai-mode-hint">
              未配置 API Key，使用本地回复。在设置中填入 DeepSeek API Key 启用 AI 对话
            </div>
          )}

          {callStatus === 'connected' && (
            <div className="text-input-bar">
              <input
                type="text"
                className="text-input-field"
                placeholder="输入英文消息..."
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleTextSubmit()
                  }
                }}
                disabled={isProcessingRef.current}
              />
              <button
                className="text-send-btn"
                onClick={handleTextSubmit}
                disabled={isProcessingRef.current || !textInput.trim()}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                </svg>
              </button>
            </div>
          )}

          <ControlPanel
            isMuted={isMuted}
            speed={settings.speed}
            scene={settings.lastScene}
            onToggleMute={handleToggleMute}
            onSpeedChange={handleSpeedChange}
            onSceneChange={handleSceneChange}
            disabled={callStatus !== 'connected'}
          />

          <div className="bottom-bar">
            <button
              className="settings-trigger"
              onClick={() => setSettingsOpen(true)}
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.49.49 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
              </svg>
              <span>设置</span>
            </button>

            <button
              className="settings-trigger"
              onClick={() => setCurrentView('history')}
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M13 3a9 9 0 00-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.954 8.954 0 0013 21a9 9 0 000-18zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/>
              </svg>
              <span>记录</span>
            </button>

            {!recognitionSupported && (
              <span className="browser-warning">请使用 Chrome 浏览器</span>
            )}

            {recognitionError && (
              <span className="error-text">{recognitionError}</span>
            )}
          </div>
        </div>
      )}

      <SettingsDrawer
        isOpen={settingsOpen}
        accent={settings.accent}
        difficulty={settings.difficulty}
        correctionEnabled={settings.correctionEnabled}
        listeningModeEnabled={settings.listeningModeEnabled}
        apiKey={settings.apiKey}
        onAccentChange={handleAccentChange}
        onDifficultyChange={handleDifficultyChange}
        onCorrectionToggle={handleCorrectionToggle}
        onListeningModeToggle={handleListeningModeToggle}
        onApiKeyChange={handleApiKeyChange}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  )
}

export default App