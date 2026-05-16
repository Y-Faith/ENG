import type { CallStatus, Accent } from '../types'
import { AI_NAMES, AI_TITLES } from '../types'

interface StatusBarProps {
  status: CallStatus
  accent: Accent
  formattedTime: string
}

export function StatusBar({ status, accent, formattedTime }: StatusBarProps) {
  const statusText: Record<CallStatus, string> = {
    idle: '准备就绪',
    dialing: '正在连接...',
    connected: '通话中',
    ended: '通话已结束',
  }

  return (
    <div className="status-bar">
      <div className="status-bar-left">
        <div className={`status-indicator ${status}`} />
        <div className="status-info">
          <span className="status-text">{statusText[status]}</span>
          {status === 'connected' && (
            <span className="ai-name">
              {AI_NAMES[accent]} - {AI_TITLES[accent]}
            </span>
          )}
        </div>
      </div>
      {status === 'connected' && (
        <div className="status-bar-right">
          <span className="call-timer">{formattedTime}</span>
        </div>
      )}
    </div>
  )
}