import type { CallStatus, Accent } from '../types'
import { AI_NAMES, AI_TITLES } from '../types'

interface UserInfo {
  id: string
  displayName: string
  email: string
  dayUsage: number
  dayLimit: number
}

const AVATAR_COLORS = [
  '#E74C3C', '#E67E22', '#F39C12', '#27AE60',
  '#1ABC9C', '#2980B9', '#8E44AD', '#D35400',
  '#16A085', '#2C3E50', '#C0392B', '#7D3C98',
  '#2874A6', '#1E8449', '#B7950B', '#A93226',
]

function getAvatarColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function getInitial(name: string): string {
  const ch = name.trim()[0]
  return ch ? ch.toUpperCase() : '?'
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
            <div
              className="user-avatar-small"
              style={{ background: getAvatarColor(user.displayName) }}
            >
              {getInitial(user.displayName)}
            </div>
            {user.displayName}
          </button>
        )}
      </div>
    </div>
  )
}