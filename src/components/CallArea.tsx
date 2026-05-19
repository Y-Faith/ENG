import type { CallStatus, SpeakingState } from '../types'
import { WaveformAnimation } from './WaveformAnimation'
import { ConversationBubbles } from './ConversationBubbles'
import type { Message } from '../types'

interface CallAreaProps {
  status: CallStatus
  speakingState: SpeakingState
  messages: Message[]
  levels: number[]
  decibels: number
  revealedChars: number
  revealingMessageId: string | null
  onHangup: () => void
  onCall: () => void
}

export function CallArea({ status, speakingState, messages, levels, decibels, revealedChars, revealingMessageId, onHangup, onCall }: CallAreaProps) {
  const isActive = status === 'connected' || status === 'dialing'

  return (
    <div className="call-area">
      <WaveformAnimation
        isActive={isActive}
        isUserSpeaking={speakingState === 'user-speaking'}
        isAiSpeaking={speakingState === 'ai-speaking'}
        levels={levels}
        decibels={decibels}
      />

      {status === 'idle' && (
        <div className="call-idle-hint">
          <p>点击下方按钮开始英语对话练习</p>
          <p className="sub-hint">使用 Chrome 浏览器获得最佳体验</p>
        </div>
      )}

      {status === 'dialing' && (
        <div className="call-dialing">
          <div className="dialing-pulse" />
          <p>正在连接 AI 外教...</p>
        </div>
      )}

      {status === 'connected' && (
        <ConversationBubbles messages={messages} revealedChars={revealedChars} revealingMessageId={revealingMessageId} />
      )}

      {status === 'ended' && (
        <div className="call-ended">
          <p>通话已结束</p>
          <p className="sub-hint">点击下方按钮重新开始练习</p>
        </div>
      )}

      <div className="call-actions">
        {status === 'idle' || status === 'ended' ? (
          <button className="call-button" onClick={onCall}>
            <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
              <path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24 11.36 11.36 0 003.58.57 1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1 11.36 11.36 0 00.57 3.58 1 1 0 01-.25 1.01l-2.2 2.2z"/>
            </svg>
            <span>开始通话</span>
          </button>
        ) : (
          <button className="hangup-button" onClick={onHangup}>
            <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
              <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .4-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08a1.005 1.005 0 010-1.42C3.69 8.26 7.67 6 12 6s8.31 2.26 11.71 5.66c.39.39.39 1.03 0 1.42l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.1-.7-.28-.79-.73-1.68-1.36-2.66-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/>
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}