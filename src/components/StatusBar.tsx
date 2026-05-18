import type { CallStatus, Accent } from '../types'
import { AI_NAMES, AI_TITLES } from '../types'

interface UserInfo {
  displayName: string
  email: string
  weekUsage: number
  weekLimit: number
}

interface StatusBarProps {
  status: CallStatus
  accent: Accent
  formattedTime: string
  user?: UserInfo | null
  onUserClick?: () => void
}

export function StatusBar({ status, accent, formattedTime, user, onUserClick }: StatusBarProps) {
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
      <div className="status-bar-right">
        {status === 'connected' && (
          <span className="call-timer">{formattedTime}</span>
        )}
        {user && onUserClick && (
          <button className="user-btn" onClick={onUserClick} title="账号详情">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </svg>
            {user.displayName}
          </button>
        )}
      </div>
    </div>
  )
}