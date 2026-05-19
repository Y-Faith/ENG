import { useState, useCallback, useRef, useEffect } from 'react'
import type { CallStatus, SpeakingState, Message, Accent, Difficulty, Scene, UserSettings, APIConfig } from './types'
import { DEFAULT_SETTINGS } from './types'
import { getGreeting, generateAIGreeting, generateAIResponse, getCorrection, generateContextualResponse } from './data/scenarios'
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
import LoginPage from './components/LoginPage'
import { AccountPage } from './components/AccountPage'
import * as api from './services/api'
import './App.css'

let messageIdCounter = 0
function generateId(): string {
  messageIdCounter++
  return `msg-${Date.now()}-${messageIdCounter}`
}

const DEFAULT_API: APIConfig = {
  id: '__default__',
  name: '默认 AI',
  platform: 'custom',
  apiUrl: '',
  apiModel: '',
  apiKey: '__proxy__',
}

function needsAuth(): boolean {
  return import.meta.env.PROD
}

function App() {
  const [settings, setSettings] = useLocalStorage<UserSettings>('seuEngSettings', DEFAULT_SETTINGS)
  const [callStatus, setCallStatus] = useState<CallStatus>('idle')
  const [speakingState, setSpeakingState] = useState<SpeakingState>('idle')
  const [messages, setMessages] = useState<Message[]>([])
  const [isMuted, setIsMuted] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [currentView, setCurrentView] = useState<'call' | 'history' | 'account'>('call')
  const [textInput, setTextInput] = useState('')
  const [usingAI, setUsingAI] = useState(false)
  const [revealedChars, setRevealedChars] = useState(0)
  const [revealingMessageId, setRevealingMessageId] = useState<string | null>(null)
  const [user, setUser] = useState<api.UserInfo | null>(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [userMemories, setUserMemories] = useState<api.Memory[]>([])

  const isProcessingRef = useRef(false)
  const messagesRef = useRef<Message[]>([])
  const settingsRef = useRef(settings)
  const isMutedRef = useRef(isMuted)
  const callStatusRef = useRef(callStatus)
  const startRecognitionRef = useRef<() => void>(() => {})
  const stopRecognitionRef = useRef<() => void>(() => {})
  const callAbortedRef = useRef(false)
  const memoriesRef = useRef<api.Memory[]>([])

  useEffect(() => {
    memoriesRef.current = userMemories
  }, [userMemories])

  const loadMemoriesAsync = useCallback(() => {
    const cached = localStorage.getItem('seuEngMemories')
    if (cached) {
      try {
        const parsed = JSON.parse(cached)
        if (Array.isArray(parsed)) {
          setUserMemories(parsed)
          memoriesRef.current = parsed
        }
      } catch {}
    }

    api.getMemories()
      .then((res) => {
        setUserMemories(res.memories)
        memoriesRef.current = res.memories
        localStorage.setItem('seuEngMemories', JSON.stringify(res.memories))
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (needsAuth()) {
      api.getMe()
        .then((res) => {
          setUser(res.user)
          const cached = localStorage.getItem('seuEngMemories')
          if (cached) {
            try {
              const parsed = JSON.parse(cached)
              if (Array.isArray(parsed)) {
                setUserMemories(parsed)
                memoriesRef.current = parsed
              }
            } catch {}
          }
          return api.getMemories()
        })
        .then((res) => {
          if (res) {
            setUserMemories(res.memories)
            memoriesRef.current = res.memories
            localStorage.setItem('seuEngMemories', JSON.stringify(res.memories))
          }
        })
        .catch(() => {})
        .finally(() => setAuthChecked(true))
    } else {
      setAuthChecked(true)
    }
  }, [])

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

  const addMessage = useCallback((role: 'user' | 'ai', content: string, correction?: string): Message => {
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

  const getActiveApi = useCallback((): APIConfig | null => {
    if (needsAuth() && !user) return null
    const { apis, activeApiId } = settingsRef.current
    const userApi = apis.find((a) => a.id === activeApiId)
    if (userApi) return userApi
    if (needsAuth()) return DEFAULT_API
    return null
  }, [user])

  const speechSynth = useSpeechSynthesis({})

  const revealIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const startRevealInterval = useCallback((text: string, speed: number) => {
    if (revealIntervalRef.current) clearInterval(revealIntervalRef.current)
    const charsPerSec = 14 * speed
    const start = Date.now()
    revealIntervalRef.current = setInterval(() => {
      const elapsed = (Date.now() - start) / 1000
      const target = Math.min(Math.floor(elapsed * charsPerSec), text.length)
      setRevealedChars(target)
      if (target >= text.length) {
        clearInterval(revealIntervalRef.current!)
        revealIntervalRef.current = null
        setRevealingMessageId(null)
      }
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
      const { difficulty, correctionEnabled, lastScene } = settingsRef.current
      const history = messagesRef.current
      const activeApi = getActiveApi()

      // Stop listening while AI is speaking
      stopRecognitionRef.current()

      let correction: string | undefined
      if (correctionEnabled) {
        const c = getCorrection(userText, difficulty)
        if (c) correction = c
      }

      addMessage('user', userText, correction)

      try {
        const { text: response, usedAI } = await generateAIResponse(userText, lastScene, difficulty, history, correctionEnabled, activeApi?.apiKey, activeApi?.apiUrl, activeApi?.apiModel, memoriesRef.current)

        // Check if call was aborted during API call
        if (callAbortedRef.current) return

        setUsingAI(usedAI)
        setRevealedChars(0)
        const aiMsg = addMessage('ai', response)
        setRevealingMessageId(aiMsg.id)

        if (usedAI && needsAuth() && user) {
          setUser({ ...user, dayUsage: user.dayUsage + 1 })
          api.getUsage().then((u) => {
            if (user) setUser({ ...user, dayUsage: u.dayUsage, dayLimit: u.dayLimit })
          }).catch(() => {})
        }

        startRevealInterval(response, settingsRef.current.speed)
        await speechSynth.speak(response, settingsRef.current.accent, settingsRef.current.speed).catch(() => {})

        // Check if call was aborted during speech
        if (callAbortedRef.current) return

        // Ensure reveal completes even if speech ended early
        stopRevealInterval()
        setRevealedChars(response.length)
        setRevealingMessageId(null)
      } catch (err) {
        if (callAbortedRef.current) return

        const fallback = "Sorry, I'm having trouble connecting. Could you say that again?"
        setRevealedChars(0)
        const fbMsg = addMessage('ai', fallback)
        setRevealingMessageId(fbMsg.id)
        startRevealInterval(fallback, settingsRef.current.speed)
        await speechSynth.speak(fallback, settingsRef.current.accent, settingsRef.current.speed).catch(() => {})

        if (callAbortedRef.current) return

        stopRevealInterval()
        setRevealedChars(fallback.length)
        setRevealingMessageId(null)
      }

      // Wait for reveal to finish before restarting recognition
      await new Promise<void>((resolve) => {
        const check = () => {
          if (!revealIntervalRef.current) {
            resolve()
          } else {
            setTimeout(check, 50)
          }
        }
        check()
      })

      isProcessingRef.current = false
      if (callStatusRef.current === 'connected') {
        setSpeakingState('listening')
        setTimeout(() => startRecognitionRef.current(), 500)
      }
    },
    [addMessage, speechSynth, getActiveApi]
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
    async (finalText: string) => {
      if (callStatusRef.current !== 'connected') return
      if (!settings.listeningModeEnabled) return

      const { accent, speed, lastScene } = settingsRef.current
      const activeApi = getActiveApi()
      const history = messagesRef.current

      addMessage('user', finalText)

      setSpeakingState('ai-speaking')

      try {
        const response = await generateContextualResponse(finalText, history, lastScene, activeApi?.apiKey, activeApi?.apiUrl, activeApi?.apiModel)
        setRevealedChars(0)
        const aiMsg = addMessage('ai', response)
        setRevealingMessageId(aiMsg.id)
        startRevealInterval(response, speed)
        await speechSynth.speak(response, accent, speed).catch(() => {})
        stopRevealInterval()
        setRevealedChars(response.length)
        setRevealingMessageId(null)
      } catch {
        // silent fail
      }

      if (callStatusRef.current === 'connected') {
        isProcessingRef.current = false
        setSpeakingState('listening')
        setTimeout(() => {
          if (callStatusRef.current === 'connected' && !isProcessingRef.current && !isMutedRef.current) {
            startRecognitionRef.current()
          }
        }, 500)
      }
    },
    [addMessage, speechSynth, settings.listeningModeEnabled, getActiveApi]
  )

  const {
    isSupported: recognitionSupported,
    startListening: startRecognition,
    stopListening: stopRecognition,
    error: recognitionError,
  } = useSpeechRecognition({
    onResult: handleSpeechResult,
    onSpeechStart: () => {
      if (!isProcessingRef.current) {
        setSpeakingState('user-speaking')
      }
    },
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
    getVolume: () => audioViz.decibels,
  })

  startRecognitionRef.current = startRecognition
  stopRecognitionRef.current = stopRecognition

  const handleCall = useCallback(() => {
    setCallStatus('dialing')
    setMessages([])
    setRevealedChars(0)
    messageIdCounter = 0
    isProcessingRef.current = false
    callAbortedRef.current = false

    const initCall = async () => {
      const { lastScene, difficulty, accent, speed } = settingsRef.current
      const activeApi = getActiveApi()

      const greetingPromise = activeApi?.apiKey
        ? generateAIGreeting(lastScene, difficulty, activeApi.apiKey, activeApi.apiUrl, activeApi.apiModel)
            .catch(() => getGreeting(lastScene))
        : Promise.resolve(getGreeting(lastScene))

      const greeting = await greetingPromise

      if (callStatusRef.current !== 'dialing') return

      setCallStatus('connected')
      timer.reset()
      timer.start()
      audioViz.start()
      setSpeakingState('ai-speaking')

      const usedAI = !!activeApi?.apiKey

      setUsingAI(usedAI)
      const greetMsg = addMessage('ai', greeting)

      if (needsAuth()) {
        loadMemoriesAsync()
      }

      setRevealedChars(0)
      setRevealingMessageId(greetMsg.id)
      startRevealInterval(greeting, speed)
      speechSynth.speak(greeting, accent, speed)
        .then(() => {
          stopRevealInterval()
          setRevealedChars(greeting.length)
          setRevealingMessageId(null)
          setSpeakingState('listening')
          setTimeout(() => startRecognition(), 500)
        })
        .catch(() => {
          stopRevealInterval()
          setRevealedChars(greeting.length)
          setRevealingMessageId(null)
          setSpeakingState('listening')
          setTimeout(() => startRecognition(), 500)
        })
    }

    initCall()
  }, [timer, addMessage, speechSynth, startRecognition, audioViz, getActiveApi])

  const handleHangup = useCallback(() => {
    stopRecognition()
    audioViz.stop()
    speechSynth.stop()
    stopRevealInterval()
    timer.stop()
    setCallStatus('ended')
    setSpeakingState('idle')
    setRevealedChars(0)
    isProcessingRef.current = false
    callAbortedRef.current = true

    const currentMessages = messagesRef.current
    if (currentMessages.length > 0) {
      if (needsAuth() && user) {
        api.saveHistory({
          scene: settingsRef.current.lastScene,
          difficulty: settingsRef.current.difficulty,
          messages: currentMessages.map((m) => ({ role: m.role, content: m.content })),
          durationSeconds: timer.elapsed,
        }).catch(() => {})

        api.extractMemories(
          currentMessages.map((m) => ({ role: m.role, content: m.content }))
        ).then((res) => {
          if (res.memories.length > 0) {
            return api.getMemories()
          }
          return null
        }).then((res) => {
          if (res) {
            setUserMemories(res.memories)
            memoriesRef.current = res.memories
            localStorage.setItem('seuEngMemories', JSON.stringify(res.memories))
          }
        }).catch(() => {})

        api.compressMemories().catch(() => {})
      }

      try {
        const history = JSON.parse(localStorage.getItem('seuEngHistory') || '[]')
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
        localStorage.setItem('seuEngHistory', JSON.stringify(history))
      } catch {
        // storage unavailable
      }
    }
  }, [stopRecognition, speechSynth, timer, audioViz, stopRevealInterval, user])

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

  const handleAddApi = useCallback(
    (api: Omit<APIConfig, 'id'>) => {
      setSettings((prev) => {
        const newApi: APIConfig = {
          ...api,
          id: `api-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        }
        const newApis = [...prev.apis, newApi]
        return {
          ...prev,
          apis: newApis,
          activeApiId: prev.activeApiId || newApi.id,
        }
      })
    },
    [setSettings]
  )

  const handleRemoveApi = useCallback(
    (id: string) => {
      setSettings((prev) => {
        const newApis = prev.apis.filter((a) => a.id !== id)
        return {
          ...prev,
          apis: newApis,
          activeApiId: prev.activeApiId === id ? (newApis[0]?.id || null) : prev.activeApiId,
        }
      })
    },
    [setSettings]
  )

  const handleSetActiveApi = useCallback(
    (id: string | null) => {
      setSettings((prev) => ({ ...prev, activeApiId: id }))
    },
    [setSettings]
  )

  const handleUpdateApi = useCallback(
    (id: string, updates: Omit<APIConfig, 'id'>) => {
      setSettings((prev) => ({
        ...prev,
        apis: prev.apis.map((a) =>
          a.id === id
            ? { ...a, name: updates.name, platform: updates.platform, apiUrl: updates.apiUrl, apiModel: updates.apiModel }
            : a
        ),
      }))
    },
    [setSettings]
  )

  const handleLogin = useCallback((loggedInUser: api.UserInfo) => {
    setUser(loggedInUser)
  }, [])

  const handleLogout = useCallback(() => {
    api.clearToken()
    setUser(null)
    if (callStatus !== 'idle') {
      handleHangup()
    }
    setMessages([])
  }, [callStatus, handleHangup])

  if (!authChecked) {
    return (
      <div className="app-container">
        <div className="loading-screen">加载中...</div>
      </div>
    )
  }

  if (needsAuth() && !user) {
    return <LoginPage onLogin={handleLogin} />
  }

  const showDefaultApiHint = needsAuth() && !settings.apis.find((a) => a.id === settings.activeApiId)

  return (
    <div className="app-container">
      {currentView === 'history' ? (
        <HistoryPage onClose={() => setCurrentView('call')} />
      ) : currentView === 'account' && user ? (
        <AccountPage
          user={user}
          onClose={() => setCurrentView('call')}
          onLogout={() => { setCurrentView('call'); handleLogout() }}
          onMemoriesChanged={loadMemoriesAsync}
        />
      ) : (
        <div className="phone-frame">
          <StatusBar
            status={callStatus}
            accent={settings.accent}
            formattedTime={timer.formatted}
            user={user}
            onUserClick={() => setCurrentView('account')}
          />

          <CallArea
            status={callStatus}
            speakingState={speakingState}
            messages={messages}
            levels={audioViz.levels}
            decibels={audioViz.decibels}
            revealedChars={revealedChars}
            revealingMessageId={revealingMessageId}
            onHangup={handleHangup}
            onCall={handleCall}
          />

          {callStatus === 'connected' && !usingAI && !needsAuth() && (
            <div className="ai-mode-hint">
              未配置 API，使用本地回复。在设置中添加 API Key 启用 AI 对话
            </div>
          )}

          {callStatus === 'connected' && showDefaultApiHint && (
            <div className="ai-mode-hint">
              使用默认 AI · 每日 {user?.dayLimit || 100} 次 · 已用 {user?.dayUsage || 0} 次
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
        apis={settings.apis}
        activeApiId={settings.activeApiId}
        onAccentChange={handleAccentChange}
        onDifficultyChange={handleDifficultyChange}
        onCorrectionToggle={handleCorrectionToggle}
        onListeningModeToggle={handleListeningModeToggle}
        onAddApi={handleAddApi}
        onUpdateApi={handleUpdateApi}
        onRemoveApi={handleRemoveApi}
        onSetActiveApi={handleSetActiveApi}
        onClose={() => setSettingsOpen(false)}
        onLogout={needsAuth() ? handleLogout : undefined}
        user={user ?? undefined}
      />

    </div>
  )
}

export default App