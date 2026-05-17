import type { CallStatus, Accent } from '../types'
import { AI_NAMES, AI_TITLES } from '../types'

interface UserInfo {
  displayName: string
}

interface StatusBarProps {
  status: CallStatus
  accent: Accent
  formattedTime: string
  user?: UserInfo | null
  onLogout?: () => void
}

export function StatusBar({ status, accent, formattedTime, user, onLogout }: StatusBarProps) {
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
        {user && onLogout && (
          <button className="logout-btn" onClick={onLogout} title="退出登录">
            {user.displayName}
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
              <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}